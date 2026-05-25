-- =====================================================================
-- 0043_rls_organizations.sql  —  3-tier RLS: platform_admin / nutritionist / property
-- Replaces all existing RLS policies to support multi-tenant hierarchy.
-- =====================================================================

-- ---------- 1. Helper functions ----------

-- Returns the organization_id for the current user
create or replace function public.current_organization_id()
returns uuid language sql stable security definer set search_path = public as $$
  select organization_id from public.profiles where id = auth.uid();
$$;

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role in ('master','platform_admin') from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.is_nutritionist()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role = 'nutritionist' from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Keep is_master() as alias for backward compatibility
create or replace function public.is_master()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_platform_admin();
$$;

-- ---------- 2. organizations table RLS ----------

alter table public.organizations enable row level security;

create policy orgs_select on public.organizations for select to authenticated
  using (is_platform_admin() OR id = current_organization_id());

create policy orgs_insert on public.organizations for insert to authenticated
  with check (is_platform_admin());

create policy orgs_update on public.organizations for update to authenticated
  using (is_platform_admin() OR (is_nutritionist() AND id = current_organization_id()))
  with check (is_platform_admin() OR (is_nutritionist() AND id = current_organization_id()));

create policy orgs_delete on public.organizations for delete to authenticated
  using (is_platform_admin());

-- ---------- 3. companies ----------

drop policy if exists companies_select on public.companies;
drop policy if exists companies_insert on public.companies;
drop policy if exists companies_update on public.companies;
drop policy if exists companies_delete on public.companies;

create policy companies_select on public.companies for select to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND organization_id = current_organization_id())
    OR id = current_company_id()
  );

create policy companies_insert on public.companies for insert to authenticated
  with check (
    is_platform_admin()
    OR (is_nutritionist() AND organization_id = current_organization_id())
  );

create policy companies_update on public.companies for update to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND organization_id = current_organization_id())
  )
  with check (
    is_platform_admin()
    OR (is_nutritionist() AND organization_id = current_organization_id())
  );

create policy companies_delete on public.companies for delete to authenticated
  using (is_platform_admin());

-- ---------- 4. profiles ----------

drop policy if exists profiles_select on public.profiles;
drop policy if exists "profiles_select" on public.profiles;
drop policy if exists profiles_update on public.profiles;
drop policy if exists "profiles_update" on public.profiles;

create policy profiles_select on public.profiles for select to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND organization_id = current_organization_id())
    OR id = (select auth.uid())
  );

create policy profiles_update on public.profiles for update to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND organization_id = current_organization_id())
    OR id = (select auth.uid())
  )
  with check (
    is_platform_admin()
    OR (is_nutritionist() AND organization_id = current_organization_id())
    OR id = (select auth.uid())
  );

-- ---------- 5. products ----------

drop policy if exists products_select on public.products;
drop policy if exists products_insert on public.products;
drop policy if exists products_update on public.products;
drop policy if exists products_delete on public.products;

create policy products_select on public.products for select to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );

create policy products_insert on public.products for insert to authenticated
  with check (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );

create policy products_update on public.products for update to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  )
  with check (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );

create policy products_delete on public.products for delete to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );

-- ---------- 6. product_shelf_lives (scoped via product_id) ----------

drop policy if exists shelf_select on public.product_shelf_lives;
drop policy if exists shelf_insert on public.product_shelf_lives;
drop policy if exists shelf_update on public.product_shelf_lives;
drop policy if exists shelf_delete on public.product_shelf_lives;

create policy shelf_select on public.product_shelf_lives for select to authenticated
  using (
    product_id IN (
      SELECT id FROM products WHERE
        is_platform_admin()
        OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
        OR company_id = current_company_id()
    )
  );

create policy shelf_insert on public.product_shelf_lives for insert to authenticated
  with check (
    product_id IN (
      SELECT id FROM products WHERE
        is_platform_admin()
        OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
        OR company_id = current_company_id()
    )
  );

create policy shelf_update on public.product_shelf_lives for update to authenticated
  using (
    product_id IN (
      SELECT id FROM products WHERE
        is_platform_admin()
        OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
        OR company_id = current_company_id()
    )
  )
  with check (
    product_id IN (
      SELECT id FROM products WHERE
        is_platform_admin()
        OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
        OR company_id = current_company_id()
    )
  );

create policy shelf_delete on public.product_shelf_lives for delete to authenticated
  using (
    product_id IN (
      SELECT id FROM products WHERE
        is_platform_admin()
        OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
        OR company_id = current_company_id()
    )
  );

-- ---------- 7. label_prints ----------

drop policy if exists label_prints_select on public.label_prints;
drop policy if exists label_prints_insert on public.label_prints;

create policy label_prints_select on public.label_prints for select to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );

create policy label_prints_insert on public.label_prints for insert to authenticated
  with check (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );

-- ---------- 8. photos ----------

drop policy if exists photos_select on public.photos;
drop policy if exists photos_insert on public.photos;
drop policy if exists photos_delete on public.photos;

create policy photos_select on public.photos for select to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );

create policy photos_insert on public.photos for insert to authenticated
  with check (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );

create policy photos_delete on public.photos for delete to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );

-- ---------- 9. equipment ----------

drop policy if exists equipment_select on public.equipment;
drop policy if exists equipment_insert on public.equipment;
drop policy if exists equipment_update on public.equipment;
drop policy if exists equipment_delete on public.equipment;

create policy equipment_select on public.equipment for select to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );

create policy equipment_insert on public.equipment for insert to authenticated
  with check (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );

create policy equipment_update on public.equipment for update to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  )
  with check (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );

create policy equipment_delete on public.equipment for delete to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );

-- ---------- 10. temperature_logs (scoped via equipment.company_id) ----------

drop policy if exists temp_select on public.temperature_logs;
drop policy if exists temp_insert on public.temperature_logs;
drop policy if exists temp_delete on public.temperature_logs;

create policy temp_select on public.temperature_logs for select to authenticated
  using (
    equipment_id IN (
      SELECT id FROM equipment WHERE
        is_platform_admin()
        OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
        OR company_id = current_company_id()
    )
  );

create policy temp_insert on public.temperature_logs for insert to authenticated
  with check (
    equipment_id IN (
      SELECT id FROM equipment WHERE
        is_platform_admin()
        OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
        OR company_id = current_company_id()
    )
  );

create policy temp_delete on public.temperature_logs for delete to authenticated
  using (
    equipment_id IN (
      SELECT id FROM equipment WHERE
        is_platform_admin()
        OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
        OR company_id = current_company_id()
    )
  );

-- ---------- 11. checklist_templates ----------

drop policy if exists chk_tpl_select on public.checklist_templates;
drop policy if exists chk_tpl_insert on public.checklist_templates;
drop policy if exists chk_tpl_update on public.checklist_templates;
drop policy if exists chk_tpl_delete on public.checklist_templates;

create policy chk_tpl_select on public.checklist_templates for select to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );

create policy chk_tpl_insert on public.checklist_templates for insert to authenticated
  with check (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );

create policy chk_tpl_update on public.checklist_templates for update to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  )
  with check (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );

create policy chk_tpl_delete on public.checklist_templates for delete to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );

-- ---------- 12. checklist_runs (scoped via template_id -> checklist_templates.company_id) ----------

drop policy if exists chk_run_select on public.checklist_runs;
drop policy if exists chk_run_insert on public.checklist_runs;
drop policy if exists chk_run_delete on public.checklist_runs;

create policy chk_run_select on public.checklist_runs for select to authenticated
  using (
    template_id IN (
      SELECT id FROM checklist_templates WHERE
        is_platform_admin()
        OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
        OR company_id = current_company_id()
    )
  );

create policy chk_run_insert on public.checklist_runs for insert to authenticated
  with check (
    template_id IN (
      SELECT id FROM checklist_templates WHERE
        is_platform_admin()
        OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
        OR company_id = current_company_id()
    )
  );

create policy chk_run_delete on public.checklist_runs for delete to authenticated
  using (
    template_id IN (
      SELECT id FROM checklist_templates WHERE
        is_platform_admin()
        OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
        OR company_id = current_company_id()
    )
  );

-- ---------- 13. recipes ----------

drop policy if exists recipes_select on public.recipes;
drop policy if exists recipes_insert on public.recipes;
drop policy if exists recipes_update on public.recipes;
drop policy if exists recipes_delete on public.recipes;

create policy recipes_select on public.recipes for select to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );

create policy recipes_insert on public.recipes for insert to authenticated
  with check (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );

create policy recipes_update on public.recipes for update to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  )
  with check (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );

create policy recipes_delete on public.recipes for delete to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );

-- ---------- 14. recipe_items (scoped via recipe_id -> recipes.company_id) ----------

drop policy if exists recipe_items_select on public.recipe_items;
drop policy if exists recipe_items_insert on public.recipe_items;
drop policy if exists recipe_items_update on public.recipe_items;
drop policy if exists recipe_items_delete on public.recipe_items;

create policy recipe_items_select on public.recipe_items for select to authenticated
  using (
    recipe_id IN (
      SELECT id FROM recipes WHERE
        is_platform_admin()
        OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
        OR company_id = current_company_id()
    )
  );

create policy recipe_items_insert on public.recipe_items for insert to authenticated
  with check (
    recipe_id IN (
      SELECT id FROM recipes WHERE
        is_platform_admin()
        OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
        OR company_id = current_company_id()
    )
  );

create policy recipe_items_update on public.recipe_items for update to authenticated
  using (
    recipe_id IN (
      SELECT id FROM recipes WHERE
        is_platform_admin()
        OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
        OR company_id = current_company_id()
    )
  )
  with check (
    recipe_id IN (
      SELECT id FROM recipes WHERE
        is_platform_admin()
        OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
        OR company_id = current_company_id()
    )
  );

create policy recipe_items_delete on public.recipe_items for delete to authenticated
  using (
    recipe_id IN (
      SELECT id FROM recipes WHERE
        is_platform_admin()
        OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
        OR company_id = current_company_id()
    )
  );

-- ---------- 15. documents ----------

drop policy if exists documents_select on public.documents;
drop policy if exists "documents_select" on public.documents;
drop policy if exists documents_insert on public.documents;
drop policy if exists "documents_insert" on public.documents;
drop policy if exists documents_update on public.documents;
drop policy if exists "documents_update" on public.documents;
drop policy if exists documents_delete on public.documents;
drop policy if exists "documents_delete" on public.documents;

create policy documents_select on public.documents for select to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );

create policy documents_insert on public.documents for insert to authenticated
  with check (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );

create policy documents_update on public.documents for update to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  )
  with check (
    -- platform_admin and nutritionist can publish; property cannot
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR status <> 'published'
  );

create policy documents_delete on public.documents for delete to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );

-- ---------- 16. document_versions (scoped via document_id -> documents.company_id) ----------

drop policy if exists document_versions_select on public.document_versions;
drop policy if exists "document_versions_select" on public.document_versions;
drop policy if exists document_versions_insert on public.document_versions;
drop policy if exists "document_versions_insert" on public.document_versions;

create policy document_versions_select on public.document_versions for select to authenticated
  using (
    EXISTS (
      SELECT 1 FROM documents d WHERE d.id = document_id AND (
        is_platform_admin()
        OR (is_nutritionist() AND d.company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
        OR d.company_id = current_company_id()
      )
    )
  );

create policy document_versions_insert on public.document_versions for insert to authenticated
  with check (
    EXISTS (
      SELECT 1 FROM documents d WHERE d.id = document_id AND (
        is_platform_admin()
        OR (is_nutritionist() AND d.company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
        OR d.company_id = current_company_id()
      )
    )
  );

-- ---------- 17. audit_templates ----------
-- Global templates (company_id IS NULL) remain readable by all.
-- Nutritionist can write templates for their org companies.

drop policy if exists audit_templates_select on public.audit_templates;
drop policy if exists "audit_templates_select" on public.audit_templates;
drop policy if exists audit_templates_master_write on public.audit_templates;
drop policy if exists "audit_templates_master_write" on public.audit_templates;

create policy audit_templates_select on public.audit_templates for select to authenticated
  using (
    company_id IS NULL
    OR is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );

create policy audit_templates_insert on public.audit_templates for insert to authenticated
  with check (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
  );

create policy audit_templates_update on public.audit_templates for update to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
  )
  with check (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
  );

create policy audit_templates_delete on public.audit_templates for delete to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
  );

-- ---------- 18. audits ----------

drop policy if exists audits_select on public.audits;
drop policy if exists "audits_select" on public.audits;
drop policy if exists audits_master_write on public.audits;
drop policy if exists "audits_master_write" on public.audits;

create policy audits_select on public.audits for select to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );

create policy audits_insert on public.audits for insert to authenticated
  with check (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
  );

create policy audits_update on public.audits for update to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
  )
  with check (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
  );

create policy audits_delete on public.audits for delete to authenticated
  using (is_platform_admin());

-- ---------- 19. non_conformities ----------

drop policy if exists nc_select on public.non_conformities;
drop policy if exists "nc_select" on public.non_conformities;
drop policy if exists nc_insert on public.non_conformities;
drop policy if exists "nc_insert" on public.non_conformities;
drop policy if exists nc_update on public.non_conformities;
drop policy if exists "nc_update" on public.non_conformities;
drop policy if exists nc_delete on public.non_conformities;
drop policy if exists "nc_delete" on public.non_conformities;

create policy nc_select on public.non_conformities for select to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );

create policy nc_insert on public.non_conformities for insert to authenticated
  with check (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );

create policy nc_update on public.non_conformities for update to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );

create policy nc_delete on public.non_conformities for delete to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
  );

-- ---------- 20. manipulators ----------

drop policy if exists manipulators_select on public.manipulators;
drop policy if exists "manipulators_select" on public.manipulators;
drop policy if exists manipulators_write on public.manipulators;
drop policy if exists "manipulators_write" on public.manipulators;
drop policy if exists manipulators_master_write on public.manipulators;
drop policy if exists "manipulators_master_write" on public.manipulators;

create policy manipulators_select on public.manipulators for select to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );

create policy manipulators_insert on public.manipulators for insert to authenticated
  with check (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
  );

create policy manipulators_update on public.manipulators for update to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
  )
  with check (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
  );

create policy manipulators_delete on public.manipulators for delete to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
  );

-- ---------- 21. manipulator_asos (scoped via manipulator_id -> manipulators.company_id) ----------

drop policy if exists asos_select on public.manipulator_asos;
drop policy if exists "asos_select" on public.manipulator_asos;
drop policy if exists asos_write on public.manipulator_asos;
drop policy if exists "asos_write" on public.manipulator_asos;
drop policy if exists asos_master_write on public.manipulator_asos;
drop policy if exists "asos_master_write" on public.manipulator_asos;

create policy asos_select on public.manipulator_asos for select to authenticated
  using (
    EXISTS (
      SELECT 1 FROM manipulators m WHERE m.id = manipulator_id AND (
        is_platform_admin()
        OR (is_nutritionist() AND m.company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
        OR m.company_id = current_company_id()
      )
    )
  );

create policy asos_insert on public.manipulator_asos for insert to authenticated
  with check (
    EXISTS (
      SELECT 1 FROM manipulators m WHERE m.id = manipulator_id AND (
        is_platform_admin()
        OR (is_nutritionist() AND m.company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
      )
    )
  );

create policy asos_update on public.manipulator_asos for update to authenticated
  using (
    EXISTS (
      SELECT 1 FROM manipulators m WHERE m.id = manipulator_id AND (
        is_platform_admin()
        OR (is_nutritionist() AND m.company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
      )
    )
  )
  with check (
    EXISTS (
      SELECT 1 FROM manipulators m WHERE m.id = manipulator_id AND (
        is_platform_admin()
        OR (is_nutritionist() AND m.company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
      )
    )
  );

create policy asos_delete on public.manipulator_asos for delete to authenticated
  using (
    EXISTS (
      SELECT 1 FROM manipulators m WHERE m.id = manipulator_id AND (
        is_platform_admin()
        OR (is_nutritionist() AND m.company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
      )
    )
  );

-- ---------- 22. manipulator_trainings (scoped via manipulator_id -> manipulators.company_id) ----------

drop policy if exists trainings_select on public.manipulator_trainings;
drop policy if exists "trainings_select" on public.manipulator_trainings;
drop policy if exists trainings_write on public.manipulator_trainings;
drop policy if exists "trainings_write" on public.manipulator_trainings;
drop policy if exists trainings_master_write on public.manipulator_trainings;
drop policy if exists "trainings_master_write" on public.manipulator_trainings;

create policy trainings_select on public.manipulator_trainings for select to authenticated
  using (
    EXISTS (
      SELECT 1 FROM manipulators m WHERE m.id = manipulator_id AND (
        is_platform_admin()
        OR (is_nutritionist() AND m.company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
        OR m.company_id = current_company_id()
      )
    )
  );

create policy trainings_insert on public.manipulator_trainings for insert to authenticated
  with check (
    EXISTS (
      SELECT 1 FROM manipulators m WHERE m.id = manipulator_id AND (
        is_platform_admin()
        OR (is_nutritionist() AND m.company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
      )
    )
  );

create policy trainings_update on public.manipulator_trainings for update to authenticated
  using (
    EXISTS (
      SELECT 1 FROM manipulators m WHERE m.id = manipulator_id AND (
        is_platform_admin()
        OR (is_nutritionist() AND m.company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
      )
    )
  )
  with check (
    EXISTS (
      SELECT 1 FROM manipulators m WHERE m.id = manipulator_id AND (
        is_platform_admin()
        OR (is_nutritionist() AND m.company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
      )
    )
  );

create policy trainings_delete on public.manipulator_trainings for delete to authenticated
  using (
    EXISTS (
      SELECT 1 FROM manipulators m WHERE m.id = manipulator_id AND (
        is_platform_admin()
        OR (is_nutritionist() AND m.company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
      )
    )
  );

-- ---------- 23. pest_control_providers ----------

drop policy if exists pest_providers_select on public.pest_control_providers;
drop policy if exists "pest_providers_select" on public.pest_control_providers;
drop policy if exists pest_providers_write on public.pest_control_providers;
drop policy if exists "pest_providers_write" on public.pest_control_providers;

create policy pest_providers_select on public.pest_control_providers for select to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );

create policy pest_providers_insert on public.pest_control_providers for insert to authenticated
  with check (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );

create policy pest_providers_update on public.pest_control_providers for update to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  )
  with check (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );

create policy pest_providers_delete on public.pest_control_providers for delete to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
  );

-- ---------- 24. pest_control_services ----------

drop policy if exists pest_services_select on public.pest_control_services;
drop policy if exists "pest_services_select" on public.pest_control_services;
drop policy if exists pest_services_write on public.pest_control_services;
drop policy if exists "pest_services_write" on public.pest_control_services;

create policy pest_services_select on public.pest_control_services for select to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );

create policy pest_services_insert on public.pest_control_services for insert to authenticated
  with check (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );

create policy pest_services_update on public.pest_control_services for update to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  )
  with check (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );

create policy pest_services_delete on public.pest_control_services for delete to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
  );

-- ---------- 25. push_subscriptions ----------

drop policy if exists push_subs_select on public.push_subscriptions;
drop policy if exists "push_subs_select" on public.push_subscriptions;
drop policy if exists push_subs_insert on public.push_subscriptions;
drop policy if exists "push_subs_insert" on public.push_subscriptions;
drop policy if exists push_subs_delete on public.push_subscriptions;
drop policy if exists "push_subs_delete" on public.push_subscriptions;

create policy push_subs_select on public.push_subscriptions for select to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND user_id IN (SELECT id FROM profiles WHERE organization_id = current_organization_id()))
    OR user_id = (select auth.uid())
  );

create policy push_subs_insert on public.push_subscriptions for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy push_subs_delete on public.push_subscriptions for delete to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND user_id IN (SELECT id FROM profiles WHERE organization_id = current_organization_id()))
    OR user_id = (select auth.uid())
  );

-- ---------- 26. audit_log ----------

drop policy if exists audit_log_master_select on public.audit_log;
drop policy if exists "audit_log_master_select" on public.audit_log;

create policy audit_log_select on public.audit_log for select to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND user_id IN (SELECT id FROM profiles WHERE organization_id = current_organization_id()))
  );

-- ---------- 27. Storage: photos bucket ----------

drop policy if exists photos_storage_select on storage.objects;
drop policy if exists photos_storage_insert on storage.objects;
drop policy if exists photos_storage_delete on storage.objects;

create policy photos_storage_select on storage.objects for select to authenticated
  using (
    bucket_id = 'photos' and (
      is_platform_admin()
      OR (is_nutritionist() AND (storage.foldername(name))[1] IN (
        SELECT id::text FROM companies WHERE organization_id = current_organization_id()
      ))
      OR (storage.foldername(name))[1] = current_company_id()::text
    )
  );

create policy photos_storage_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'photos' and (
      is_platform_admin()
      OR (is_nutritionist() AND (storage.foldername(name))[1] IN (
        SELECT id::text FROM companies WHERE organization_id = current_organization_id()
      ))
      OR (storage.foldername(name))[1] = current_company_id()::text
    )
  );

create policy photos_storage_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'photos' and (
      is_platform_admin()
      OR (is_nutritionist() AND (storage.foldername(name))[1] IN (
        SELECT id::text FROM companies WHERE organization_id = current_organization_id()
      ))
      OR (storage.foldername(name))[1] = current_company_id()::text
    )
  );

-- ---------- 28. Storage: employee-docs bucket ----------

drop policy if exists employee_docs_select on storage.objects;
drop policy if exists "employee_docs_select" on storage.objects;
drop policy if exists employee_docs_insert on storage.objects;
drop policy if exists "employee_docs_insert" on storage.objects;
drop policy if exists employee_docs_update on storage.objects;
drop policy if exists "employee_docs_update" on storage.objects;
drop policy if exists employee_docs_delete on storage.objects;
drop policy if exists "employee_docs_delete" on storage.objects;
drop policy if exists employee_docs_master_insert on storage.objects;
drop policy if exists "employee_docs_master_insert" on storage.objects;
drop policy if exists employee_docs_master_update on storage.objects;
drop policy if exists "employee_docs_master_update" on storage.objects;
drop policy if exists employee_docs_master_delete on storage.objects;
drop policy if exists "employee_docs_master_delete" on storage.objects;

create policy employee_docs_select on storage.objects for select to authenticated
  using (
    bucket_id = 'employee-docs' and (
      is_platform_admin()
      OR (is_nutritionist() AND (storage.foldername(name))[1] IN (
        SELECT id::text FROM companies WHERE organization_id = current_organization_id()
      ))
      OR (storage.foldername(name))[1] = current_company_id()::text
    )
  );

create policy employee_docs_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'employee-docs' and (
      is_platform_admin()
      OR (is_nutritionist() AND (storage.foldername(name))[1] IN (
        SELECT id::text FROM companies WHERE organization_id = current_organization_id()
      ))
    )
  );

create policy employee_docs_update on storage.objects for update to authenticated
  using (
    bucket_id = 'employee-docs' and (
      is_platform_admin()
      OR (is_nutritionist() AND (storage.foldername(name))[1] IN (
        SELECT id::text FROM companies WHERE organization_id = current_organization_id()
      ))
    )
  );

create policy employee_docs_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'employee-docs' and (
      is_platform_admin()
      OR (is_nutritionist() AND (storage.foldername(name))[1] IN (
        SELECT id::text FROM companies WHERE organization_id = current_organization_id()
      ))
    )
  );
