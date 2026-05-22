-- =====================================================================
-- 0013_temperature.sql  —  PMOC light: equipamentos e registros de
-- temperatura.
-- =====================================================================

do $$ begin
  create type public.equipment_type as enum ('freezer', 'geladeira', 'estufa');
exception when duplicate_object then null; end $$;

create table if not exists public.equipment (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  name        text not null,
  type        public.equipment_type not null,
  temp_min    numeric(5,2) not null,
  temp_max    numeric(5,2) not null check (temp_max >= temp_min),
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_equipment_company on public.equipment(company_id);

create trigger trg_equipment_updated
  before update on public.equipment
  for each row execute function public.set_updated_at();

create table if not exists public.temperature_logs (
  id            uuid primary key default gen_random_uuid(),
  equipment_id  uuid not null references public.equipment(id) on delete cascade,
  recorded_at   timestamptz not null default now(),
  temperature   numeric(5,2) not null,
  notes         text,
  recorded_by   uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_temp_logs_equipment_recorded
  on public.temperature_logs(equipment_id, recorded_at desc);

-- RLS — escopo por empresa via equipment.company_id
alter table public.equipment        enable row level security;
alter table public.temperature_logs enable row level security;

create policy equipment_select on public.equipment
  for select to authenticated
  using ( public.is_master() or company_id = public.current_company_id() );

create policy equipment_insert on public.equipment
  for insert to authenticated
  with check ( public.is_master() or company_id = public.current_company_id() );

create policy equipment_update on public.equipment
  for update to authenticated
  using ( public.is_master() or company_id = public.current_company_id() )
  with check ( public.is_master() or company_id = public.current_company_id() );

create policy equipment_delete on public.equipment
  for delete to authenticated
  using ( public.is_master() or company_id = public.current_company_id() );

create policy temp_select on public.temperature_logs
  for select to authenticated
  using (
    public.is_master()
    or equipment_id in (
      select id from public.equipment
      where company_id = public.current_company_id()
    )
  );

create policy temp_insert on public.temperature_logs
  for insert to authenticated
  with check (
    public.is_master()
    or equipment_id in (
      select id from public.equipment
      where company_id = public.current_company_id()
    )
  );

create policy temp_delete on public.temperature_logs
  for delete to authenticated
  using (
    public.is_master()
    or equipment_id in (
      select id from public.equipment
      where company_id = public.current_company_id()
    )
  );
