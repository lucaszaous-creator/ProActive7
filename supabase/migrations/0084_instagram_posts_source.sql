-- =====================================================================
-- 0084_instagram_posts_source.sql
-- Colunas para distinguir posts adicionados manualmente no painel
-- (source='manual') de eventuais posts sincronizados automaticamente
-- (source='auto'). Reservado para uma futura sincronização via Instagram
-- Graph API — o scraping sem API foi testado e o Instagram bloqueia
-- requisições de servidor (401 require_login), então não é usado.
-- =====================================================================

ALTER TABLE public.instagram_posts
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';
ALTER TABLE public.instagram_posts
  ADD COLUMN IF NOT EXISTS external_id text;

CREATE INDEX IF NOT EXISTS idx_instagram_posts_source
  ON public.instagram_posts (source);
