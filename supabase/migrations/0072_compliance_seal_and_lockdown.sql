-- 0072_compliance_seal_and_lockdown.sql
--
-- 1) Tranca acesso anon a company_compliance_v (vazamento SaaS-wide):
--    granted SELECT a anon expunha metricas de TODAS as empresas. O
--    `authenticated` mantem porque o app usa em portfolio/dashboard com
--    RLS nas tabelas-base.
-- 2) Expoe um SELO PUBLICO de conformidade por empresa via RPC. Um
--    consumidor escaneia o QR na porta do estabelecimento e ve o score
--    de seguranca alimentar + a data da ultima auditoria. So dados que
--    sao publicos por natureza (nome legal, score), sem PII.

-- ---- 1. Tranca a view ----
revoke all on public.company_compliance_v from anon;

-- ---- 2. RPC publica do selo ----
create or replace function public.get_company_seal(p_company_id uuid)
returns table (
  company_name      text,
  compliance_score  integer,
  last_audit_at     timestamptz,
  audits_12m        bigint,
  asos_valid_pct    integer,
  generated_at      timestamptz
)
language sql
security definer
set search_path = public
as $$
  with c as (
    select id, name from public.companies
    where id = p_company_id and active = true and deleted_at is null
  ),
  v as (
    -- Replica complianceScore.ts em SQL (mantida em sync com a versao TS).
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
$$;

revoke all on function public.get_company_seal(uuid) from public;
grant execute on function public.get_company_seal(uuid) to anon, authenticated;
