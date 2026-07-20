-- =====================================================================
-- 0097_print_created_by_on_delete_set_null.sql
--
-- Corrige a exclusão de usuários (admin-delete-user retornando 400).
--
-- `profiles.id` referencia `auth.users(id) ON DELETE CASCADE`. Ao apagar
-- o usuário no Auth, a linha em `profiles` deveria cascatear. Porém as FKs
-- `print_agents.created_by` e `print_jobs.created_by` (migration 0064)
-- foram criadas SEM cláusula `on delete` → default NO ACTION. Se o usuário
-- já criou um agente de impressão ou imprimiu uma etiqueta pelo agente,
-- essas linhas bloqueiam a deleção do profile e o `auth.admin.deleteUser`
-- falha (400).
--
-- Alinha as duas FKs ao padrão do resto do schema (todos os demais
-- `created_by`/`*_by` -> profiles usam ON DELETE SET NULL): o histórico de
-- impressão é preservado, apenas perde o vínculo com o usuário apagado.
-- =====================================================================

ALTER TABLE public.print_agents
  DROP CONSTRAINT IF EXISTS print_agents_created_by_fkey,
  ADD CONSTRAINT print_agents_created_by_fkey
    FOREIGN KEY (created_by)
    REFERENCES public.profiles (id)
    ON DELETE SET NULL;

ALTER TABLE public.print_jobs
  DROP CONSTRAINT IF EXISTS print_jobs_created_by_fkey,
  ADD CONSTRAINT print_jobs_created_by_fkey
    FOREIGN KEY (created_by)
    REFERENCES public.profiles (id)
    ON DELETE SET NULL;
