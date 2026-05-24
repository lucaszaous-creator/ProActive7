-- Wave 11: Controle Integrado de Pragas (RDC 216/2004 art. 4.4)
-- - pest_control_providers: empresas dedetizadoras
-- - pest_control_services: aplicacoes feitas (com cronograma da proxima)
-- - bucket pest-docs (privado) para certificados/laudos

create table public.pest_control_providers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  cnpj text,
  license_number text,
  phone text,
  email text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pest_providers_company_idx
  on public.pest_control_providers (company_id, active);

create trigger set_pest_providers_updated_at
  before update on public.pest_control_providers
  for each row execute function public.set_updated_at();

alter table public.pest_control_providers enable row level security;

create policy "pest_providers_select" on public.pest_control_providers
  for select using (
    public.is_master() or company_id = public.current_company_id()
  );

create policy "pest_providers_write" on public.pest_control_providers
  for all using (
    public.is_master() or company_id = public.current_company_id()
  ) with check (
    public.is_master() or company_id = public.current_company_id()
  );

-- Aplicacoes / servicos prestados
create type public.pest_service_type as enum (
  'desinsetizacao',
  'desratizacao',
  'descupinizacao',
  'sanitizacao',
  'outro'
);

create table public.pest_control_services (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  provider_id uuid references public.pest_control_providers(id) on delete set null,
  service_type public.pest_service_type not null default 'desinsetizacao',
  performed_at date not null,
  next_due_at date,
  products_used text,
  responsible_technician text,
  certificate_path text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pest_services_company_idx
  on public.pest_control_services (company_id, performed_at desc);
create index pest_services_due_idx
  on public.pest_control_services (next_due_at)
  where next_due_at is not null;

create trigger set_pest_services_updated_at
  before update on public.pest_control_services
  for each row execute function public.set_updated_at();

alter table public.pest_control_services enable row level security;

create policy "pest_services_select" on public.pest_control_services
  for select using (
    public.is_master() or company_id = public.current_company_id()
  );

create policy "pest_services_write" on public.pest_control_services
  for all using (
    public.is_master() or company_id = public.current_company_id()
  ) with check (
    public.is_master() or company_id = public.current_company_id()
  );

-- Bucket privado para certificados (path = {company_id}/...)
insert into storage.buckets (id, name, public)
  values ('pest-docs', 'pest-docs', false)
  on conflict (id) do nothing;

create policy "pest_docs_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'pest-docs'
    and (
      public.is_master()
      or (storage.foldername(name))[1] = public.current_company_id()::text
    )
  );

create policy "pest_docs_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'pest-docs'
    and (
      public.is_master()
      or (storage.foldername(name))[1] = public.current_company_id()::text
    )
  );

create policy "pest_docs_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'pest-docs'
    and (
      public.is_master()
      or (storage.foldername(name))[1] = public.current_company_id()::text
    )
  );

create policy "pest_docs_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'pest-docs'
    and (
      public.is_master()
      or (storage.foldername(name))[1] = public.current_company_id()::text
    )
  );
