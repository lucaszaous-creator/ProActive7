-- =====================================================================
-- 0051_platform_announcements.sql
-- Banner global de comunicação do platform_admin. Mensagem fica
-- visível para todos os usuários enquanto active=true e janela de
-- exibição estiver válida.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.platform_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  severity text NOT NULL DEFAULT 'info'
    CHECK (severity IN ('info', 'warning', 'maintenance')),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_platform_announcements_active
  ON public.platform_announcements (active, starts_at);

ALTER TABLE public.platform_announcements ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer authenticated lê os anúncios ativos vigentes
CREATE POLICY platform_announcements_read_active
  ON public.platform_announcements FOR SELECT
  USING (
    active = true
    AND starts_at <= now()
    AND (ends_at IS NULL OR ends_at > now())
  );

-- Mutação: apenas platform_admin
CREATE POLICY platform_announcements_admin_all
  ON public.platform_announcements FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- RPC para buscar o anúncio ativo (mais recente)
CREATE OR REPLACE FUNCTION public.get_active_announcement()
RETURNS TABLE (
  id uuid,
  message text,
  severity text,
  starts_at timestamptz,
  ends_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, message, severity, starts_at, ends_at
    FROM public.platform_announcements
    WHERE active = true
      AND starts_at <= now()
      AND (ends_at IS NULL OR ends_at > now())
    ORDER BY starts_at DESC
    LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_active_announcement() FROM public;
GRANT EXECUTE ON FUNCTION public.get_active_announcement() TO authenticated;
