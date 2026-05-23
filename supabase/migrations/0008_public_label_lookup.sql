-- =====================================================================
-- 0008_public_label_lookup.sql  —  Endpoint anonimo de rastreabilidade
-- ---------------------------------------------------------------------
-- O QR impresso na etiqueta aponta para /etiqueta/{id}. Essa pagina
-- precisa ler 5 campos de label_prints sem JWT, mas SEM expor a tabela
-- inteira. Solucao: uma funcao SECURITY DEFINER que retorna apenas os
-- campos visiveis, executavel pelo role anon.
-- =====================================================================

create or replace function public.get_public_label(p_id uuid)
returns table (
  product_name      text,
  storage_condition public.storage_condition,
  manipulation_at   timestamptz,
  expiry_at         timestamptz,
  responsible_name  text,
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
    c.name      as company_name,
    c.logo_path as company_logo_path
  from public.label_prints lp
  join public.companies c on c.id = lp.company_id
  where lp.id = p_id;
$$;

revoke execute on function public.get_public_label(uuid) from public;
grant  execute on function public.get_public_label(uuid) to anon, authenticated;
