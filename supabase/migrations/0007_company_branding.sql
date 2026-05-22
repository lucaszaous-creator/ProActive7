-- =====================================================================
-- 0007_company_branding.sql  —  Logo e configuracoes da etiqueta por
-- empresa.
-- ---------------------------------------------------------------------
-- Adiciona logo_path (referencia ao bucket "branding") e label_settings
-- (jsonb com flags de exibicao: show_phone, show_address, etc.).
-- Cria o bucket publico "branding" para que o logo possa ser embutido
-- inclusive em paginas anonimas (QR de rastreabilidade).
-- =====================================================================

alter table public.companies
  add column if not exists logo_path text,
  add column if not exists label_settings jsonb not null default '{}'::jsonb;

insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

-- Caminho: {company_id}/logo.{ext}. Leitura publica (bucket marcado como
-- public ja exporia, mas mantemos explicito); escrita restrita ao master
-- ou a usuarios da propria empresa.

create policy branding_storage_select on storage.objects
  for select to anon, authenticated
  using ( bucket_id = 'branding' );

create policy branding_storage_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'branding'
    and (
      public.is_master()
      or (storage.foldername(name))[1] = public.current_company_id()::text
    )
  );

create policy branding_storage_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'branding'
    and (
      public.is_master()
      or (storage.foldername(name))[1] = public.current_company_id()::text
    )
  )
  with check (
    bucket_id = 'branding'
    and (
      public.is_master()
      or (storage.foldername(name))[1] = public.current_company_id()::text
    )
  );

create policy branding_storage_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'branding'
    and (
      public.is_master()
      or (storage.foldername(name))[1] = public.current_company_id()::text
    )
  );
