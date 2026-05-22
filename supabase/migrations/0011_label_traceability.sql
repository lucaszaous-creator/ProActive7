-- =====================================================================
-- 0011_label_traceability.sql  —  Rastreabilidade por etiqueta.
-- ---------------------------------------------------------------------
-- batch/supplier/fabricated_at sao registrados opcionalmente no momento
-- da impressao. allergens entra como snapshot — se o produto for editado
-- depois, a etiqueta impressa mantem o que estava declarado.
-- =====================================================================

alter table public.label_prints
  add column if not exists batch text,
  add column if not exists supplier text,
  add column if not exists fabricated_at timestamptz,
  add column if not exists allergens text[] not null default '{}'::text[];
