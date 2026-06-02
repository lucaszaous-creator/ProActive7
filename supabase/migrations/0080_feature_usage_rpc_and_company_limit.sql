-- =====================================================================
-- 0080_feature_usage_rpc_and_company_limit.sql
-- (1) Agrega feature_events no SQL (corrige a contagem que era feita no
--     cliente sem .limit — PostgREST cortava em 1000 linhas e subnotificava).
-- (2) Enforcement server-side do limite de empresas do plano: a nutri não
--     consegue ativar mais empresas que o plano permite. platform_admin
--     pode ultrapassar (suporte). Plano sem limite (null) = ilimitado.
-- =====================================================================

-- ---------- (1) Uso de features agregado no SQL ----------
create or replace function public.feature_usage_30d()
returns table (
  feature_key   text,
  uses_30d      bigint,
  unique_users  bigint,
  unique_orgs   bigint
) language sql stable security definer set search_path = public as $$
  select
    feature_key,
    count(*),
    count(distinct user_id),
    count(distinct organization_id)
  from public.feature_events
  where occurred_at >= now() - interval '30 days'
    and public.is_platform_admin()
  group by feature_key
  order by count(*) desc;
$$;

revoke all on function public.feature_usage_30d() from public, anon;
grant execute on function public.feature_usage_30d() to authenticated;

-- ---------- (2) Enforcement do limite de empresas ----------
create or replace function public.enforce_company_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  lim int;
  cnt int;
  org uuid := new.organization_id;
begin
  -- platform_admin (suporte) pode ultrapassar.
  if public.is_platform_admin() then
    return new;
  end if;

  if org is null then
    return new;
  end if;

  -- Só enforce quando a empresa entra/permanece ATIVA. Em UPDATE, só quando
  -- está ativando uma empresa que estava inativa.
  if tg_op = 'UPDATE'
     and not (new.active = true and coalesce(old.active, false) = false) then
    return new;
  end if;
  if new.active is distinct from true then
    return new;
  end if;

  select p.company_limit into lim
  from public.organizations o
  join public.plans p on p.key = o.plan_key
  where o.id = org;

  -- Sem plano com limite definido = ilimitado.
  if lim is null then
    return new;
  end if;

  select count(*) into cnt
  from public.companies
  where organization_id = org
    and active = true
    and deleted_at is null
    and id <> new.id;

  if cnt >= lim then
    raise exception
      'Limite de % empresa(s) ativas do plano atingido. Faça upgrade do plano para adicionar mais.',
      lim
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_company_limit() from public, anon, authenticated;

drop trigger if exists trg_enforce_company_limit on public.companies;
create trigger trg_enforce_company_limit
  before insert or update on public.companies
  for each row execute function public.enforce_company_limit();
