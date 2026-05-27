-- =====================================================================
-- 0056_stock_balance_view.sql — Saldo de estoque por (empresa, produto, lote)
-- security_invoker = on para que RLS de stock_movements aplique a quem
-- consulta. Expiry vem do receiving_item mais antigo do mesmo lote.
-- =====================================================================

create or replace view public.stock_balance_v
with (security_invoker = on) as
select
  m.company_id,
  m.product_id,
  m.batch,
  sum(m.quantity_delta)::numeric(12,3) as balance,
  max(m.unit) as unit,
  (
    select min(ri.expiry_date)
    from public.receiving_items ri
    join public.receivings r on r.id = ri.receiving_id
    where r.company_id = m.company_id
      and ri.product_id = m.product_id
      and ri.batch = m.batch
      and ri.expiry_date is not null
  ) as oldest_expiry
from public.stock_movements m
group by m.company_id, m.product_id, m.batch
having sum(m.quantity_delta) <> 0;

grant select on public.stock_balance_v to authenticated;
