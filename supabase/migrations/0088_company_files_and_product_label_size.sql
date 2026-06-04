-- =====================================================================
-- 0088_company_files_and_product_label_size.sql
--
-- Duas adições pedidas pela cliente no review de pré-lançamento:
--
-- 1) `company_files`: documentos arbitrários por empresa (upload livre)
--    — a aba "Documentos" do CLAUDE.md hoje é só Manual de Boas Práticas
--    e POPs (markdown). A cliente quer poder subir PDF/imagem de
--    qualquer documento operacional (alvará, contrato, comprovante,
--    etc.) por empresa, nomeá-lo e abrir depois.
--
-- 2) `products.default_label_size`: tamanho de etiqueta padrão por
--    produto. O wizard de impressão deixou de oferecer o seletor (UI
--    já removida); o tamanho passa a vir do cadastro do produto que a
--    nutri faz uma vez. Default '60x60' por compatibilidade com o que
--    o wizard já usava.
-- =====================================================================

-- ---------- 1) company_files ----------

create table if not exists public.company_files (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  title         text not null,
  description   text,
  -- Caminho no bucket storage `company-docs`. Padrão: {company_id}/{uuid}.{ext}
  file_path     text not null,
  mime_type     text,
  size_bytes    bigint,
  uploaded_by   uuid references public.profiles(id) on delete set null,
  uploaded_at   timestamptz not null default now(),
  deleted_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_company_files_company on public.company_files(company_id) where deleted_at is null;
create index if not exists idx_company_files_uploaded_at on public.company_files(uploaded_at desc) where deleted_at is null;

alter table public.company_files enable row level security;

-- SELECT: platform_admin tudo; nutri = empresas da org; property = própria empresa
create policy company_files_select on public.company_files for select to authenticated
  using (
    public.is_platform_admin()
    OR (public.is_nutritionist() AND company_id IN (
      select id from public.companies where organization_id = public.current_organization_id()
    ))
    OR company_id = public.current_company_id()
  );

-- INSERT: mesma regra (cozinha pode subir documento, ex. comprovante)
create policy company_files_insert on public.company_files for insert to authenticated
  with check (
    public.is_platform_admin()
    OR (public.is_nutritionist() AND company_id IN (
      select id from public.companies where organization_id = public.current_organization_id()
    ))
    OR company_id = public.current_company_id()
  );

-- UPDATE: nutri+admin (apenas renomear/anotar); property só os próprios
create policy company_files_update on public.company_files for update to authenticated
  using (
    public.is_platform_admin()
    OR (public.is_nutritionist() AND company_id IN (
      select id from public.companies where organization_id = public.current_organization_id()
    ))
    OR (company_id = public.current_company_id() AND uploaded_by = auth.uid())
  )
  with check (
    public.is_platform_admin()
    OR (public.is_nutritionist() AND company_id IN (
      select id from public.companies where organization_id = public.current_organization_id()
    ))
    OR (company_id = public.current_company_id() AND uploaded_by = auth.uid())
  );

-- DELETE soft (a UI seta deleted_at via UPDATE). Hard delete: só admin/nutri.
create policy company_files_delete on public.company_files for delete to authenticated
  using (
    public.is_platform_admin()
    OR (public.is_nutritionist() AND company_id IN (
      select id from public.companies where organization_id = public.current_organization_id()
    ))
  );

-- updated_at automático. `set search_path = public` evita o WARN
-- "function_search_path_mutable" do advisor de segurança do Supabase.
create or replace function public.tg_company_files_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_company_files_updated_at on public.company_files;
create trigger trg_company_files_updated_at
  before update on public.company_files
  for each row execute function public.tg_company_files_updated_at();

-- ---------- 2) Storage bucket `company-docs` ----------

insert into storage.buckets (id, name, public)
values ('company-docs', 'company-docs', false)
on conflict (id) do nothing;

-- Path convention: {company_id}/{uuid}.{ext}
-- Reusa o mesmo modelo das policies de signatures/pest-docs.

drop policy if exists company_docs_select on storage.objects;
drop policy if exists company_docs_insert on storage.objects;
drop policy if exists company_docs_update on storage.objects;
drop policy if exists company_docs_delete on storage.objects;

create policy company_docs_select on storage.objects for select to authenticated
  using (
    bucket_id = 'company-docs'
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

create policy company_docs_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'company-docs'
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

create policy company_docs_update on storage.objects for update to authenticated
  using (
    bucket_id = 'company-docs'
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
    bucket_id = 'company-docs'
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

create policy company_docs_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'company-docs'
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

-- ---------- 3) products.default_label_size ----------

alter table public.products
  add column if not exists default_label_size text;

alter table public.products
  drop constraint if exists products_default_label_size_check;

alter table public.products
  add constraint products_default_label_size_check
  check (
    default_label_size is null
    OR default_label_size IN ('60x60','60x40','80x60','50x30')
  );

comment on column public.products.default_label_size is
  'Tamanho padrão da etiqueta deste produto (60x60, 60x40, 80x60, 50x30). NULL = usa o padrão do sistema (60x60). Cadastrado pela nutri.';
