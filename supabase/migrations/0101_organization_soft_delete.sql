-- =====================================================================
-- 0101_organization_soft_delete.sql
--
-- Exclusao de ORGANIZACAO (hoje so existe "suspender"), seguindo o mesmo
-- modelo ja usado para empresas (0037/0038): soft delete -> lixeira ->
-- exclusao definitiva.
--
-- Diferencas em relacao a empresa, e o porque de tudo passar por RPC:
--
--  1. A FK `companies.organization_id` e ON DELETE SET NULL. Um DELETE
--     cru na organizacao NAO leva as empresas junto — deixaria empresas
--     e usuarios orfaos (organization_id null), invisiveis para a nutri
--     mas vivos no banco, com etiquetas/fotos/ASOs intactos. Por isso a
--     exclusao definitiva NUNCA acontece por PostgREST: ela e feita pela
--     Edge Function `admin-delete-organization` (service role), que apaga
--     Storage + usuarios do Auth + empresas + a org, nessa ordem.
--
--  2. `profiles.company_id` e ON DELETE RESTRICT (0001). Enquanto existir
--     um usuario ligado a empresa, a empresa nao pode ser apagada — o que
--     hoje trava silenciosamente o cron de limpeza (ver secao 6).
--
--  3. O soft delete precisa ser atomico com o cascade nas empresas da org,
--     e precisa registrar audit_log. Isso e um UPDATE multi-tabela: RPC.
--
-- Quem pode: apenas platform_admin. A nutri NAO exclui a propria org
-- (autoexclusao de conta e outro fluxo, ainda no roadmap LGPD).
-- =====================================================================

-- ---------- 1. Indice (mesmo padrao das outras tabelas soft-deletaveis) ----------

create index if not exists organizations_deleted_at_idx
  on public.organizations (deleted_at) where deleted_at is not null;

-- ---------- 2. RLS: org na lixeira some para quem nao e platform_admin ----------
-- Sem isso a nutri continuaria enxergando (e editando) a propria org
-- depois de excluida. O platform_admin continua vendo tudo, porque e ele
-- quem opera a lixeira.

drop policy if exists orgs_select on public.organizations;
create policy orgs_select on public.organizations for select to authenticated
  using (
    public.is_platform_admin()
    OR (id = public.current_organization_id() and deleted_at is null)
  );

drop policy if exists orgs_update on public.organizations;
create policy orgs_update on public.organizations for update to authenticated
  using (
    public.is_platform_admin()
    OR (public.is_nutritionist() and id = public.current_organization_id() and deleted_at is null)
  )
  with check (
    public.is_platform_admin()
    OR (public.is_nutritionist() and id = public.current_organization_id() and deleted_at is null)
  );

-- DELETE cru so e permitido no estado final e inofensivo: org ja na
-- lixeira e sem nenhuma empresa/usuario pendurado. Qualquer outro caso
-- deixaria orfaos — quem faz a exclusao completa e a Edge Function
-- (service role, que ignora RLS de proposito).
drop policy if exists orgs_delete on public.organizations;
create policy orgs_delete on public.organizations for delete to authenticated
  using (
    public.is_platform_admin()
    and deleted_at is not null
    and not exists (
      select 1 from public.companies c where c.organization_id = organizations.id
    )
    and not exists (
      select 1 from public.profiles p where p.organization_id = organizations.id
    )
  );

-- ---------- 3. Guard: nutri nao mexe em deleted_at ----------
-- orgs_update deixa a nutri editar a propria org (logo/cor/contato). Sem
-- congelar deleted_at ela poderia se autoexcluir — ou se restaurar depois
-- de excluida. Mesmo padrao dos campos de assinatura (0077).

create or replace function public.guard_organizations_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then
    new.plan_key       := old.plan_key;
    new.status         := old.status;
    new.trial_ends_at  := old.trial_ends_at;
    new.plan_renews_at := old.plan_renews_at;
    new.deleted_at     := old.deleted_at;
  end if;
  return new;
end;
$$;

revoke all on function public.guard_organizations_update() from public, anon, authenticated;

-- ---------- 4. Soft delete (org + empresas da org, atomico) ----------

create or replace function public.soft_delete_organization(p_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ts         timestamptz := now();
  v_org        public.organizations;
  v_admins     int;
  v_companies  int;
begin
  if not public.is_platform_admin() then
    raise exception 'Apenas o administrador da plataforma pode excluir organizacoes'
      using errcode = '42501';
  end if;

  select * into v_org from public.organizations where id = p_id for update;
  if not found then
    raise exception 'Organizacao nao encontrada' using errcode = 'P0002';
  end if;
  if v_org.deleted_at is not null then
    raise exception 'Esta organizacao ja esta na lixeira' using errcode = 'P0001';
  end if;

  -- Nao deixar o admin serrar o galho onde esta sentado.
  if p_id = public.current_organization_id() then
    raise exception 'Voce nao pode excluir a organizacao a que pertence'
      using errcode = '42501';
  end if;

  -- Nem excluir uma org que abriga outro admin da plataforma.
  select count(*) into v_admins
    from public.profiles
   where organization_id = p_id
     and role in ('platform_admin', 'master');
  if v_admins > 0 then
    raise exception 'A organizacao tem % administrador(es) da plataforma. Mova-os para outra organizacao antes de excluir.', v_admins
      using errcode = '42501';
  end if;

  -- Cascade nas empresas ATIVAS (as que ja estavam na lixeira mantem o
  -- proprio deleted_at, para nao serem restauradas por tabela junto com
  -- a org). O timestamp compartilhado e o que identifica o cascade no
  -- restore — por isso v_ts, e nao now() de novo aqui.
  update public.companies
     set deleted_at = v_ts
   where organization_id = p_id
     and deleted_at is null;
  get diagnostics v_companies = row_count;

  -- status='suspended' e o que efetivamente tranca a organizacao no app:
  -- my_subscription() -> subscriptionActive=false -> SubscriptionGate
  -- mostra "Conta suspensa" para todo mundo da org.
  -- allow_impersonation volta a false: consentimento de suporte (LGPD)
  -- nao sobrevive a exclusao — se restaurar, a nutri consente de novo.
  update public.organizations
     set deleted_at         = v_ts,
         status             = 'suspended',
         allow_impersonation = false
   where id = p_id;

  insert into public.audit_log (
    table_name, row_id, action, old_data, new_data, user_id, user_email
  ) values (
    'organizations', p_id, 'soft_delete',
    to_jsonb(v_org),
    jsonb_build_object('deleted_at', v_ts, 'companies_cascaded', v_companies),
    auth.uid(),
    (select email from public.profiles where id = auth.uid())
  );

  return v_ts;
end;
$$;

revoke all on function public.soft_delete_organization(uuid) from public, anon;
grant execute on function public.soft_delete_organization(uuid) to authenticated;

-- ---------- 5. Restore ----------
-- Restaura a org e SOMENTE as empresas derrubadas por aquele cascade
-- (deleted_at identico ao da org). Empresas que a nutri ja tinha jogado
-- na lixeira antes continuam la, com o prazo delas.
--
-- O status continua 'suspended' de proposito: restaurar traz os dados de
-- volta, reativar o acesso e uma segunda decisao, explicita.

create or replace function public.restore_organization(p_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org       public.organizations;
  v_companies int;
begin
  if not public.is_platform_admin() then
    raise exception 'Apenas o administrador da plataforma pode restaurar organizacoes'
      using errcode = '42501';
  end if;

  select * into v_org from public.organizations where id = p_id for update;
  if not found then
    raise exception 'Organizacao nao encontrada' using errcode = 'P0002';
  end if;
  if v_org.deleted_at is null then
    raise exception 'Esta organizacao nao esta na lixeira' using errcode = 'P0001';
  end if;

  -- Sinaliza ao trg_company_undelete_guard (secao 6) que este UPDATE faz
  -- parte do restore da propria org — a org ainda esta marcada como
  -- excluida neste ponto da transacao.
  perform set_config('proactive.org_restore', p_id::text, true);

  update public.companies
     set deleted_at = null
   where organization_id = p_id
     and deleted_at = v_org.deleted_at;
  get diagnostics v_companies = row_count;

  update public.organizations
     set deleted_at = null
   where id = p_id;

  insert into public.audit_log (
    table_name, row_id, action, old_data, new_data, user_id, user_email
  ) values (
    'organizations', p_id, 'restore',
    to_jsonb(v_org),
    jsonb_build_object('companies_restored', v_companies, 'status', v_org.status),
    auth.uid(),
    (select email from public.profiles where id = auth.uid())
  );

  return v_companies;
end;
$$;

revoke all on function public.restore_organization(uuid) from public, anon;
grant execute on function public.restore_organization(uuid) to authenticated;

-- ---------- 6. Empresa nao "escapa" da lixeira da org ----------
-- Sem isso daria para restaurar uma empresa isolada (UPDATE deleted_at =
-- null) enquanto a organizacao dela continua excluida — empresa viva,
-- dona morta. A restauracao correta e sempre pela organizacao.
--
-- restore_organization() limpa as empresas ANTES da org (mesma transacao),
-- entao ela se anuncia por um GUC local (`proactive.org_restore`) que o
-- trigger reconhece. O GUC morre no fim da transacao (is_local = true) e
-- pg_catalog.set_config nao e exposto pelo PostgREST — nao da para
-- "ligar" o bypass de fora.

create or replace function public.guard_company_undelete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.deleted_at is not null
     and new.deleted_at is null
     and coalesce(current_setting('proactive.org_restore', true), '') <> new.organization_id::text
     and exists (
       select 1 from public.organizations o
        where o.id = new.organization_id
          and o.deleted_at is not null
     )
  then
    raise exception 'A organizacao desta empresa esta na lixeira. Restaure a organizacao para trazer as empresas de volta.'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

revoke all on function public.guard_company_undelete() from public, anon, authenticated;

drop trigger if exists trg_company_undelete_guard on public.companies;
create trigger trg_company_undelete_guard
  before update of deleted_at on public.companies
  for each row execute function public.guard_company_undelete();

-- ---------- 7. Purga no banco (empresas + org) em UMA transacao ----------
-- Chamada pela Edge Function admin-delete-organization DEPOIS que ela
-- apagou Storage e contas do Auth. Existe para o banco nao ficar meio
-- apagado: se o DELETE das empresas falhar, a organizacao continua de pe
-- e o admin pode tentar de novo (dois DELETEs soltos via PostgREST nao
-- teriam essa garantia).
--
-- Gate: chamada de dentro do app (auth.uid() presente) exige
-- platform_admin; chamada com service role (auth.uid() nulo) so acontece
-- pela Edge Function, que ja verificou o chamador. `anon` nao tem execute.

create or replace function public.purge_organization_db(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org       public.organizations;
  v_profiles  int;
  v_companies int;
begin
  if auth.uid() is not null and not public.is_platform_admin() then
    raise exception 'Apenas o administrador da plataforma pode excluir organizacoes'
      using errcode = '42501';
  end if;

  select * into v_org from public.organizations where id = p_id for update;
  if not found then
    raise exception 'Organizacao nao encontrada' using errcode = 'P0002';
  end if;
  if v_org.deleted_at is null then
    raise exception 'Mova a organizacao para a lixeira antes de excluir definitivamente'
      using errcode = 'P0001';
  end if;

  -- profiles.company_id e ON DELETE RESTRICT: se sobrou usuario, o DELETE
  -- das empresas falharia no meio. Aborta antes com mensagem util.
  select count(*) into v_profiles
    from public.profiles
   where organization_id = p_id
      or company_id in (select id from public.companies where organization_id = p_id);
  if v_profiles > 0 then
    raise exception 'Ainda existem % usuario(s) vinculados. Apague as contas antes.', v_profiles
      using errcode = 'P0001';
  end if;

  delete from public.companies where organization_id = p_id;
  get diagnostics v_companies = row_count;

  delete from public.organizations where id = p_id;

  return jsonb_build_object('companies_removed', v_companies);
end;
$$;

revoke all on function public.purge_organization_db(uuid) from public, anon;
grant execute on function public.purge_organization_db(uuid) to authenticated, service_role;

-- ---------- 8. Cron de limpeza: dois consertos ----------
--
-- (a) BUG PREEXISTENTE: `profiles.company_id` e ON DELETE RESTRICT. Toda
--     empresa soft-deletada que ainda tem usuario ligado faz o DELETE
--     estourar — e como as 5 deletes rodam na mesma transacao, a funcao
--     inteira aborta e NADA e limpo, silenciosamente (o cron so registra
--     o erro no log do pg_cron). Antes de apagar, desligamos o usuario da
--     empresa e o desativamos (`active=false`, que o AuthContext ja trata
--     deslogando na hora). A exclusao real do usuario no Auth continua
--     sendo feita pela Edge Function, que tem service role.
--
-- (b) Empresas de uma organizacao que esta NA LIXEIRA ficam congeladas:
--     nao sao apagadas pelo cron enquanto a org for restauravel, senao o
--     restore devolveria uma organizacao oca. A organizacao na lixeira so
--     sai de la por acao explicita do admin (Edge Function), que apaga o
--     conjunto inteiro — banco, Storage e contas de acesso.

create or replace function public.cleanup_soft_deleted()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cutoff timestamptz := now() - interval '30 days';
  v_purgeable uuid[];
begin
  select coalesce(array_agg(c.id), '{}'::uuid[])
    into v_purgeable
    from public.companies c
   where c.deleted_at < v_cutoff
     and not exists (
       select 1 from public.organizations o
        where o.id = c.organization_id
          and o.deleted_at is not null
     );

  if array_length(v_purgeable, 1) is not null then
    update public.profiles
       set company_id = null,
           active     = false
     where company_id = any(v_purgeable);

    delete from public.companies where id = any(v_purgeable);
  end if;

  delete from public.products     where deleted_at < v_cutoff;
  delete from public.audits       where deleted_at < v_cutoff;
  delete from public.manipulators where deleted_at < v_cutoff;
  delete from public.documents    where deleted_at < v_cutoff;
end;
$$;

-- 0073 tirou execute de anon/authenticated; o create or replace acima nao
-- reintroduz grants, mas repetimos por seguranca (a funcao DELETA dados).
revoke execute on function public.cleanup_soft_deleted() from public, anon, authenticated;
