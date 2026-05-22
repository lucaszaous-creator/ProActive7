-- =====================================================================
-- 0010_products_allergens.sql  —  Alergenicos no produto (RDC 26/2015).
-- Lista controlada pelo cliente (chaves canonicas).
-- =====================================================================

alter table public.products
  add column if not exists allergens text[] not null default '{}'::text[];
