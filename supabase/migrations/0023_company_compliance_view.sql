-- Wave 8: view consolidada para o dashboard master.
-- Agrega por empresa: NCs, checklists, visitas, temperaturas, documentos.
-- Performance: cada subquery e independente; rodam em paralelo via planner.

create or replace view public.company_compliance_v
with (security_invoker = true)
as
select
  c.id as company_id,
  c.name as company_name,
  c.logo_path as company_logo_path,
  c.active,

  -- NCs ultimos 30 dias
  coalesce(nc.total_30d, 0)::int as nc_total_30d,
  coalesce(nc.overdue_30d, 0)::int as nc_overdue_30d,
  coalesce(nc.open_now, 0)::int as nc_open_now,

  -- Checklists ultimos 30 dias
  coalesce(cl.runs_30d, 0)::int as checklists_ran_30d,
  coalesce(cl.planned_30d, 0)::int as checklists_planned_30d,

  -- Visitas
  au.last_completed_at as last_audit_at,
  au.next_scheduled_at as next_audit_at,
  case when au.last_completed_at >= now() - interval '90 days'
       then true else false end as has_audit_last_90d,

  -- Temperaturas ultimos 7 dias
  coalesce(tp.readings_7d, 0)::int as temp_readings_7d,
  coalesce(tp.out_of_range_7d, 0)::int as temp_out_of_range_7d,

  -- Documentos publicados (MBP + 5 POPs)
  coalesce(d.published_count, 0)::int as docs_published,
  coalesce(d.draft_count, 0)::int as docs_pending

from public.companies c

-- Non-conformities
left join lateral (
  select
    count(*) filter (where opened_at >= now() - interval '30 days') as total_30d,
    count(*) filter (
      where opened_at >= now() - interval '30 days'
        and when_due < current_date
        and status in ('open','in_progress')
    ) as overdue_30d,
    count(*) filter (where status in ('open','in_progress')) as open_now
  from public.non_conformities n
  where n.company_id = c.id
) nc on true

-- Checklists
left join lateral (
  select
    count(*) as runs_30d,
    -- planejado = numero de templates ativos * dias do periodo (aproximacao
    -- conservadora: 1 execucao por template no periodo)
    (
      select count(*) from public.checklist_templates t
      where t.company_id = c.id and t.active = true
    ) as planned_30d
  from public.checklist_runs r
  join public.checklist_templates t on t.id = r.template_id
  where t.company_id = c.id
    and r.ran_at >= now() - interval '30 days'
) cl on true

-- Audits
left join lateral (
  select
    max(case when status='completed' then completed_at end) as last_completed_at,
    min(case when status='scheduled' and scheduled_at >= now()
             then scheduled_at end) as next_scheduled_at
  from public.audits a
  where a.company_id = c.id
) au on true

-- Temperaturas
left join lateral (
  select
    count(*) as readings_7d,
    count(*) filter (
      where tl.temperature < e.temp_min or tl.temperature > e.temp_max
    ) as out_of_range_7d
  from public.temperature_logs tl
  join public.equipment e on e.id = tl.equipment_id
  where e.company_id = c.id
    and tl.recorded_at >= now() - interval '7 days'
) tp on true

-- Documentos
left join lateral (
  select
    count(*) filter (where status='published') as published_count,
    count(*) filter (where status='draft') as draft_count
  from public.documents doc
  where doc.company_id = c.id
) d on true;

-- Permite leitura conforme RLS de `companies` (security_invoker).
grant select on public.company_compliance_v to authenticated, anon;
