-- Wave 14: campos adicionais para etiqueta no estilo Suflex
-- - display_quantity: texto livre que aparece em destaque (ex: "500 g", "2,5 L")
-- - original_expiry_at: validade original do fabricante (separada da
--   validade calculada apos manipulacao em expiry_at).

alter table public.label_prints
  add column if not exists display_quantity text,
  add column if not exists original_expiry_at timestamptz;
