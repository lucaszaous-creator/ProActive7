-- =====================================================================
-- 0105_profiles_hide_platform_admin.sql — nutri/gerente não veem nem
-- alteram perfis de administrador da plataforma
-- ---------------------------------------------------------------------
-- Reportado pelo cliente: a nutricionista via o platform_admin na lista
-- de usuários (o perfil do admin pode carregar organization_id da org
-- dela) e a UI oferecia editar/trocar senha. A troca de senha sempre foi
-- bloqueada na Edge admin-update-user e o trigger guard (0006/0045) já
-- impedia escalar role/company/org/active — mas a linha do admin ainda
-- era visível (e o full_name editável) via PostgREST.
--
-- Esta migration fecha isso na RLS:
--   * SELECT: o ramo da nutri e o do gerente deixam de retornar perfis
--     platform_admin/master. O ramo do gerente já era só company_id da
--     empresa dele; ganha o mesmo cinto e suspensório.
--   * UPDATE: o ramo da nutri passa a alcançar apenas property e
--     property_manager (espelha a Edge admin-update-user); o do gerente
--     continua só role='property'.
-- Cada usuário segue vendo/atualizando a própria linha (o guard limita
-- o update às colunas não sensíveis).
-- =====================================================================

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (
    public.is_platform_admin()
    OR (
      public.is_nutritionist()
      AND organization_id = public.current_organization_id()
      AND role NOT IN ('platform_admin', 'master')
    )
    OR (
      public.is_property_manager()
      AND company_id = public.current_company_id()
      AND role NOT IN ('platform_admin', 'master')
    )
    OR id = (select auth.uid())
  );

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (
    public.is_platform_admin()
    OR (
      public.is_nutritionist()
      AND organization_id = public.current_organization_id()
      AND role IN ('property', 'property_manager')
    )
    OR (
      public.is_property_manager()
      AND company_id = public.current_company_id()
      AND role = 'property'
    )
    OR id = (select auth.uid())
  )
  with check (
    public.is_platform_admin()
    OR (
      public.is_nutritionist()
      AND organization_id = public.current_organization_id()
      AND role IN ('property', 'property_manager')
    )
    OR (
      public.is_property_manager()
      AND company_id = public.current_company_id()
      AND role = 'property'
    )
    OR id = (select auth.uid())
  );
