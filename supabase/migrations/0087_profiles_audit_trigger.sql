-- =====================================================================
-- 0087_profiles_audit_trigger.sql
-- Adiciona trilha de auditoria em `profiles` (estava ausente). Mudança de
-- role / organization_id / company_id (escalonamento de privilégio ou troca
-- de tenant) passa a ser registrada no audit_log via a trigger genérica
-- log_changes(). Importante para diagnóstico de incidentes e LGPD.
-- =====================================================================

DROP TRIGGER IF EXISTS trg_profiles_audit ON public.profiles;
CREATE TRIGGER trg_profiles_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_changes();
