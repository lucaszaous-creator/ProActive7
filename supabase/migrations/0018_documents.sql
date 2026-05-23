-- Wave 5: POPs + Manual de Boas Praticas (RDC 275/2002 + RDC 216/2004)
-- Documentos obrigatorios da nutricionista RT, aprovados por master.

create type public.document_type as enum (
  'mbp',
  'pop_higienizacao',
  'pop_agua',
  'pop_manipuladores',
  'pop_residuos',
  'pop_manutencao'
);

create type public.document_status as enum (
  'draft',
  'published',
  'archived'
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  type public.document_type not null,
  title text not null,
  content_md text not null default '',
  version integer not null default 1,
  status public.document_status not null default 'draft',
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index documents_company_type_version_idx
  on public.documents (company_id, type, version);

create index documents_company_status_idx
  on public.documents (company_id, status);

create trigger set_documents_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

alter table public.documents enable row level security;

create policy "documents_select" on public.documents
  for select using (
    public.is_master() or company_id = public.current_company_id()
  );

create policy "documents_insert" on public.documents
  for insert with check (
    public.is_master() or company_id = public.current_company_id()
  );

create policy "documents_update" on public.documents
  for update using (
    public.is_master() or company_id = public.current_company_id()
  ) with check (
    -- Apenas master pode publicar (aprovar como RT)
    public.is_master() or status <> 'published'
  );

create policy "documents_delete" on public.documents
  for delete using (
    public.is_master() or company_id = public.current_company_id()
  );

-- Historico de versoes (snapshot a cada save substancial)
create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  version integer not null,
  content_md text not null,
  saved_by uuid references public.profiles(id) on delete set null,
  saved_at timestamptz not null default now()
);

create index document_versions_document_idx
  on public.document_versions (document_id, version desc);

alter table public.document_versions enable row level security;

create policy "document_versions_select" on public.document_versions
  for select using (
    exists (
      select 1 from public.documents d
      where d.id = document_id
        and (public.is_master() or d.company_id = public.current_company_id())
    )
  );

create policy "document_versions_insert" on public.document_versions
  for insert with check (
    exists (
      select 1 from public.documents d
      where d.id = document_id
        and (public.is_master() or d.company_id = public.current_company_id())
    )
  );
