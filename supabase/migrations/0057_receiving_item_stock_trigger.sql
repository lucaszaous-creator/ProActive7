-- =====================================================================
-- 0057_receiving_item_stock_trigger.sql
-- Entrada automática no estoque a partir de receiving_items aceitos.
-- Se um item passa de aceito → rejeitado depois, grava descarte
-- compensatório (mantém histórico, não apaga a entrada).
-- =====================================================================

create or replace function public.fn_receiving_item_to_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
  v_moved_at   timestamptz;
  v_moved_by   uuid;
begin
  select r.company_id, r.received_at, r.received_by
    into v_company_id, v_moved_at, v_moved_by
  from public.receivings r
  where r.id = new.receiving_id;

  if tg_op = 'INSERT' then
    if new.rejected = false then
      insert into public.stock_movements (
        company_id, product_id, batch, quantity_delta, unit,
        kind, reason, reference_type, reference_id, moved_at, moved_by
      ) values (
        v_company_id, new.product_id, new.batch, new.quantity, new.unit,
        'entrada', null, 'receiving_item', new.id, v_moved_at, v_moved_by
      );
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    -- aceito -> rejeitado: insere descarte compensatório
    if old.rejected = false and new.rejected = true then
      insert into public.stock_movements (
        company_id, product_id, batch, quantity_delta, unit,
        kind, reason, reference_type, reference_id, moved_at, moved_by
      ) values (
        v_company_id, new.product_id, new.batch, -new.quantity, new.unit,
        'descarte',
        coalesce('Item rejeitado: ' || new.rejection_reason, 'Item rejeitado no recebimento'),
        'receiving_item', new.id, now(), v_moved_by
      );
    end if;
    -- rejeitado -> aceito: entrada tardia
    if old.rejected = true and new.rejected = false then
      insert into public.stock_movements (
        company_id, product_id, batch, quantity_delta, unit,
        kind, reason, reference_type, reference_id, moved_at, moved_by
      ) values (
        v_company_id, new.product_id, new.batch, new.quantity, new.unit,
        'entrada', 'Item aceito após reavaliação',
        'receiving_item', new.id, now(), v_moved_by
      );
    end if;
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_receiving_item_to_stock on public.receiving_items;

create trigger trg_receiving_item_to_stock
  after insert or update on public.receiving_items
  for each row execute function public.fn_receiving_item_to_stock();

-- Função só roda como trigger; não exponha como RPC.
revoke execute on function public.fn_receiving_item_to_stock() from public, anon, authenticated;
