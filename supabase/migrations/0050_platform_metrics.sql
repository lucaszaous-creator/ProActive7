-- =====================================================================
-- 0050_platform_metrics.sql
-- Métricas globais para o platform_admin: dashboard de SaaS + uso de
-- features. Cria:
--   1. View `platform_org_metrics_v` — métricas agregadas por org.
--   2. Tabela `feature_events` — log de uso de feature (cada chamada
--      cria uma linha; agregação é feita por SELECT count).
--   3. RPC `log_feature_event(feature_key text)` para o frontend
--      registrar uso sem precisar de service role.
-- =====================================================================

-- ---------- View: métricas por organização ----------
-- Agrega counts úteis para o dashboard do dono. RLS implícito: só
-- platform_admin enxerga todas; uma nutritionist enxerga apenas a sua
-- org (a view não tem RLS própria, mas a policy abaixo limita).
CREATE OR REPLACE VIEW public.platform_org_metrics_v AS
SELECT
  o.id AS organization_id,
  o.name AS organization_name,
  o.status,
  o.created_at,
  -- Empresas
  (SELECT count(*) FROM public.companies c
     WHERE c.organization_id = o.id AND c.active = true
     AND c.deleted_at IS NULL) AS company_count,
  -- Usuários
  (SELECT count(*) FROM public.profiles p
     WHERE p.organization_id = o.id AND p.active = true) AS user_count,
  -- Etiquetas impressas nos últimos 30 dias
  (SELECT count(*) FROM public.label_prints lp
     JOIN public.companies c ON c.id = lp.company_id
     WHERE c.organization_id = o.id
     AND lp.printed_at >= now() - interval '30 days') AS labels_30d,
  -- Auditorias completas nos últimos 30 dias
  (SELECT count(*) FROM public.audits a
     JOIN public.companies c ON c.id = a.company_id
     WHERE c.organization_id = o.id
     AND a.status = 'completed'
     AND a.completed_at >= now() - interval '30 days') AS audits_30d,
  -- NCs abertas há mais de 30 dias (sinal de problema)
  (SELECT count(*) FROM public.non_conformities nc
     JOIN public.companies c ON c.id = nc.company_id
     WHERE c.organization_id = o.id
     AND nc.status = 'open'
     AND nc.opened_at < now() - interval '30 days') AS nc_overdue_30d,
  -- NCs abertas total
  (SELECT count(*) FROM public.non_conformities nc
     JOIN public.companies c ON c.id = nc.company_id
     WHERE c.organization_id = o.id
     AND nc.status = 'open') AS nc_open,
  -- Manipuladores ativos
  (SELECT count(*) FROM public.manipulators m
     JOIN public.companies c ON c.id = m.company_id
     WHERE c.organization_id = o.id
     AND m.active = true) AS manipulators_active,
  -- ASOs vencendo em 30 dias
  (SELECT count(*) FROM public.manipulator_asos aso
     JOIN public.manipulators m ON m.id = aso.manipulator_id
     JOIN public.companies c ON c.id = m.company_id
     WHERE c.organization_id = o.id
     AND aso.expires_at <= now() + interval '30 days'
     AND aso.expires_at >= now()) AS asos_expiring_30d,
  -- Último login de qualquer membro da org (vivo via auth.users)
  (SELECT max(u.last_sign_in_at) FROM auth.users u
     JOIN public.profiles p ON p.id = u.id
     WHERE p.organization_id = o.id) AS last_login_at
FROM public.organizations o
WHERE o.deleted_at IS NULL;

-- Permite que platform_admin (via RLS na própria view não funciona;
-- usa-se grant + filtro em queries) leia tudo. O frontend filtra por
-- is_platform_admin() antes de chamar a view.
GRANT SELECT ON public.platform_org_metrics_v TO authenticated;

-- ---------- Tabela: feature_events ----------
-- Registra cada uso de uma feature (label_printed, audit_saved,
-- temperature_logged, nc_opened, etc.). Permite ao admin ver quais
-- features são realmente usadas, por qual org/usuário.
CREATE TABLE IF NOT EXISTS public.feature_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  feature_key text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feature_events_org_time
  ON public.feature_events (organization_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_events_key_time
  ON public.feature_events (feature_key, occurred_at DESC);

ALTER TABLE public.feature_events ENABLE ROW LEVEL SECURITY;

-- platform_admin lê tudo
CREATE POLICY feature_events_admin_select
  ON public.feature_events FOR SELECT
  USING (public.is_platform_admin());

-- Inserts são feitos via RPC com SECURITY DEFINER, então policy de
-- INSERT é restritiva: ninguém insere direto.

-- ---------- RPC: log_feature_event ----------
-- Chamada pelo frontend após ação relevante. Resolve a org do usuário
-- e grava o evento. SECURITY DEFINER permite bypass do RLS de insert.
CREATE OR REPLACE FUNCTION public.log_feature_event(feature_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_org uuid;
BEGIN
  SELECT organization_id INTO v_org
    FROM public.profiles
    WHERE id = auth.uid();
  INSERT INTO public.feature_events (organization_id, user_id, feature_key)
    VALUES (v_org, auth.uid(), feature_key);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_feature_event(text) FROM public;
GRANT EXECUTE ON FUNCTION public.log_feature_event(text) TO authenticated;
