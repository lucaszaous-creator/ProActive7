-- Wave 15 / Item C: tabela de auditoria + trigger generico.
-- Aplica em tabelas criticas onde a fiscalizacao sanitaria pode
-- pedir trilha de quem mudou o que: produtos, visitas tecnicas,
-- nao-conformidades, ASOs de manipuladores, documentos e empresas.

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  row_id uuid,
  action text not null check (action in ('INSERT','UPDATE','DELETE')),
  old_data jsonb,
  new_data jsonb,
  user_id uuid references public.profiles(id) on delete set null,
  user_email text,
  created_at timestamptz not null default now()
);

create index audit_log_table_row_idx
  on public.audit_log (table_name, row_id, created_at desc);
create index audit_log_created_idx
  on public.audit_log (created_at desc);
create index audit_log_user_idx
  on public.audit_log (user_id, created_at desc);

alter table public.audit_log enable row level security;

-- Master ve tudo; trigger eh SECURITY DEFINER entao escreve livre.
create policy "audit_log_master_select" on public.audit_log
  for select using (public.is_master());

-- Funcao de trigger generica.
create or replace function public.log_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_row_id uuid;
begin
  -- pega email para snapshot (sobrevive a delete do profile)
  if v_user_id is not null then
    select email into v_user_email from public.profiles where id = v_user_id;
  end if;

  -- extrai id da row (assume coluna 'id' uuid)
  if tg_op = 'DELETE' then
    v_row_id := (to_jsonb(old)->>'id')::uuid;
  else
    v_row_id := (to_jsonb(new)->>'id')::uuid;
  end if;

  insert into public.audit_log (
    table_name, row_id, action, old_data, new_data,
    user_id, user_email
  ) values (
    tg_table_name,
    v_row_id,
    tg_op,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end,
    v_user_id,
    v_user_email
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

-- Aplica em tabelas criticas.
create trigger audit_products
  after insert or update or delete on public.products
  for each row execute function public.log_changes();

create trigger audit_audits
  after insert or update or delete on public.audits
  for each row execute function public.log_changes();

create trigger audit_non_conformities
  after insert or update or delete on public.non_conformities
  for each row execute function public.log_changes();

create trigger audit_manipulator_asos
  after insert or update or delete on public.manipulator_asos
  for each row execute function public.log_changes();

create trigger audit_documents
  after insert or update or delete on public.documents
  for each row execute function public.log_changes();

create trigger audit_companies
  after insert or update or delete on public.companies
  for each row execute function public.log_changes();
