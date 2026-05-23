-- Wave 9: gestao de manipuladores de alimentos (RDC 216/2004 art. 4.6).
-- - Tabela manipulators: cadastro dos funcionarios manipuladores
-- - Tabela manipulator_asos: ASOs (Atestado de Saude Ocupacional)
-- - Tabela manipulator_trainings: treinamentos com certificado
-- - Bucket privado 'employee-docs' para ASO + certificados

create table public.manipulators (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  full_name text not null,
  cpf text,
  role text,
  hired_at date,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index manipulators_company_idx on public.manipulators (company_id, active);
create unique index manipulators_company_cpf_idx
  on public.manipulators (company_id, cpf)
  where cpf is not null;

create trigger set_manipulators_updated_at
  before update on public.manipulators
  for each row execute function public.set_updated_at();

alter table public.manipulators enable row level security;

create policy "manipulators_select" on public.manipulators
  for select using (
    public.is_master() or company_id = public.current_company_id()
  );

create policy "manipulators_write" on public.manipulators
  for all using (
    public.is_master() or company_id = public.current_company_id()
  )
  with check (
    public.is_master() or company_id = public.current_company_id()
  );

-- ASOs (Atestado de Saude Ocupacional)
create table public.manipulator_asos (
  id uuid primary key default gen_random_uuid(),
  manipulator_id uuid not null references public.manipulators(id) on delete cascade,
  issued_at date not null,
  expires_at date not null,
  doctor_name text,
  doctor_crm text,
  file_path text,
  notes text,
  created_at timestamptz not null default now()
);

create index manipulator_asos_manipulator_idx
  on public.manipulator_asos (manipulator_id, expires_at desc);
create index manipulator_asos_expires_idx
  on public.manipulator_asos (expires_at);

alter table public.manipulator_asos enable row level security;

create policy "asos_select" on public.manipulator_asos
  for select using (
    exists (
      select 1 from public.manipulators m
      where m.id = manipulator_id
        and (public.is_master() or m.company_id = public.current_company_id())
    )
  );

create policy "asos_write" on public.manipulator_asos
  for all using (
    exists (
      select 1 from public.manipulators m
      where m.id = manipulator_id
        and (public.is_master() or m.company_id = public.current_company_id())
    )
  )
  with check (
    exists (
      select 1 from public.manipulators m
      where m.id = manipulator_id
        and (public.is_master() or m.company_id = public.current_company_id())
    )
  );

-- Treinamentos (boas praticas, NR 7 etc.)
create table public.manipulator_trainings (
  id uuid primary key default gen_random_uuid(),
  manipulator_id uuid not null references public.manipulators(id) on delete cascade,
  topic text not null,
  hours numeric(5,2),
  completed_at date not null,
  expires_at date,
  instructor text,
  certificate_path text,
  notes text,
  created_at timestamptz not null default now()
);

create index manipulator_trainings_manipulator_idx
  on public.manipulator_trainings (manipulator_id, completed_at desc);

alter table public.manipulator_trainings enable row level security;

create policy "trainings_select" on public.manipulator_trainings
  for select using (
    exists (
      select 1 from public.manipulators m
      where m.id = manipulator_id
        and (public.is_master() or m.company_id = public.current_company_id())
    )
  );

create policy "trainings_write" on public.manipulator_trainings
  for all using (
    exists (
      select 1 from public.manipulators m
      where m.id = manipulator_id
        and (public.is_master() or m.company_id = public.current_company_id())
    )
  )
  with check (
    exists (
      select 1 from public.manipulators m
      where m.id = manipulator_id
        and (public.is_master() or m.company_id = public.current_company_id())
    )
  );

-- Bucket privado para ASO e certificados (path = {company_id}/...)
insert into storage.buckets (id, name, public)
  values ('employee-docs', 'employee-docs', false)
  on conflict (id) do nothing;

create policy "employee_docs_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'employee-docs'
    and (
      public.is_master()
      or (storage.foldername(name))[1] = public.current_company_id()::text
    )
  );

create policy "employee_docs_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'employee-docs'
    and (
      public.is_master()
      or (storage.foldername(name))[1] = public.current_company_id()::text
    )
  );

create policy "employee_docs_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'employee-docs'
    and (
      public.is_master()
      or (storage.foldername(name))[1] = public.current_company_id()::text
    )
  );

create policy "employee_docs_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'employee-docs'
    and (
      public.is_master()
      or (storage.foldername(name))[1] = public.current_company_id()::text
    )
  );
