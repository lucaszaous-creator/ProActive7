-- =====================================================================
-- 0053_suppliers.sql — Master de fornecedores (escopo: organização)
-- Usada pelo módulo de Recebimento. Uma nutri compartilha fornecedores
-- entre as várias empresas (cozinhas) que ela atende.
-- =====================================================================

create table if not exists public.suppliers (
  id           uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name         text not null,
  cnpj         text,
  email        text,
  phone        text,
  notes        text,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists suppliers_org_active_idx
  on public.suppliers (organization_id, active);

create unique index if not exists suppliers_org_cnpj_uq
  on public.suppliers (organization_id, cnpj)
  where cnpj is not null;

create trigger set_suppliers_updated_at
  before update on public.suppliers
  for each row execute function public.set_updated_at();

-- RLS
alter table public.suppliers enable row level security;

create policy suppliers_select on public.suppliers for select to authenticated
  using (
    is_platform_admin()
    OR organization_id = current_organization_id()
  );

create policy suppliers_insert on public.suppliers for insert to authenticated
  with check (
    is_platform_admin()
    OR (is_nutritionist() AND organization_id = current_organization_id())
  );

create policy suppliers_update on public.suppliers for update to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND organization_id = current_organization_id())
  )
  with check (
    is_platform_admin()
    OR (is_nutritionist() AND organization_id = current_organization_id())
  );

create policy suppliers_delete on public.suppliers for delete to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND organization_id = current_organization_id())
  );
