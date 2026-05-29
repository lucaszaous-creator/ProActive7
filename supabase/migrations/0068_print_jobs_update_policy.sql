-- 0068_print_jobs_update_policy.sql
-- Permite ao relay (autenticado como usuário da empresa, no fluxo via app)
-- atualizar o status dos print_jobs: queued -> printing -> done/error.
-- Mesmo escopo de empresa do select/insert.
drop policy if exists print_jobs_update on public.print_jobs;
create policy print_jobs_update on public.print_jobs for update to authenticated
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
