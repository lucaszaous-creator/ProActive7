-- =====================================================================
-- 0054_receivings.sql — Recebimento de mercadoria
-- Cabeçalho (`receivings`) + itens (`receiving_items`). Multi-tenant
-- por company_id. Itens herdam scope via parent.
-- =====================================================================

create table if not exists public.receivings (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  supplier_id   uuid references public.suppliers(id) on delete restrict,
  invoice_nf    text,
  received_at   timestamptz not null default now(),
  received_by   uuid references public.profiles(id) on delete set null,
  notes         text,
  photo_id      uuid references public.photos(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists receivings_company_received_idx
  on public.receivings (company_id, received_at desc);

create trigger set_receivings_updated_at
  before update on public.receivings
  for each row execute function public.set_updated_at();

create table if not exists public.receiving_items (
  id                  uuid primary key default gen_random_uuid(),
  receiving_id        uuid not null references public.receivings(id) on delete cascade,
  product_id          uuid not null references public.products(id) on delete restrict,
  batch               text not null,
  quantity            numeric(12,3) not null check (quantity > 0),
  unit                text not null check (unit in ('kg','g','un','L','mL','cx')),
  temp_at_arrival     numeric(5,2),
  manufacturing_date  date,
  expiry_date         date,
  storage_condition   text check (storage_condition in ('ambiente','refrigerado','congelado')),
  rejected            boolean not null default false,
  rejection_reason    text,
  created_at          timestamptz not null default now()
);

create index if not exists receiving_items_receiving_idx on public.receiving_items (receiving_id);
create index if not exists receiving_items_product_batch_idx on public.receiving_items (product_id, batch);

-- RLS receivings
alter table public.receivings enable row level security;

create policy receivings_select on public.receivings for select to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );

create policy receivings_insert on public.receivings for insert to authenticated
  with check (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );

-- Property pode editar só nas primeiras 24h; nutri/admin sem restrição.
create policy receivings_update on public.receivings for update to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR (company_id = current_company_id() AND received_at > now() - interval '24 hours')
  )
  with check (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR (company_id = current_company_id() AND received_at > now() - interval '24 hours')
  );

create policy receivings_delete on public.receivings for delete to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
  );

-- RLS receiving_items piggyback no parent
alter table public.receiving_items enable row level security;

create policy receiving_items_select on public.receiving_items for select to authenticated
  using (
    receiving_id IN (
      SELECT id FROM public.receivings WHERE
        is_platform_admin()
        OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
        OR company_id = current_company_id()
    )
  );

create policy receiving_items_insert on public.receiving_items for insert to authenticated
  with check (
    receiving_id IN (
      SELECT id FROM public.receivings WHERE
        is_platform_admin()
        OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
        OR company_id = current_company_id()
    )
  );

create policy receiving_items_update on public.receiving_items for update to authenticated
  using (
    receiving_id IN (
      SELECT id FROM public.receivings WHERE
        is_platform_admin()
        OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
        OR (company_id = current_company_id() AND received_at > now() - interval '24 hours')
    )
  )
  with check (
    receiving_id IN (
      SELECT id FROM public.receivings WHERE
        is_platform_admin()
        OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
        OR (company_id = current_company_id() AND received_at > now() - interval '24 hours')
    )
  );

create policy receiving_items_delete on public.receiving_items for delete to authenticated
  using (
    receiving_id IN (
      SELECT id FROM public.receivings WHERE
        is_platform_admin()
        OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    )
  );
