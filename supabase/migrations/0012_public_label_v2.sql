-- =====================================================================
-- 0012_public_label_v2.sql  —  Estende get_public_label com os campos
-- de rastreabilidade da 0011 (lote, fornecedor, fabricacao, alergenicos).
-- =====================================================================

-- Drop necessario porque a assinatura de retorno mudou (Postgres nao
-- permite alterar OUT params com CREATE OR REPLACE).
drop function if exists public.get_public_label(uuid);

create or replace function public.get_public_label(p_id uuid)
returns table (
  product_name      text,
  storage_condition public.storage_condition,
  manipulation_at   timestamptz,
  expiry_at         timestamptz,
  responsible_name  text,
  batch             text,
  supplier          text,
  fabricated_at     timestamptz,
  allergens         text[],
  company_name      text,
  company_logo_path text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    lp.product_name_snapshot as product_name,
    lp.storage_condition,
    lp.manipulation_at,
    lp.expiry_at,
    lp.responsible_name,
    lp.batch,
    lp.supplier,
    lp.fabricated_at,
    lp.allergens,
    c.name      as company_name,
    c.logo_path as company_logo_path
  from public.label_prints lp
  join public.companies c on c.id = lp.company_id
  where lp.id = p_id;
$$;

revoke execute on function public.get_public_label(uuid) from public;
grant  execute on function public.get_public_label(uuid) to anon, authenticated;
