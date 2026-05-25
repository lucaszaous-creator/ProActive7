-- Wave 15 / Item F: soft-delete em entidades criticas.
-- Adiciona deleted_at + atualiza policies SELECT para filtrar
-- registros deletados. O master tem rota /admin/lixeira que ve
-- tudo (incluindo deletados) e pode restaurar ou apagar definitivo.
-- Cleanup fisico apos 30 dias via cron (migration 0038).

alter table public.companies         add column if not exists deleted_at timestamptz;
alter table public.products          add column if not exists deleted_at timestamptz;
alter table public.audits            add column if not exists deleted_at timestamptz;
alter table public.manipulators      add column if not exists deleted_at timestamptz;
alter table public.documents         add column if not exists deleted_at timestamptz;

create index if not exists companies_deleted_at_idx     on public.companies (deleted_at) where deleted_at is not null;
create index if not exists products_deleted_at_idx      on public.products (deleted_at) where deleted_at is not null;
create index if not exists audits_deleted_at_idx        on public.audits (deleted_at) where deleted_at is not null;
create index if not exists manipulators_deleted_at_idx  on public.manipulators (deleted_at) where deleted_at is not null;
create index if not exists documents_deleted_at_idx     on public.documents (deleted_at) where deleted_at is not null;

-- Atualizar policies SELECT para filtrar deleted_at, EXCETO para o
-- master vendo /admin/lixeira (vai consultar a tabela direto sem
-- passar pelas policies normais — vamos usar uma view ou bypass via
-- SECURITY DEFINER para o master). Estrategia simples: o master ve
-- TUDO direto (policy nao filtra deleted_at quando is_master); o
-- frontend filtra com .is('deleted_at', null) nas pages normais.

-- companies
drop policy if exists "companies_select" on public.companies;
create policy "companies_select" on public.companies
  for select
  using (public.is_master() or (id = public.current_company_id() and deleted_at is null));

-- products
drop policy if exists "products_select" on public.products;
create policy "products_select" on public.products
  for select
  using (
    (public.is_master() or company_id = public.current_company_id())
    and (public.is_master() or deleted_at is null)
  );

-- audits
drop policy if exists "audits_select" on public.audits;
create policy "audits_select" on public.audits
  for select
  using (
    (public.is_master() or company_id = public.current_company_id())
    and (public.is_master() or deleted_at is null)
  );

-- manipulators
drop policy if exists "manipulators_select" on public.manipulators;
create policy "manipulators_select" on public.manipulators
  for select
  using (
    (public.is_master() or company_id = public.current_company_id())
    and (public.is_master() or deleted_at is null)
  );

-- documents
drop policy if exists "documents_select" on public.documents;
create policy "documents_select" on public.documents
  for select
  using (
    (public.is_master() or company_id = public.current_company_id())
    and (public.is_master() or deleted_at is null)
  );

-- Helper: marcar como deletado. RLS de update ja restringe quem pode.
create or replace function public.soft_delete_company(p_id uuid)
returns boolean
language plpgsql
security invoker
as $$
declare
  v_count int;
begin
  update public.companies set deleted_at = now()
  where id = p_id and deleted_at is null;
  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

create or replace function public.restore_company(p_id uuid)
returns boolean
language plpgsql
security invoker
as $$
declare
  v_count int;
begin
  update public.companies set deleted_at = null
  where id = p_id and deleted_at is not null;
  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;
