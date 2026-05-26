-- =====================================================================
-- 0055_stock_movements.sql — Movimentações de estoque (fonte da verdade)
-- Entradas vêm automáticas do recebimento (trigger em 0057). Saídas
-- manuais via UI. Não permite edição: correção é nova movimentação
-- com kind='ajuste'.
-- =====================================================================

create table if not exists public.stock_movements (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  product_id      uuid not null references public.products(id) on delete restrict,
  batch           text not null,
  quantity_delta  numeric(12,3) not null,
  unit            text not null check (unit in ('kg','g','un','L','mL','cx')),
  kind            text not null check (kind in ('entrada','saida','ajuste','descarte','vencimento')),
  reason          text,
  reference_type  text check (reference_type in ('receiving_item','manual','production')),
  reference_id    uuid,
  moved_at        timestamptz not null default now(),
  moved_by        uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  constraint stock_movements_delta_sign check (
    (kind = 'entrada'    and quantity_delta > 0) or
    (kind = 'saida'      and quantity_delta < 0) or
    (kind = 'descarte'   and quantity_delta < 0) or
    (kind = 'vencimento' and quantity_delta < 0) or
    (kind = 'ajuste'     and quantity_delta <> 0)
  )
);

create index if not exists stock_movements_company_product_batch_idx
  on public.stock_movements (company_id, product_id, batch);

create index if not exists stock_movements_company_moved_idx
  on public.stock_movements (company_id, moved_at desc);

alter table public.stock_movements enable row level security;

create policy stock_movements_select on public.stock_movements for select to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );

create policy stock_movements_insert on public.stock_movements for insert to authenticated
  with check (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );

-- Movimentos são imutáveis para property. Nutri/admin pode corrigir em
-- caso excepcional (mas a prática é registrar 'ajuste' como nova linha).
create policy stock_movements_update on public.stock_movements for update to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
  )
  with check (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
  );

create policy stock_movements_delete on public.stock_movements for delete to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
  );
