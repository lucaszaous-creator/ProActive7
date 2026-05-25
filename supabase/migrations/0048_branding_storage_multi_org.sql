-- =====================================================================
-- 0048_branding_storage_multi_org.sql
-- Atualiza as policies do bucket 'branding' (logos por empresa) para
-- incluir o role nutritionist no padrao 3-camadas. Antes eram master-only,
-- impedindo o nutricionista de subir o logo das proprias empresas.
-- =====================================================================

drop policy if exists branding_storage_insert on storage.objects;
drop policy if exists branding_storage_update on storage.objects;
drop policy if exists branding_storage_delete on storage.objects;

create policy branding_storage_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'branding'
    and (
      is_platform_admin()
      OR (
        is_nutritionist()
        AND (storage.foldername(name))[1] IN (
          SELECT id::text FROM public.companies
          WHERE organization_id = current_organization_id()
        )
      )
      OR (storage.foldername(name))[1] = current_company_id()::text
    )
  );

create policy branding_storage_update
  on storage.objects for update to authenticated
  using (
    bucket_id = 'branding'
    and (
      is_platform_admin()
      OR (
        is_nutritionist()
        AND (storage.foldername(name))[1] IN (
          SELECT id::text FROM public.companies
          WHERE organization_id = current_organization_id()
        )
      )
      OR (storage.foldername(name))[1] = current_company_id()::text
    )
  )
  with check (
    bucket_id = 'branding'
    and (
      is_platform_admin()
      OR (
        is_nutritionist()
        AND (storage.foldername(name))[1] IN (
          SELECT id::text FROM public.companies
          WHERE organization_id = current_organization_id()
        )
      )
      OR (storage.foldername(name))[1] = current_company_id()::text
    )
  );

create policy branding_storage_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'branding'
    and (
      is_platform_admin()
      OR (
        is_nutritionist()
        AND (storage.foldername(name))[1] IN (
          SELECT id::text FROM public.companies
          WHERE organization_id = current_organization_id()
        )
      )
      OR (storage.foldername(name))[1] = current_company_id()::text
    )
  );
