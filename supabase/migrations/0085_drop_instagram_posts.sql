-- =====================================================================
-- 0085_drop_instagram_posts.sql
-- Remove o feed do Instagram gerenciado no painel (tabela + RPC). A
-- /novidades volta a exibir os cards do feed como antes. Mantém o histórico
-- das migrations 0083/0084 (não são apagadas); este é o forward migration
-- que desfaz a feature.
-- =====================================================================

DROP FUNCTION IF EXISTS public.public_instagram_posts();
DROP TABLE IF EXISTS public.instagram_posts;
