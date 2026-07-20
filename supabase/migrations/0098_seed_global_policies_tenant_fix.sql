-- =====================================================================
-- 0098_seed_global_policies_tenant_fix.sql
--
-- CORRECAO DE SEGURANCA (cross-tenant write). Tres achados do review
-- pre-producao:
--
-- (1) CRITICO — As policies criadas em 0052 para templates globais e
--     catalogo seed terminavam em "OR is_global = false" / "OR is_seed
--     = false". Policies permissivas sao combinadas com OR, entao esse
--     ramo liberava INSERT e UPDATE em `products`, `audit_templates` e
--     `checklist_templates` de QUALQUER empresa/organizacao para
--     QUALQUER usuario autenticado (bastava a linha nao ser seed/global).
--     Um property da org A podia renomear produtos ou adulterar
--     templates de auditoria da org B. As policies passam a cobrir
--     APENAS o caso global/seed (platform_admin); linhas normais ficam
--     100% com as policies de tenant da 0043/0045.
--
-- (2) documents_update (0043): o WITH CHECK do ramo do property era so
--     "status <> 'published'", sem amarrar company_id — um property
--     podia mover um documento da propria empresa para outra empresa/org
--     (reatribuindo company_id). Agora o ramo exige tambem
--     company_id = current_company_id().
--
-- (3) Bucket `pest-docs` (0027): as policies de storage nunca receberam
--     o ramo da nutricionista (padrao 0043/0061/0088). A nutri tomava
--     erro de RLS ao anexar/abrir comprovante de dedetizacao das
--     empresas da propria org. Policies reescritas no padrao role-aware.
-- =====================================================================

-- ---------- (1a) products ----------

drop policy if exists products_seed_insert on public.products;
create policy products_seed_insert on public.products for insert to authenticated
  with check (is_seed = true AND public.is_platform_admin());

drop policy if exists products_seed_update on public.products;
create policy products_seed_update on public.products for update to authenticated
  using (is_seed = true AND public.is_platform_admin())
  with check (is_seed = true AND public.is_platform_admin());

-- ---------- (1b) audit_templates ----------

drop policy if exists audit_templates_global_insert on public.audit_templates;
create policy audit_templates_global_insert on public.audit_templates for insert to authenticated
  with check (is_global = true AND public.is_platform_admin());

drop policy if exists audit_templates_global_update on public.audit_templates;
create policy audit_templates_global_update on public.audit_templates for update to authenticated
  using (is_global = true AND public.is_platform_admin())
  with check (is_global = true AND public.is_platform_admin());

-- ---------- (1c) checklist_templates ----------

drop policy if exists checklist_templates_global_insert on public.checklist_templates;
create policy checklist_templates_global_insert on public.checklist_templates for insert to authenticated
  with check (is_global = true AND public.is_platform_admin());

drop policy if exists checklist_templates_global_update on public.checklist_templates;
create policy checklist_templates_global_update on public.checklist_templates for update to authenticated
  using (is_global = true AND public.is_platform_admin())
  with check (is_global = true AND public.is_platform_admin());

-- ---------- (2) documents_update: amarra company_id no ramo property ----------

drop policy if exists documents_update on public.documents;
create policy documents_update on public.documents for update to authenticated
  using (
    public.is_platform_admin()
    OR (public.is_nutritionist() AND company_id IN (
      SELECT id FROM public.companies WHERE organization_id = public.current_organization_id()
    ))
    OR company_id = public.current_company_id()
  )
  with check (
    -- platform_admin e nutricionista podem publicar; property nao publica
    -- e nao pode reatribuir o documento para outra empresa.
    public.is_platform_admin()
    OR (public.is_nutritionist() AND company_id IN (
      SELECT id FROM public.companies WHERE organization_id = public.current_organization_id()
    ))
    OR (company_id = public.current_company_id() AND status <> 'published')
  );

-- ---------- (3) pest-docs: policies role-aware (admin / nutri org / property) ----------

drop policy if exists "pest_docs_select" on storage.objects;
create policy "pest_docs_select" on storage.objects for select to authenticated
  using (
    bucket_id = 'pest-docs'
    AND (
      public.is_platform_admin()
      OR (public.is_nutritionist() AND (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.companies
        WHERE organization_id = public.current_organization_id()
      ))
      OR (storage.foldername(name))[1] = (public.current_company_id())::text
    )
  );

drop policy if exists "pest_docs_insert" on storage.objects;
create policy "pest_docs_insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'pest-docs'
    AND (
      public.is_platform_admin()
      OR (public.is_nutritionist() AND (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.companies
        WHERE organization_id = public.current_organization_id()
      ))
      OR (storage.foldername(name))[1] = (public.current_company_id())::text
    )
  );

drop policy if exists "pest_docs_update" on storage.objects;
create policy "pest_docs_update" on storage.objects for update to authenticated
  using (
    bucket_id = 'pest-docs'
    AND (
      public.is_platform_admin()
      OR (public.is_nutritionist() AND (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.companies
        WHERE organization_id = public.current_organization_id()
      ))
      OR (storage.foldername(name))[1] = (public.current_company_id())::text
    )
  )
  with check (
    bucket_id = 'pest-docs'
    AND (
      public.is_platform_admin()
      OR (public.is_nutritionist() AND (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.companies
        WHERE organization_id = public.current_organization_id()
      ))
      OR (storage.foldername(name))[1] = (public.current_company_id())::text
    )
  );

drop policy if exists "pest_docs_delete" on storage.objects;
create policy "pest_docs_delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'pest-docs'
    AND (
      public.is_platform_admin()
      OR (public.is_nutritionist() AND (storage.foldername(name))[1] IN (
        SELECT id::text FROM public.companies
        WHERE organization_id = public.current_organization_id()
      ))
      OR (storage.foldername(name))[1] = (public.current_company_id())::text
    )
  );
