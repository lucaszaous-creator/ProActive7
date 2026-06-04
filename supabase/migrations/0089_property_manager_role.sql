-- =====================================================================
-- 0089_property_manager_role.sql
--
-- Nova role `property_manager`: "gerente da empresa". Mesmo escopo
-- visual do property (uma empresa) mas com permissão de gerenciar
-- os usuários `property` dessa mesma empresa. Continua NÃO sendo
-- platform_admin nem nutritionist; não vê outras empresas nem outras
-- organizações.
--
-- Aplicada em duas partes:
--   1) ALTER TYPE adiciona o valor 'property_manager' ao enum
--      user_role (precisa estar comprometido antes de ser usado em
--      checks / policies — Postgres não permite usar valor de enum
--      adicionado na mesma transaction).
--   2) Helper `is_property_manager()` + ampliação das policies de
--      profiles (SELECT e UPDATE) para enxergar/gerenciar profiles
--      `property` da mesma empresa.
-- =====================================================================

-- ---------- 1) Enum value ----------

alter type public.user_role add value if not exists 'property_manager';

-- ---------- 2) Helper + RLS ----------

create or replace function public.is_property_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'property_manager' from public.profiles where id = auth.uid()),
    false
  );
$$;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (
    public.is_platform_admin()
    OR (public.is_nutritionist() AND organization_id = public.current_organization_id())
    OR (public.is_property_manager() AND company_id = public.current_company_id())
    OR id = (select auth.uid())
  );

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (
    public.is_platform_admin()
    OR (public.is_nutritionist() AND organization_id = public.current_organization_id())
    OR (
      public.is_property_manager()
      AND company_id = public.current_company_id()
      AND role = 'property'
    )
    OR id = (select auth.uid())
  )
  with check (
    public.is_platform_admin()
    OR (public.is_nutritionist() AND organization_id = public.current_organization_id())
    OR (
      public.is_property_manager()
      AND company_id = public.current_company_id()
      AND role = 'property'
    )
    OR id = (select auth.uid())
  );

comment on function public.is_property_manager() is
  'true se o usuario corrente eh property_manager (gerente da propria empresa).';
