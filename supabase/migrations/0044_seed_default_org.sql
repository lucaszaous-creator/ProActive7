-- =====================================================================
-- 0044_seed_default_org.sql  —  Data migration: seed default organization
-- Links all existing companies/profiles to the default org and upgrades
-- master role to platform_admin.
-- =====================================================================

-- 1. Create default organization for platform owner (Ariane)
INSERT INTO public.organizations (id, name, slug, status, contact_email)
VALUES (
  gen_random_uuid(),
  'ProActive Consultoria',
  'proactive',
  'active',
  null
)
ON CONFLICT DO NOTHING;

-- 2. Link existing data to the default org and upgrade master roles
DO $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT id INTO v_org_id FROM public.organizations WHERE slug = 'proactive' LIMIT 1;

  -- Link all companies that don't yet have an organization
  UPDATE public.companies
  SET organization_id = v_org_id
  WHERE organization_id IS NULL;

  -- Update profiles for property users (sync org from their company;
  -- trigger only fires on INSERT/UPDATE of company_id for new rows)
  UPDATE public.profiles p
  SET organization_id = c.organization_id
  FROM public.companies c
  WHERE p.company_id = c.id
    AND p.organization_id IS NULL;

  -- Upgrade master role to platform_admin
  UPDATE public.profiles
  SET role = 'platform_admin'
  WHERE role = 'master';
END;
$$;
