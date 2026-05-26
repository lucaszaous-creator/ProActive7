-- =====================================================================
-- 0058_product_groups_and_flags.sql
-- Grupos de produtos (escopo organização) + flag is_controlled em products.
-- Espelha o cadastro "Grupos" da concorrente Suflex; permite filtrar
-- etiquetas/relatórios por categoria curada pela nutri.
-- =====================================================================

create table if not exists public.product_groups (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  color           text,
  sort_order      int not null default 0,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists product_groups_org_name_uq
  on public.product_groups (organization_id, lower(name));

create index if not exists product_groups_org_active_idx
  on public.product_groups (organization_id, active);

create trigger set_product_groups_updated_at
  before update on public.product_groups
  for each row execute function public.set_updated_at();

alter table public.product_groups enable row level security;

create policy product_groups_select on public.product_groups for select to authenticated
  using (
    is_platform_admin()
    OR organization_id = current_organization_id()
  );

create policy product_groups_insert on public.product_groups for insert to authenticated
  with check (
    is_platform_admin()
    OR (is_nutritionist() AND organization_id = current_organization_id())
  );

create policy product_groups_update on public.product_groups for update to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND organization_id = current_organization_id())
  )
  with check (
    is_platform_admin()
    OR (is_nutritionist() AND organization_id = current_organization_id())
  );

create policy product_groups_delete on public.product_groups for delete to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND organization_id = current_organization_id())
  );

-- Liga produto a grupo + marca produto controlado (saneante / químico)
alter table public.products
  add column if not exists group_id uuid references public.product_groups(id) on delete set null;

alter table public.products
  add column if not exists is_controlled boolean not null default false;

create index if not exists products_group_idx on public.products (group_id);
create index if not exists products_controlled_idx on public.products (company_id) where is_controlled;
