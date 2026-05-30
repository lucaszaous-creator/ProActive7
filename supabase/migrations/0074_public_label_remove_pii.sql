-- 0074_public_label_remove_pii.sql
--
-- LGPD: get_public_label (etiqueta publica /etiqueta/:id, anon) devolvia
-- PII sem necessidade de seguranca alimentar:
--   - responsible_name  (nome do manipulador — dado pessoal)
--   - company_cnpj, company_address, company_phone (contato do negocio)
--
-- A versao no banco tinha sofrido DRIFT (devolvia mais que as migrations
-- 0008/0012 declaravam). Esta migration redefine a funcao real, SEM os
-- campos de PII, e passa a ser a fonte de verdade versionada.
--
-- O que continua publico (transparencia ao consumidor): produto, condicao
-- de armazenamento, datas de manipulacao/validade, lote, fornecedor,
-- alergenos, quantidade, e nome + logo da empresa (identificacao legitima).

drop function if exists public.get_public_label(uuid);

create function public.get_public_label(p_id uuid)
returns table (
  product_name       text,
  storage_condition  storage_condition,
  manipulation_at    timestamptz,
  expiry_at          timestamptz,
  batch              text,
  supplier           text,
  fabricated_at      timestamptz,
  original_expiry_at timestamptz,
  display_quantity   text,
  allergens          text[],
  company_name       text,
  company_logo_path  text
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    lp.product_name_snapshot as product_name,
    lp.storage_condition,
    lp.manipulation_at,
    lp.expiry_at,
    lp.batch,
    lp.supplier,
    lp.fabricated_at,
    lp.original_expiry_at,
    lp.display_quantity,
    lp.allergens,
    c.name      as company_name,
    c.logo_path as company_logo_path
  from public.label_prints lp
  join public.companies c on c.id = lp.company_id
  where lp.id = p_id;
$$;

revoke all on function public.get_public_label(uuid) from public;
grant execute on function public.get_public_label(uuid) to anon, authenticated;
