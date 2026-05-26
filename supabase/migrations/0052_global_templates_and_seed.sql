-- =====================================================================
-- 0052_global_templates_and_seed.sql
-- Marca templates de auditoria/checklist e produtos como "globais"
-- (curados pelo platform_admin e visíveis para todas as orgs como
-- modelo a clonar). Quando is_global=true, company_id pode ser NULL.
-- =====================================================================

-- ---------- audit_templates ----------
ALTER TABLE public.audit_templates
  ADD COLUMN IF NOT EXISTS is_global boolean NOT NULL DEFAULT false;

ALTER TABLE public.audit_templates
  ALTER COLUMN company_id DROP NOT NULL;

-- Policy: leitura — qualquer authenticated lê globais; demais via RLS
-- existente (geralmente filtrada por company_id).
DROP POLICY IF EXISTS audit_templates_global_read ON public.audit_templates;
CREATE POLICY audit_templates_global_read
  ON public.audit_templates FOR SELECT
  USING (is_global = true);

-- Policy: criar global — apenas platform_admin
DROP POLICY IF EXISTS audit_templates_global_insert ON public.audit_templates;
CREATE POLICY audit_templates_global_insert
  ON public.audit_templates FOR INSERT
  WITH CHECK (
    (is_global = true AND public.is_platform_admin())
    OR is_global = false
  );

DROP POLICY IF EXISTS audit_templates_global_update ON public.audit_templates;
CREATE POLICY audit_templates_global_update
  ON public.audit_templates FOR UPDATE
  USING (
    (is_global = true AND public.is_platform_admin())
    OR is_global = false
  );

-- ---------- checklist_templates ----------
ALTER TABLE public.checklist_templates
  ADD COLUMN IF NOT EXISTS is_global boolean NOT NULL DEFAULT false;

ALTER TABLE public.checklist_templates
  ALTER COLUMN company_id DROP NOT NULL;

DROP POLICY IF EXISTS checklist_templates_global_read ON public.checklist_templates;
CREATE POLICY checklist_templates_global_read
  ON public.checklist_templates FOR SELECT
  USING (is_global = true);

DROP POLICY IF EXISTS checklist_templates_global_insert ON public.checklist_templates;
CREATE POLICY checklist_templates_global_insert
  ON public.checklist_templates FOR INSERT
  WITH CHECK (
    (is_global = true AND public.is_platform_admin())
    OR is_global = false
  );

DROP POLICY IF EXISTS checklist_templates_global_update ON public.checklist_templates;
CREATE POLICY checklist_templates_global_update
  ON public.checklist_templates FOR UPDATE
  USING (
    (is_global = true AND public.is_platform_admin())
    OR is_global = false
  );

-- ---------- products (catálogo seed) ----------
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_seed boolean NOT NULL DEFAULT false;

ALTER TABLE public.products
  ALTER COLUMN company_id DROP NOT NULL;

DROP POLICY IF EXISTS products_seed_read ON public.products;
CREATE POLICY products_seed_read
  ON public.products FOR SELECT
  USING (is_seed = true);

DROP POLICY IF EXISTS products_seed_insert ON public.products;
CREATE POLICY products_seed_insert
  ON public.products FOR INSERT
  WITH CHECK (
    (is_seed = true AND public.is_platform_admin())
    OR is_seed = false
  );

DROP POLICY IF EXISTS products_seed_update ON public.products;
CREATE POLICY products_seed_update
  ON public.products FOR UPDATE
  USING (
    (is_seed = true AND public.is_platform_admin())
    OR is_seed = false
  );

-- ---------- RPC: clonar template global para a org atual ----------
-- A nutri/property clica em "Usar como modelo" e o template global é
-- copiado para a empresa selecionada. Funciona com audit_template e
-- checklist_template (parametrizada).

CREATE OR REPLACE FUNCTION public.clone_audit_template(
  p_template_id uuid,
  p_company_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_new_id uuid;
  v_org uuid;
BEGIN
  -- Confirma que o template existe e é global
  IF NOT EXISTS (
    SELECT 1 FROM public.audit_templates
    WHERE id = p_template_id AND is_global = true
  ) THEN
    RAISE EXCEPTION 'Template global não encontrado';
  END IF;

  -- Confirma que a empresa pertence à org do usuário
  SELECT organization_id INTO v_org
    FROM public.companies WHERE id = p_company_id;
  IF v_org IS NULL OR v_org <> public.current_organization_id() THEN
    RAISE EXCEPTION 'Empresa fora da sua organização';
  END IF;

  INSERT INTO public.audit_templates (company_id, name, items, is_global)
  SELECT p_company_id, name || ' (cópia)', items, false
    FROM public.audit_templates WHERE id = p_template_id
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.clone_audit_template(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.clone_audit_template(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.clone_checklist_template(
  p_template_id uuid,
  p_company_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_new_id uuid;
  v_org uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.checklist_templates
    WHERE id = p_template_id AND is_global = true
  ) THEN
    RAISE EXCEPTION 'Template global não encontrado';
  END IF;

  SELECT organization_id INTO v_org
    FROM public.companies WHERE id = p_company_id;
  IF v_org IS NULL OR v_org <> public.current_organization_id() THEN
    RAISE EXCEPTION 'Empresa fora da sua organização';
  END IF;

  INSERT INTO public.checklist_templates (company_id, name, items, frequency, active, is_global)
  SELECT p_company_id, name || ' (cópia)', items, frequency, true, false
    FROM public.checklist_templates WHERE id = p_template_id
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.clone_checklist_template(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.clone_checklist_template(uuid, uuid) TO authenticated;

-- Clonar produto seed (com seus shelf lives)
CREATE OR REPLACE FUNCTION public.clone_seed_product(
  p_product_id uuid,
  p_company_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_new_id uuid;
  v_org uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.products WHERE id = p_product_id AND is_seed = true
  ) THEN
    RAISE EXCEPTION 'Produto seed não encontrado';
  END IF;

  SELECT organization_id INTO v_org
    FROM public.companies WHERE id = p_company_id;
  IF v_org IS NULL OR v_org <> public.current_organization_id() THEN
    RAISE EXCEPTION 'Empresa fora da sua organização';
  END IF;

  INSERT INTO public.products
    (company_id, name, category, default_storage_condition, active,
     allergens, is_seed)
  SELECT p_company_id, name, category, default_storage_condition, true,
         allergens, false
    FROM public.products WHERE id = p_product_id
  RETURNING id INTO v_new_id;

  INSERT INTO public.product_shelf_lives
    (product_id, storage_condition, validity_value, validity_unit)
  SELECT v_new_id, storage_condition, validity_value, validity_unit
    FROM public.product_shelf_lives WHERE product_id = p_product_id;

  RETURN v_new_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.clone_seed_product(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.clone_seed_product(uuid, uuid) TO authenticated;
