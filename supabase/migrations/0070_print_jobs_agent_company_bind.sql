-- 0070_print_jobs_agent_company_bind.sql
-- Defesa-em-profundidade multi-tenant: garante que o agent_id de um print_job
-- pertence à MESMA empresa do job. Sem isso, um usuário da empresa A poderia
-- inserir um job (company_id = A, passa no check) apontando para um agente da
-- empresa B. Amarra agent_id <-> company_id no INSERT.
drop policy if exists print_jobs_insert on public.print_jobs;
create policy print_jobs_insert on public.print_jobs for insert to authenticated
  with check (
    agent_id IN (
      SELECT id FROM public.print_agents WHERE company_id = print_jobs.company_id
    )
    AND (
      is_platform_admin()
      OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
      OR company_id = current_company_id()
    )
  );
