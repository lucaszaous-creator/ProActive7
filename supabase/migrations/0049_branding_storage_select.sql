-- =====================================================================
-- 0049_branding_storage_select.sql
-- Adiciona policy de SELECT para o bucket 'branding'. Sem ela, o
-- supabase-js falha o upsert (precisa ler antes de decidir INSERT/UPDATE)
-- e o erro vem mascarado como 'new row violates RLS' no INSERT/UPDATE
-- — mesmo que as policies de write estejam corretas.
-- =====================================================================

drop policy if exists branding_storage_select on storage.objects;

create policy branding_storage_select
  on storage.objects for select to authenticated
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
