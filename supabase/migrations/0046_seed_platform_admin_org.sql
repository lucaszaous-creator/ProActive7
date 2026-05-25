-- =====================================================================
-- 0046_seed_platform_admin_org.sql
-- Vincula platform_admin(s) sem organization_id a "ProActive Consultoria",
-- para que empresas criadas por eles caiam na propria org (e nao orfas).
-- =====================================================================

UPDATE public.profiles
SET organization_id = (SELECT id FROM public.organizations WHERE slug = 'proactive')
WHERE role = 'platform_admin'
  AND organization_id IS NULL;
