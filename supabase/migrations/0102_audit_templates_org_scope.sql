-- =====================================================================
-- 0102_audit_templates_org_scope.sql
--
-- Modelos de VISITA TECNICA passam a poder ser criados pela propria
-- nutricionista, e a viver no escopo da ORGANIZACAO (nao mais so no de
-- uma empresa).
--
-- Contexto: `audit_templates` so tinha leitura no frontend. O unico jeito
-- de um modelo existir era o platform_admin publicar um global em
-- /platform/biblioteca e a nutri clonar (clone_audit_template) para UMA
-- empresa. Com N empresas clientes, o mesmo checklist virava N copias e
-- corrigir uma pergunta significava editar as N. As policies da 0043 ja
-- permitiam a nutri inserir modelo de empresa — faltava a tela e faltava
-- o escopo de org.
--
-- Passa a existir tres escopos, mutuamente exclusivos:
--
--   global   -> is_global = true,  company_id null, organization_id null
--               (catalogo da plataforma, curado pelo platform_admin)
--   org      -> is_global = false, company_id null, organization_id X
--               (modelo da consultoria, vale para todas as empresas dela)
--   empresa  -> is_global = false, company_id C     (organization_id
--               derivado de C por trigger; modelos que ja existiam)
-- =====================================================================

-- ---------- 1. Colunas ----------

-- ON DELETE CASCADE: o modelo e da organizacao; quando a org e purgada
-- (0101) ele vai junto. Modelos de empresa ja cascateiam por company_id.
alter table public.audit_templates
  add column if not exists organization_id uuid
    references public.organizations(id) on delete cascade;

-- Modelo aposentado: some do seletor de "Agendar visita" mas continua
-- existindo para as visitas passadas que o usaram. Sem isso, a unica
-- forma de tirar um modelo de circulacao seria apagar — e apagar
-- quebraria o laudo das visitas ja assinadas (audits.template_id e
-- ON DELETE SET NULL: a visita perderia o questionario).
alter table public.audit_templates
  add column if not exists active boolean not null default true;

create index if not exists audit_templates_org_idx
  on public.audit_templates (organization_id) where organization_id is not null;

-- ---------- 2. Backfill ----------
-- Modelos de empresa herdam a org da empresa, para que a nutri enxergue
-- (e possa editar) tudo que e da organizacao dela num lugar so.

update public.audit_templates t
   set organization_id = c.organization_id
  from public.companies c
 where c.id = t.company_id
   and t.organization_id is null
   and c.organization_id is not null;

-- ---------- 3. Trigger: company_id manda no organization_id ----------
-- Impede que alguem insira company_id da propria org com organization_id
-- de outra (ou o contrario). Mesmo espirito do
-- sync_profile_org_from_company() da 0042.

create or replace function public.sync_audit_template_org()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_global then
    -- Modelo do catalogo da plataforma nao pertence a ninguem.
    new.company_id      := null;
    new.organization_id := null;
  elsif new.company_id is not null then
    new.organization_id := (
      select organization_id from public.companies where id = new.company_id
    );
  elsif new.organization_id is null then
    -- Despublicar um global (is_global true -> false) deixaria a linha
    -- sem dono nenhum e violaria audit_templates_scope_ck. Cai para a
    -- org de quem esta despublicando.
    new.organization_id := public.current_organization_id();
    if new.organization_id is null then
      raise exception
        'Modelo precisa pertencer a uma organizacao ou a uma empresa.';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.sync_audit_template_org() from public, anon, authenticated;

drop trigger if exists trg_audit_templates_org on public.audit_templates;
create trigger trg_audit_templates_org
  before insert or update of company_id, organization_id, is_global
  on public.audit_templates
  for each row execute function public.sync_audit_template_org();

-- ---------- 4. Integridade dos tres escopos ----------
-- NOT VALID de proposito: vale para tudo que for gravado daqui pra
-- frente, sem arriscar abortar a migration por causa de alguma linha
-- historica fora do padrao (ex.: modelo antigo com company_id nulo e
-- is_global false, que hoje seria invisivel na pratica).

alter table public.audit_templates
  drop constraint if exists audit_templates_scope_ck;

alter table public.audit_templates
  add constraint audit_templates_scope_ck check (
    (is_global and company_id is null and organization_id is null)
    or (not is_global and company_id is null and organization_id is not null)
    or (not is_global and company_id is not null)
  ) not valid;

-- ---------- 5. RLS ----------

-- SELECT. Duas mudancas em relacao a 0043:
--
--  (a) o ramo `company_id IS NULL` virava um vazamento agora que existe
--      modelo de org: qualquer autenticado leria os modelos de QUALQUER
--      organizacao. Trocado por `is_global = true`, que e o que aquele
--      ramo queria dizer em 2024 (na epoca, company_id nulo == global).
--  (b) modelo de org e visivel para a org inteira — inclusive para o
--      property, que precisa carregar o questionario ao abrir a visita
--      da empresa dele (AuditDetailPage le o template da visita).
drop policy if exists audit_templates_select on public.audit_templates;
create policy audit_templates_select on public.audit_templates for select to authenticated
  using (
    is_global = true
    OR public.is_platform_admin()
    OR (public.is_nutritionist() AND organization_id = public.current_organization_id())
    OR (company_id is not null AND company_id = public.current_company_id())
    OR (company_id is null AND organization_id = public.current_organization_id())
  );

-- A policy audit_templates_global_read da 0052 foi criada sem clausula
-- TO, entao valia para TODOS os roles — inclusive `anon`. O conteudo e
-- pouco sensivel (checklist de RDC publicado pela plataforma), mas nao
-- ha motivo para ficar legivel sem login. Recriada restrita.
drop policy if exists audit_templates_global_read on public.audit_templates;
create policy audit_templates_global_read on public.audit_templates for select to authenticated
  using (is_global = true);

-- INSERT/UPDATE/DELETE: a nutri escreve no escopo da propria org (modelo
-- de org ou de uma empresa dela). Marcar is_global continua sendo
-- exclusividade do platform_admin (policy audit_templates_global_insert
-- da 0098) — o ramo da nutri exige is_global = false.
drop policy if exists audit_templates_insert on public.audit_templates;
create policy audit_templates_insert on public.audit_templates for insert to authenticated
  with check (
    public.is_platform_admin()
    OR (
      public.is_nutritionist()
      AND is_global = false
      AND (
        (company_id is null AND organization_id = public.current_organization_id())
        OR company_id IN (
          SELECT id FROM public.companies
           WHERE organization_id = public.current_organization_id()
        )
      )
    )
  );

drop policy if exists audit_templates_update on public.audit_templates;
create policy audit_templates_update on public.audit_templates for update to authenticated
  using (
    public.is_platform_admin()
    OR (
      public.is_nutritionist()
      AND is_global = false
      AND organization_id = public.current_organization_id()
    )
  )
  with check (
    public.is_platform_admin()
    OR (
      public.is_nutritionist()
      AND is_global = false
      AND (
        (company_id is null AND organization_id = public.current_organization_id())
        OR company_id IN (
          SELECT id FROM public.companies
           WHERE organization_id = public.current_organization_id()
        )
      )
    )
  );

drop policy if exists audit_templates_delete on public.audit_templates;
create policy audit_templates_delete on public.audit_templates for delete to authenticated
  using (
    public.is_platform_admin()
    OR (
      public.is_nutritionist()
      AND is_global = false
      AND organization_id = public.current_organization_id()
    )
  );

-- ---------- 6. Guarda: nao apagar modelo que ja virou laudo ----------
-- audits.template_id e ON DELETE SET NULL. Apagar um modelo usado por
-- uma visita ja finalizada deixaria o laudo sem as perguntas — e a
-- visita assinada pela RT e documento de conformidade. A saida e
-- desativar (active = false), nao apagar.

create or replace function public.block_audit_template_delete_in_use()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_uses int;
begin
  select count(*) into v_uses from public.audits where template_id = old.id;
  if v_uses > 0 then
    raise exception
      'Este modelo esta em uso por % visita(s) e nao pode ser excluido. Desative-o para tirar de circulacao sem perder o historico.', v_uses
      using errcode = 'restrict_violation';
  end if;
  return old;
end;
$$;

revoke all on function public.block_audit_template_delete_in_use() from public, anon, authenticated;

drop trigger if exists trg_audit_templates_block_delete on public.audit_templates;
create trigger trg_audit_templates_block_delete
  before delete on public.audit_templates
  for each row execute function public.block_audit_template_delete_in_use();

-- ---------- 7. Clonar modelo global para a ORGANIZACAO ----------
-- Substitui, para auditoria, o clone_audit_template(template, empresa)
-- da 0052 (que continua existindo para quem quiser um modelo de uma
-- empresa so). Agora "Usar como modelo" na Biblioteca cria UMA copia,
-- da organizacao inteira.

create or replace function public.clone_audit_template_to_org(p_template_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_new_id uuid;
  v_org uuid;
  v_name text;
begin
  v_org := public.current_organization_id();
  if v_org is null then
    raise exception 'Usuario sem organizacao';
  end if;

  select name into v_name
    from public.audit_templates
   where id = p_template_id and is_global = true;
  if v_name is null then
    raise exception 'Modelo global nao encontrado';
  end if;

  -- Segunda copia do mesmo modelo nao pode colidir de nome na lista.
  if exists (
    select 1 from public.audit_templates
     where organization_id = v_org and company_id is null and name = v_name
  ) then
    v_name := v_name || ' (copia)';
  end if;

  insert into public.audit_templates (name, items, company_id, organization_id, is_global, active)
  select v_name, t.items, null, v_org, false, true
    from public.audit_templates t
   where t.id = p_template_id
  returning id into v_new_id;

  return v_new_id;
end;
$$;

revoke execute on function public.clone_audit_template_to_org(uuid) from public, anon;
grant execute on function public.clone_audit_template_to_org(uuid) to authenticated;
