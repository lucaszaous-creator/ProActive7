-- Wave 7: nao-conformidades + plano de acao 5W2H.
create type public.nc_severity as enum ('low', 'medium', 'high', 'critical');
create type public.nc_status as enum (
  'open',
  'in_progress',
  'closed',
  'cancelled'
);

create table public.non_conformities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  audit_id uuid references public.audits(id) on delete set null,
  checklist_run_id uuid references public.checklist_runs(id) on delete set null,
  source text not null default 'manual',
  category text,
  description text not null,
  severity public.nc_severity not null default 'medium',
  status public.nc_status not null default 'open',
  -- 5W2H
  what text,
  why text,
  where_loc text,
  when_due date,
  who_uuid uuid references public.profiles(id) on delete set null,
  how text,
  how_much numeric(12,2),
  -- evidencias
  evidence_photo_id uuid references public.photos(id) on delete set null,
  closing_photo_id uuid references public.photos(id) on delete set null,
  closing_note text,
  -- auditoria
  opened_by uuid references public.profiles(id) on delete set null,
  opened_at timestamptz not null default now(),
  closed_by uuid references public.profiles(id) on delete set null,
  closed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index nc_company_status_idx
  on public.non_conformities (company_id, status);
create index nc_when_due_idx
  on public.non_conformities (when_due)
  where status in ('open', 'in_progress');

create trigger set_nc_updated_at
  before update on public.non_conformities
  for each row execute function public.set_updated_at();

alter table public.non_conformities enable row level security;

create policy "nc_select" on public.non_conformities
  for select using (
    public.is_master() or company_id = public.current_company_id()
  );

create policy "nc_insert" on public.non_conformities
  for insert with check (
    public.is_master() or company_id = public.current_company_id()
  );

create policy "nc_update" on public.non_conformities
  for update using (
    public.is_master() or company_id = public.current_company_id()
  );

create policy "nc_delete" on public.non_conformities
  for delete using (public.is_master());
