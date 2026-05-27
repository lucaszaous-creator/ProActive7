-- =====================================================================
-- 0063_suppliers_property_write.sql
-- Property (gerente da unidade) precisa criar fornecedor na hora do
-- recebimento — não dá pra esperar a nutri cadastrar. As policies de
-- INSERT/UPDATE de `suppliers` agora aceitam qualquer usuário cuja
-- organization_id case com a do fornecedor (resolvido via
-- current_organization_id(), que para property vem da empresa dele
-- via o trigger sync_profile_org_from_company).
--
-- Grupos continuam restritos a nutri/admin (estruturação ANVISA é
-- decisão técnica).
-- =====================================================================

drop policy if exists suppliers_insert on public.suppliers;
drop policy if exists suppliers_update on public.suppliers;

create policy suppliers_insert on public.suppliers for insert to authenticated
  with check (
    is_platform_admin()
    OR organization_id = current_organization_id()
  );

create policy suppliers_update on public.suppliers for update to authenticated
  using (
    is_platform_admin()
    OR organization_id = current_organization_id()
  )
  with check (
    is_platform_admin()
    OR organization_id = current_organization_id()
  );
