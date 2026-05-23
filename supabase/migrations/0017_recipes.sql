-- =====================================================================
-- 0017_recipes.sql  —  Fichas tecnicas de pratos.
-- recipe_items referencia products por id; quantidade e unidade ficam
-- livres (a unidade do produto nao esta no schema atual).
-- =====================================================================

create table if not exists public.recipes (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references public.companies(id) on delete cascade,
  name                text not null,
  yield_amount        text,
  prep_time_minutes   integer,
  instructions        text,
  active              boolean not null default true,
  created_by          uuid references public.profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_recipes_company on public.recipes(company_id);

create trigger trg_recipes_updated
  before update on public.recipes
  for each row execute function public.set_updated_at();

create table if not exists public.recipe_items (
  id          uuid primary key default gen_random_uuid(),
  recipe_id   uuid not null references public.recipes(id) on delete cascade,
  product_id  uuid not null references public.products(id) on delete restrict,
  quantity    numeric(10,3) not null check (quantity > 0),
  unit        text not null default 'g',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists idx_recipe_items_recipe
  on public.recipe_items(recipe_id, sort_order);

alter table public.recipes      enable row level security;
alter table public.recipe_items enable row level security;

create policy recipes_select on public.recipes
  for select to authenticated
  using ( public.is_master() or company_id = public.current_company_id() );

create policy recipes_insert on public.recipes
  for insert to authenticated
  with check ( public.is_master() or company_id = public.current_company_id() );

create policy recipes_update on public.recipes
  for update to authenticated
  using ( public.is_master() or company_id = public.current_company_id() )
  with check ( public.is_master() or company_id = public.current_company_id() );

create policy recipes_delete on public.recipes
  for delete to authenticated
  using ( public.is_master() or company_id = public.current_company_id() );

create policy recipe_items_select on public.recipe_items
  for select to authenticated
  using (
    public.is_master()
    or recipe_id in (
      select id from public.recipes
      where company_id = public.current_company_id()
    )
  );

create policy recipe_items_insert on public.recipe_items
  for insert to authenticated
  with check (
    public.is_master()
    or recipe_id in (
      select id from public.recipes
      where company_id = public.current_company_id()
    )
  );

create policy recipe_items_update on public.recipe_items
  for update to authenticated
  using (
    public.is_master()
    or recipe_id in (
      select id from public.recipes
      where company_id = public.current_company_id()
    )
  )
  with check (
    public.is_master()
    or recipe_id in (
      select id from public.recipes
      where company_id = public.current_company_id()
    )
  );

create policy recipe_items_delete on public.recipe_items
  for delete to authenticated
  using (
    public.is_master()
    or recipe_id in (
      select id from public.recipes
      where company_id = public.current_company_id()
    )
  );
