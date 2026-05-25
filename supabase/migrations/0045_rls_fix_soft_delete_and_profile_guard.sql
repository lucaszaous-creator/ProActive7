-- =====================================================================
-- 0045_rls_fix_soft_delete_and_profile_guard.sql
-- Corrige duas regressoes introduzidas em 0043:
-- (1) policies SELECT de companies/products/audits/manipulators/documents
--     pararam de filtrar `deleted_at IS NULL` para nao-admins, fazendo
--     com que itens da lixeira voltassem a aparecer no UI;
-- (2) guard de UPDATE em profiles nao protege `organization_id`,
--     permitindo que um property user escape do isolamento da org.
-- =====================================================================

-- ---------- (1) Restaurar filtro de soft-delete nas policies SELECT ----------
-- Padrao: platform_admin ve tudo (inclusive deletados, para restaurar via /admin/lixeira).
--          nutritionist e property nao veem registros deletados.

drop policy if exists companies_select on public.companies;
create policy companies_select on public.companies for select to authenticated
  using (
    is_platform_admin()
    OR (
      deleted_at IS NULL
      AND (
        (is_nutritionist() AND organization_id = current_organization_id())
        OR id = current_company_id()
      )
    )
  );

drop policy if exists products_select on public.products;
create policy products_select on public.products for select to authenticated
  using (
    is_platform_admin()
    OR (
      deleted_at IS NULL
      AND (
        (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
        OR company_id = current_company_id()
      )
    )
  );

drop policy if exists audits_select on public.audits;
create policy audits_select on public.audits for select to authenticated
  using (
    is_platform_admin()
    OR (
      deleted_at IS NULL
      AND (
        (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
        OR company_id = current_company_id()
      )
    )
  );

drop policy if exists manipulators_select on public.manipulators;
create policy manipulators_select on public.manipulators for select to authenticated
  using (
    is_platform_admin()
    OR (
      deleted_at IS NULL
      AND (
        (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
        OR company_id = current_company_id()
      )
    )
  );

drop policy if exists documents_select on public.documents;
create policy documents_select on public.documents for select to authenticated
  using (
    is_platform_admin()
    OR (
      deleted_at IS NULL
      AND (
        (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
        OR company_id = current_company_id()
      )
    )
  );

-- ---------- (2) Proteger profiles.organization_id no trigger de UPDATE ----------
create or replace function public.guard_profiles_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_master() then
    new.role            := old.role;
    new.company_id      := old.company_id;
    new.organization_id := old.organization_id;
    new.active          := old.active;
  end if;
  return new;
end;
$$;
