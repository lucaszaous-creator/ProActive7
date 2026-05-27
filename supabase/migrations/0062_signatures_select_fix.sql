-- =====================================================================
-- 0062_signatures_select_fix.sql
-- A 0061 atualizou INSERT/UPDATE/DELETE no bucket signatures, mas o
-- SELECT continuou usando is_master() — então o upload com upsert:true
-- (frontend usa) falhava porque o Storage faz um SELECT prévio para
-- checar se o objeto existe, e o nutri/property batia em RLS no SELECT.
--
-- Esta migration substitui a policy de SELECT pelo mesmo padrão
-- role-aware das demais operações.
-- =====================================================================

drop policy if exists signatures_select_company on storage.objects;

create policy signatures_select_scoped on storage.objects
  for select to authenticated
  using (
    bucket_id = 'signatures'
    AND (
      public.is_platform_admin()
      OR (
        public.is_nutritionist()
        AND (storage.foldername(name))[1] IN (
          SELECT id::text FROM public.companies
          WHERE organization_id = public.current_organization_id()
        )
      )
      OR (storage.foldername(name))[1] = (public.current_company_id())::text
    )
  );
