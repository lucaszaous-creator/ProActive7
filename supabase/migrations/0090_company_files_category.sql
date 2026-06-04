-- =====================================================================
-- 0090_company_files_category.sql
--
-- A aba "Documentos" do sistema deixa de ser editor de texto (markdown)
-- e passa a ser upload de arquivos por categoria — pedido da cliente:
-- "ao invés de editar, carregar os documentos de cada estabelecimento;
-- desde os que já estão cadastrados (POPs/Manual) até ASO e o que a
-- empresa de controle de pragas entrega".
--
-- Adiciona `category` em company_files para organizar os uploads em
-- grupos (Manual, POPs, ASO, controle de pragas, alvarás, outros).
-- NULL = "outros". Texto livre (sem check) para não travar evolução.
-- =====================================================================

alter table public.company_files
  add column if not exists category text;

create index if not exists idx_company_files_category
  on public.company_files (company_id, category)
  where deleted_at is null;

comment on column public.company_files.category is
  'Categoria do documento (mbp, pop_*, aso, pragas, alvara, outro...). NULL = outros.';
