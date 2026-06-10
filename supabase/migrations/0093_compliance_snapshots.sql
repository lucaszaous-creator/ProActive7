-- =====================================================================
-- 0093_compliance_snapshots.sql — série temporal do compliance score
-- Um snapshot por empresa por dia, gravado pelo frontend quando o
-- painel da nutri/admin carrega (upsert idempotente — sem cron pago).
-- Alimenta a curva "Evolução do compliance" no dashboard e no PDF da RT.
-- =====================================================================

create table if not exists public.compliance_snapshots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  snapshot_date date not null default current_date,
  score numeric(5, 2) not null,
  tier text not null check (tier in ('green', 'amber', 'red')),
  created_at timestamptz not null default now(),
  unique (company_id, snapshot_date)
);

create index if not exists compliance_snapshots_company_date_idx
  on public.compliance_snapshots (company_id, snapshot_date desc);

alter table public.compliance_snapshots enable row level security;

-- Leitura: admin global ou qualquer membro da org dona da empresa.
create policy compliance_snapshots_select
  on public.compliance_snapshots for select to authenticated
  using (
    is_platform_admin()
    or exists (
      select 1 from public.companies c
      where c.id = company_id
        and c.organization_id = current_organization_id()
    )
  );

-- Escrita: só a RT (nutricionista da org) ou o admin — o snapshot nasce
-- do painel deles. Property não grava.
create policy compliance_snapshots_insert
  on public.compliance_snapshots for insert to authenticated
  with check (
    is_platform_admin()
    or (
      is_nutritionist()
      and exists (
        select 1 from public.companies c
        where c.id = company_id
          and c.organization_id = current_organization_id()
      )
    )
  );

create policy compliance_snapshots_update
  on public.compliance_snapshots for update to authenticated
  using (
    is_platform_admin()
    or (
      is_nutritionist()
      and exists (
        select 1 from public.companies c
        where c.id = company_id
          and c.organization_id = current_organization_id()
      )
    )
  )
  with check (
    is_platform_admin()
    or (
      is_nutritionist()
      and exists (
        select 1 from public.companies c
        where c.id = company_id
          and c.organization_id = current_organization_id()
      )
    )
  );

-- Sem delete: histórico é imutável (auditoria da curva).
