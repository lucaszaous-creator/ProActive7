-- =====================================================================
-- 0014_checklists.sql  —  Checklists operacionais.
-- ---------------------------------------------------------------------
-- Templates ficam por empresa (uma rede pode ter padroes diferentes).
-- items: jsonb com [{ "id":"...", "text":"..." }, ...].
-- frequency: 'daily' | 'weekly' | 'monthly' (validado no client).
-- =====================================================================

create table if not exists public.checklist_templates (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  name        text not null,
  items       jsonb not null default '[]'::jsonb,
  frequency   text not null default 'daily',
  active      boolean not null default true,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_checklist_templates_company
  on public.checklist_templates(company_id);

create trigger trg_checklist_templates_updated
  before update on public.checklist_templates
  for each row execute function public.set_updated_at();

create table if not exists public.checklist_runs (
  id            uuid primary key default gen_random_uuid(),
  template_id   uuid not null references public.checklist_templates(id) on delete cascade,
  ran_by        uuid references public.profiles(id) on delete set null,
  ran_at        timestamptz not null default now(),
  -- items: [{ "id":"...", "checked":true|false, "note":"..." }]
  items         jsonb not null default '[]'::jsonb,
  notes         text,
  photo_id      uuid references public.photos(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_checklist_runs_template_ran
  on public.checklist_runs(template_id, ran_at desc);

alter table public.checklist_templates enable row level security;
alter table public.checklist_runs      enable row level security;

create policy chk_tpl_select on public.checklist_templates
  for select to authenticated
  using ( public.is_master() or company_id = public.current_company_id() );

create policy chk_tpl_insert on public.checklist_templates
  for insert to authenticated
  with check ( public.is_master() or company_id = public.current_company_id() );

create policy chk_tpl_update on public.checklist_templates
  for update to authenticated
  using ( public.is_master() or company_id = public.current_company_id() )
  with check ( public.is_master() or company_id = public.current_company_id() );

create policy chk_tpl_delete on public.checklist_templates
  for delete to authenticated
  using ( public.is_master() or company_id = public.current_company_id() );

create policy chk_run_select on public.checklist_runs
  for select to authenticated
  using (
    public.is_master()
    or template_id in (
      select id from public.checklist_templates
      where company_id = public.current_company_id()
    )
  );

create policy chk_run_insert on public.checklist_runs
  for insert to authenticated
  with check (
    public.is_master()
    or template_id in (
      select id from public.checklist_templates
      where company_id = public.current_company_id()
    )
  );

create policy chk_run_delete on public.checklist_runs
  for delete to authenticated
  using (
    public.is_master()
    or template_id in (
      select id from public.checklist_templates
      where company_id = public.current_company_id()
    )
  );
