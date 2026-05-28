-- =====================================================================
-- 0065_print_agents_property_write.sql
-- Libera o usuário `property` (gerente da unidade) a configurar as
-- impressoras da PRÓPRIA empresa. A 0064 só permitia nutri/admin.
-- Cada property gerencia somente os agentes de company_id = current_company_id().
-- =====================================================================

drop policy if exists print_agents_insert on public.print_agents;
drop policy if exists print_agents_update on public.print_agents;
drop policy if exists print_agents_delete on public.print_agents;

create policy print_agents_insert on public.print_agents for insert to authenticated
  with check (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );

create policy print_agents_update on public.print_agents for update to authenticated
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

create policy print_agents_delete on public.print_agents for delete to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );
