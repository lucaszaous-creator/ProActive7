-- =====================================================================
-- 0107_recipes_org_scope_and_costs.sql — fichas técnicas utilizáveis
-- ---------------------------------------------------------------------
-- (1) RLS: a 0017 é anterior às organizações (0043) e só enxergava
--     `is_master() OR company_id = current_company_id()`. Como
--     `is_master()` hoje é só platform_admin e a nutricionista é
--     escopada por ORGANIZAÇÃO (profiles.company_id nulo), na prática a
--     RT não conseguia ler nem criar UMA ficha sequer. Passa a seguir o
--     mesmo padrão de `products` na 0043.
--
-- (2) Campos que faltavam para ser uma ficha técnica de verdade:
--     rendimento estruturado (porções + peso da porção), fator de
--     correção por ingrediente (peso bruto → líquido) e custo por
--     ingrediente. O custo fica no ITEM da ficha, não no produto:
--     preço de compra muda a cada nota, e o que a RT precisa registrar
--     é o custo considerado NAQUELA ficha, na data em que a fez.
--     Com isso o front calcula custo total, custo por porção e per
--     capita sem nenhuma tabela nova.
-- =====================================================================

-- ---------- (1) Campos da ficha ----------

alter table public.recipes
  add column if not exists yield_portions integer
    check (yield_portions is null or yield_portions > 0),
  add column if not exists portion_grams  numeric(10,2)
    check (portion_grams is null or portion_grams > 0);

alter table public.recipe_items
  add column if not exists correction_factor numeric(6,3) not null default 1
    check (correction_factor > 0),
  add column if not exists cost_cents integer
    check (cost_cents is null or cost_cents >= 0);

comment on column public.recipes.yield_portions is
  'Rendimento em porções — base do custo por porção e do per capita.';
comment on column public.recipes.portion_grams is
  'Peso (g) de uma porção servida.';
comment on column public.recipe_items.correction_factor is
  'Fator de correção (peso bruto / peso líquido). 1 = sem perda de limpeza.';
comment on column public.recipe_items.cost_cents is
  'Custo do ingrediente nesta ficha, em centavos, na quantidade informada.';

-- ---------- (2) RLS por organização (modelo da 0043) ----------

drop policy if exists recipes_select on public.recipes;
drop policy if exists recipes_insert on public.recipes;
drop policy if exists recipes_update on public.recipes;
drop policy if exists recipes_delete on public.recipes;

create policy recipes_select on public.recipes for select to authenticated
  using (
    public.is_platform_admin()
    OR (public.is_nutritionist() AND company_id IN (
      SELECT id FROM public.companies
      WHERE organization_id = public.current_organization_id()
    ))
    OR company_id = public.current_company_id()
  );

create policy recipes_insert on public.recipes for insert to authenticated
  with check (
    public.is_platform_admin()
    OR (public.is_nutritionist() AND company_id IN (
      SELECT id FROM public.companies
      WHERE organization_id = public.current_organization_id()
    ))
    OR company_id = public.current_company_id()
  );

create policy recipes_update on public.recipes for update to authenticated
  using (
    public.is_platform_admin()
    OR (public.is_nutritionist() AND company_id IN (
      SELECT id FROM public.companies
      WHERE organization_id = public.current_organization_id()
    ))
    OR company_id = public.current_company_id()
  )
  with check (
    public.is_platform_admin()
    OR (public.is_nutritionist() AND company_id IN (
      SELECT id FROM public.companies
      WHERE organization_id = public.current_organization_id()
    ))
    OR company_id = public.current_company_id()
  );

create policy recipes_delete on public.recipes for delete to authenticated
  using (
    public.is_platform_admin()
    OR (public.is_nutritionist() AND company_id IN (
      SELECT id FROM public.companies
      WHERE organization_id = public.current_organization_id()
    ))
    OR company_id = public.current_company_id()
  );

-- recipe_items herda o escopo da ficha-mãe.

drop policy if exists recipe_items_select on public.recipe_items;
drop policy if exists recipe_items_insert on public.recipe_items;
drop policy if exists recipe_items_update on public.recipe_items;
drop policy if exists recipe_items_delete on public.recipe_items;

create policy recipe_items_select on public.recipe_items for select to authenticated
  using (recipe_id IN (SELECT id FROM public.recipes));

create policy recipe_items_insert on public.recipe_items for insert to authenticated
  with check (recipe_id IN (SELECT id FROM public.recipes));

create policy recipe_items_update on public.recipe_items for update to authenticated
  using (recipe_id IN (SELECT id FROM public.recipes))
  with check (recipe_id IN (SELECT id FROM public.recipes));

create policy recipe_items_delete on public.recipe_items for delete to authenticated
  using (recipe_id IN (SELECT id FROM public.recipes));
