-- Wave 6: Visitas tecnicas da RT (auditorias com checklist RDC 216).
create type public.audit_status as enum (
  'scheduled',
  'in_progress',
  'completed',
  'cancelled'
);

create table public.audit_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  name text not null,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_audit_templates_updated_at
  before update on public.audit_templates
  for each row execute function public.set_updated_at();

alter table public.audit_templates enable row level security;

-- Templates globais (company_id null) sao legiveis por todos os
-- usuarios autenticados; templates de empresa seguem RLS padrao.
create policy "audit_templates_select" on public.audit_templates
  for select using (
    company_id is null
    or public.is_master()
    or company_id = public.current_company_id()
  );

create policy "audit_templates_master_write" on public.audit_templates
  for all using (public.is_master())
  with check (public.is_master());

create table public.audits (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  template_id uuid references public.audit_templates(id) on delete set null,
  scheduled_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  auditor_id uuid references public.profiles(id) on delete set null,
  status public.audit_status not null default 'scheduled',
  score numeric(5,2),
  responses jsonb not null default '[]'::jsonb,
  notes text,
  signature_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index audits_company_status_idx on public.audits (company_id, status);
create index audits_company_completed_idx
  on public.audits (company_id, completed_at desc);

create trigger set_audits_updated_at
  before update on public.audits
  for each row execute function public.set_updated_at();

alter table public.audits enable row level security;

create policy "audits_select" on public.audits
  for select using (
    public.is_master() or company_id = public.current_company_id()
  );

-- Apenas master agenda/edita visitas (e a RT que executa).
create policy "audits_master_write" on public.audits
  for all using (public.is_master())
  with check (public.is_master());

-- Bucket para assinaturas (privado).
insert into storage.buckets (id, name, public)
  values ('signatures', 'signatures', false)
  on conflict (id) do nothing;

create policy "signatures_select_company"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'signatures'
    and (
      public.is_master()
      or (storage.foldername(name))[1] = public.current_company_id()::text
    )
  );

create policy "signatures_master_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'signatures' and public.is_master());

create policy "signatures_master_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'signatures' and public.is_master());

create policy "signatures_master_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'signatures' and public.is_master());
