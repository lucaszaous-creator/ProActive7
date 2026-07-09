-- =====================================================================
-- 0094_public_rpc_rate_limit.sql
--
-- Rate limit para as RPCs anonimas (get_public_label, get_company_seal).
-- Ambas sao callable por `anon` sem custo e sem trava — risco de
-- enumeracao/DoS de leitura. Este arquivo:
--   1) cria a tabela contadora `rpc_rate_limit` (por IP + janela de 1 min);
--   2) cria o helper `enforce_rate_limit(bucket, max_por_min)`;
--   3) reescreve as duas funcoes para chamar o helper antes de responder
--      (viram plpgsql VOLATILE — o supabase-js ja as chama via POST, entao
--      nao muda nada no frontend).
--
-- O IP vem do header `x-forwarded-for` que o gateway (Kong/PostgREST)
-- injeta em `request.headers`. Sem IP identificavel, cai no balde
-- 'unknown' (compartilhado) — pior caso: um limite comum, nunca um bypass.
-- =====================================================================

-- ---------- 1. Tabela contadora ----------
create table if not exists public.rpc_rate_limit (
  bucket       text        not null,
  identifier   text        not null,
  window_start timestamptz not null,
  hits         integer     not null default 0,
  primary key (bucket, identifier, window_start)
);

alter table public.rpc_rate_limit enable row level security;
-- Sem policies: ninguem (anon/authenticated) le/escreve direto. Só o
-- helper SECURITY DEFINER manipula a tabela.
revoke all on public.rpc_rate_limit from anon, authenticated;

-- ---------- 2. Helper ----------
create or replace function public.enforce_rate_limit(
  p_bucket text,
  p_max_per_min int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_headers json;
  v_ip text;
  v_window timestamptz := date_trunc('minute', now());
  v_hits int;
begin
  v_headers := nullif(current_setting('request.headers', true), '')::json;
  v_ip := coalesce(
    nullif(split_part(coalesce(v_headers ->> 'x-forwarded-for', ''), ',', 1), ''),
    v_headers ->> 'cf-connecting-ip',
    'unknown'
  );

  insert into public.rpc_rate_limit (bucket, identifier, window_start, hits)
    values (p_bucket, v_ip, v_window, 1)
  on conflict (bucket, identifier, window_start)
    do update set hits = public.rpc_rate_limit.hits + 1
  returning hits into v_hits;

  -- Limpeza oportunista (probabilistica) de janelas antigas — evita
  -- crescimento ilimitado sem precisar de cron dedicado.
  if random() < 0.01 then
    delete from public.rpc_rate_limit
      where window_start < now() - interval '1 hour';
  end if;

  if v_hits > p_max_per_min then
    raise exception 'Muitas requisicoes. Tente novamente em instantes.'
      using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public.enforce_rate_limit(text, int) from public, anon, authenticated;
-- So chamado internamente pelas funcoes SECURITY DEFINER abaixo.

-- ---------- 3. get_public_label com rate limit ----------
drop function if exists public.get_public_label(uuid);

create function public.get_public_label(p_id uuid)
returns table (
  product_name       text,
  storage_condition  storage_condition,
  manipulation_at    timestamptz,
  expiry_at          timestamptz,
  batch              text,
  supplier           text,
  fabricated_at      timestamptz,
  original_expiry_at timestamptz,
  display_quantity   text,
  allergens          text[],
  company_name       text,
  company_logo_path  text
)
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
begin
  perform public.enforce_rate_limit('public_label', 120);
  return query
    select
      lp.product_name_snapshot as product_name,
      lp.storage_condition,
      lp.manipulation_at,
      lp.expiry_at,
      lp.batch,
      lp.supplier,
      lp.fabricated_at,
      lp.original_expiry_at,
      lp.display_quantity,
      lp.allergens,
      c.name      as company_name,
      c.logo_path as company_logo_path
    from public.label_prints lp
    join public.companies c on c.id = lp.company_id
    where lp.id = p_id;
end;
$$;

revoke all on function public.get_public_label(uuid) from public;
grant execute on function public.get_public_label(uuid) to anon, authenticated;

-- ---------- 4. get_company_seal com rate limit ----------
drop function if exists public.get_company_seal(uuid);

create function public.get_company_seal(p_company_id uuid)
returns table (
  company_name      text,
  compliance_score  integer,
  last_audit_at     timestamptz,
  audits_12m        bigint,
  asos_valid_pct    integer,
  generated_at      timestamptz
)
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  perform public.enforce_rate_limit('company_seal', 60);
  return query
  with c as (
    select id, name from public.companies
    where id = p_company_id and active = true and deleted_at is null
  ),
  v as (
    select
      nc_total_30d, nc_overdue_30d,
      checklists_ran_30d, checklists_planned_30d,
      has_audit_last_90d,
      temp_readings_7d, temp_out_of_range_7d,
      docs_published,
      manipulators_active, manipulators_aso_ok,
      has_pest_service_active, has_pest_service_registered,
      last_audit_at
    from public.company_compliance_v where company_id = p_company_id
  ),
  score as (
    select
      v.last_audit_at,
      round((
        25 * (1 - case when v.nc_total_30d > 0
                       then v.nc_overdue_30d::numeric / v.nc_total_30d
                       else 0 end)
        + 20 * least(1, case when v.checklists_planned_30d > 0
                             then v.checklists_ran_30d::numeric / v.checklists_planned_30d
                             else 1 end)
        + case when v.has_audit_last_90d then 20 else 0 end
        + 10 * (1 - case when v.temp_readings_7d > 0
                         then v.temp_out_of_range_7d::numeric / v.temp_readings_7d
                         else 0 end)
        + case when v.docs_published >= 6 then 10 else 0 end
        + 10 * least(1, case when v.manipulators_active > 0
                             then v.manipulators_aso_ok::numeric / v.manipulators_active
                             else 1 end)
        + case
            when v.has_pest_service_active then 5
            when v.has_pest_service_registered then 0
            else 5
          end
      )::integer) as score
    from v
  ),
  audits_year as (
    select count(*) as n
    from public.audits
    where company_id = p_company_id
      and status = 'completed'
      and completed_at >= now() - interval '12 months'
      and deleted_at is null
  ),
  asos as (
    select
      count(*) filter (where aso.expires_at > now()) as valid_count,
      count(*) as total
    from public.manipulator_asos aso
    join public.manipulators m on m.id = aso.manipulator_id
    where m.company_id = p_company_id and m.active = true
  )
  select
    c.name,
    coalesce(score.score, 0),
    score.last_audit_at,
    audits_year.n,
    case when asos.total > 0
      then ((asos.valid_count * 100) / asos.total)::integer
      else null end,
    now()
  from c
  left join score on true
  left join audits_year on true
  left join asos on true;
end;
$$;

revoke all on function public.get_company_seal(uuid) from public;
grant execute on function public.get_company_seal(uuid) to anon, authenticated;
