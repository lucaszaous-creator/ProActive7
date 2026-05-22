-- =====================================================================
-- 0005_harden_functions.sql  —  Endurece funcoes (advisors de seguranca)
-- ---------------------------------------------------------------------
-- Aplicado depois de 0001-0003 para resolver os avisos do database linter:
--   * search_path mutavel em set_updated_at;
--   * SECURITY DEFINER expostas via RPC para anon/public.
-- =====================================================================

-- search_path fixo no trigger de updated_at.
alter function public.set_updated_at() set search_path = public;

-- Helper functions de RLS: nao devem ser chamaveis via RPC por anon/public.
-- O role 'authenticated' precisa manter EXECUTE para as policies funcionarem.
revoke execute on function public.is_master()          from public;
revoke execute on function public.current_company_id() from public;
grant  execute on function public.is_master()          to authenticated;
grant  execute on function public.current_company_id() to authenticated;

-- handle_new_user e funcao de trigger: nenhum role precisa de EXECUTE direto.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
