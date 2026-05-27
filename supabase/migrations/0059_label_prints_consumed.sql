-- =====================================================================
-- 0059_label_prints_consumed.sql
-- Permite baixar uma etiqueta (consumed_*) — usado pela tela Produção
-- para tirar o lote da vista de Validades sem precisar esperar vencer.
-- =====================================================================

alter table public.label_prints
  add column if not exists consumed_at timestamptz;

alter table public.label_prints
  add column if not exists consumed_by uuid references public.profiles(id) on delete set null;

alter table public.label_prints
  add column if not exists consumed_reason text
    check (consumed_reason in ('producao','descarte','vencimento'));

create index if not exists label_prints_active_idx
  on public.label_prints (company_id, expiry_at)
  where consumed_at is null;

-- Property pode atualizar só p/ marcar consumo, e só em etiquetas
-- recentes (até 7 dias após impressão); nutri/admin sem restrição.
drop policy if exists label_prints_update on public.label_prints;

create policy label_prints_update on public.label_prints for update to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR (company_id = current_company_id() AND printed_at > now() - interval '7 days')
  )
  with check (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR (company_id = current_company_id() AND printed_at > now() - interval '7 days')
  );
