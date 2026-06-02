-- =====================================================================
-- 0083_instagram_posts.sql — Posts do Instagram exibidos no /novidades
-- A nutricionista RT / platform_admin cola o link (permalink) de um post
-- do @proactive.7 no painel; o site público renderiza o embed oficial do
-- Instagram. Leitura pública (só ativos) via RPC SECURITY DEFINER.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.instagram_posts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url         text NOT NULL,
  sort_order  int NOT NULL DEFAULT 0,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  author_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT instagram_posts_url_chk CHECK (url ~* 'instagram\.com/(p|reel|tv)/')
);

CREATE INDEX IF NOT EXISTS idx_instagram_posts_active
  ON public.instagram_posts (active, sort_order);

ALTER TABLE public.instagram_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY instagram_posts_admin_read
  ON public.instagram_posts FOR SELECT
  USING (public.is_platform_admin() OR public.is_nutritionist());

CREATE POLICY instagram_posts_admin_write
  ON public.instagram_posts FOR ALL
  USING (public.is_platform_admin() OR public.is_nutritionist())
  WITH CHECK (public.is_platform_admin() OR public.is_nutritionist());

CREATE OR REPLACE FUNCTION public.public_instagram_posts()
RETURNS TABLE (id uuid, url text, sort_order int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, url, sort_order
    FROM public.instagram_posts
   WHERE active = true
   ORDER BY sort_order, created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.public_instagram_posts() FROM public;
GRANT EXECUTE ON FUNCTION public.public_instagram_posts() TO anon, authenticated;
