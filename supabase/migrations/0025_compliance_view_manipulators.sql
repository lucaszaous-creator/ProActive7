-- Wave 9: estende company_compliance_v com indicadores de manipuladores.
create or replace view public.company_compliance_v
with (security_invoker = true)
as
with manip as (
  select
    m.company_id,
    count(*) filter (where m.active) as manipulators_active,
    count(*) filter (
      where m.active
        and exists (
          select 1 from public.manipulator_asos a
          where a.manipulator_id = m.id
            and a.expires_at >= current_date
        )
    ) as manipulators_aso_ok,
    count(*) filter (
      where m.active
        and exists (
          select 1 from public.manipulator_asos a
          where a.manipulator_id = m.id
            and a.expires_at < current_date
        )
        and not exists (
          select 1 from public.manipulator_asos a2
          where a2.manipulator_id = m.id
            and a2.expires_at >= current_date
        )
    ) as manipulators_aso_expired,
    count(*) filter (
      where m.active
        and not exists (
          select 1 from public.manipulator_asos a
          where a.manipulator_id = m.id
        )
    ) as manipulators_aso_missing
  from public.manipulators m
  group by m.company_id
)
select
  c.id as company_id,
  c.name as company_name,
  c.logo_path as company_logo_path,
  c.active,
  coalesce(nc.total_30d, 0)::int as nc_total_30d,
  coalesce(nc.overdue_30d, 0)::int as nc_overdue_30d,
  coalesce(nc.open_now, 0)::int as nc_open_now,
  coalesce(cl.runs_30d, 0)::int as checklists_ran_30d,
  coalesce(cl.planned_30d, 0)::int as checklists_planned_30d,
  au.last_completed_at as last_audit_at,
  au.next_scheduled_at as next_audit_at,
  case when au.last_completed_at >= now() - interval '90 days'
       then true else false end as has_audit_last_90d,
  coalesce(tp.readings_7d, 0)::int as temp_readings_7d,
  coalesce(tp.out_of_range_7d, 0)::int as temp_out_of_range_7d,
  coalesce(d.published_count, 0)::int as docs_published,
  coalesce(d.draft_count, 0)::int as docs_pending,
  coalesce(manip.manipulators_active, 0)::int as manipulators_active,
  coalesce(manip.manipulators_aso_ok, 0)::int as manipulators_aso_ok,
  coalesce(manip.manipulators_aso_expired, 0)::int as manipulators_aso_expired,
  coalesce(manip.manipulators_aso_missing, 0)::int as manipulators_aso_missing
from public.companies c
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
left join lateral (
  select
    count(*) as runs_30d,
    (
      select count(*) from public.checklist_templates t
      where t.company_id = c.id and t.active = true
    ) as planned_30d
  from public.checklist_runs r
  join public.checklist_templates t on t.id = r.template_id
  where t.company_id = c.id
    and r.ran_at >= now() - interval '30 days'
) cl on true
left join lateral (
  select
    max(case when status='completed' then completed_at end) as last_completed_at,
    min(case when status='scheduled' and scheduled_at >= now()
             then scheduled_at end) as next_scheduled_at
  from public.audits a
  where a.company_id = c.id
) au on true
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
left join lateral (
  select
    count(*) filter (where status='published') as published_count,
    count(*) filter (where status='draft') as draft_count
  from public.documents doc
  where doc.company_id = c.id
) d on true
left join manip on manip.company_id = c.id;

grant select on public.company_compliance_v to authenticated, anon;
