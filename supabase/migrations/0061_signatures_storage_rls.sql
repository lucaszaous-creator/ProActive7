-- =====================================================================
-- 0061_signatures_storage_rls.sql
-- O bucket `signatures` exigia is_master() para INSERT/UPDATE/DELETE,
-- então property (que finaliza a visita técnica e assina) batia em
-- "new row violates row-level security policy" ao fazer upload.
-- Substitui as policies por versões role-aware: property na própria
-- empresa, nutri em qualquer empresa da org, platform_admin sem limite.
-- =====================================================================

drop policy if exists signatures_master_insert on storage.objects;
drop policy if exists signatures_master_update on storage.objects;
drop policy if exists signatures_master_delete on storage.objects;

create policy signatures_insert_scoped on storage.objects
  for insert to authenticated
  with check (
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

create policy signatures_update_scoped on storage.objects
  for update to authenticated
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
  )
  with check (
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

create policy signatures_delete_scoped on storage.objects
  for delete to authenticated
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
