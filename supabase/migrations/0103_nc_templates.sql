-- =====================================================================
-- 0103_nc_templates.sql
--
-- Modelos de NAO-CONFORMIDADE. Hoje toda NC e digitada do zero: categoria,
-- severidade, descricao e o 5W2H inteiro (o que / por que / onde / quando /
-- quem / como / quanto). Como os problemas de cozinha se repetem entre as
-- empresas da carteira ("manipulador sem touca", "geladeira acima de 5C"),
-- a RT reescreve o mesmo plano de acao toda vez — e escreve diferente cada
-- vez, o que torna as NCs nao comparaveis entre empresas.
--
-- Duas entregas nesta migration:
--
--  1. `nc_templates`: biblioteca da ORGANIZACAO. Qualquer nutricionista da
--     org cria e edita; vale para todas as empresas dela.
--  2. Ligacao com o item do modelo de visita: cada pergunta do
--     `audit_templates.items` pode apontar para um modelo de NC
--     (`items[].nc_template_id`). Quando o item e reprovado na visita, a NC
--     ja nasce com o plano de acao preenchido, sem ninguem escolher nada.
--
-- Escopo: so organizacao. Sem modelo por empresa e sem catalogo global —
-- nao ha demanda, e cada escopo extra e mais RLS para manter. Ambos cabem
-- depois seguindo o padrao da 0102.
-- =====================================================================

-- ---------- 1. Tabela ----------

create table if not exists public.nc_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  -- Rotulo do modelo na lista ("Manipulador sem touca"). Curto, e o que a
  -- nutri procura. A `description` e o texto que vai para a NC.
  name text not null,
  category text,
  severity public.nc_severity not null default 'medium',
  description text not null,
  -- 5W2H padrao. `when_due` nao entra: prazo e relativo a abertura, entao
  -- guardamos os dias e a data e calculada na hora.
  what text,
  why text,
  where_loc text,
  how text,
  how_much numeric(12,2),
  default_due_days integer not null default 30
    check (default_due_days between 1 and 365),
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists nc_templates_org_idx
  on public.nc_templates (organization_id) where active;

drop trigger if exists trg_nc_templates_updated on public.nc_templates;
create trigger trg_nc_templates_updated
  before update on public.nc_templates
  for each row execute function public.set_updated_at();

-- ---------- 2. Origem da NC ----------
-- Guarda de qual modelo a NC nasceu. Serve para responder depois "qual
-- problema mais se repete na carteira" sem depender de casar texto livre.
alter table public.non_conformities
  add column if not exists nc_template_id uuid
    references public.nc_templates(id) on delete set null;

create index if not exists nc_template_id_idx
  on public.non_conformities (nc_template_id) where nc_template_id is not null;

-- ---------- 3. RLS ----------
-- Leitura para a organizacao inteira: o property tambem abre NC (policy
-- nc_insert da 0043) e deve poder escolher um modelo. Escrita so da nutri
-- da propria org — o plano de acao e decisao tecnica da RT (CLAUDE.md §2).

alter table public.nc_templates enable row level security;

drop policy if exists nc_templates_select on public.nc_templates;
create policy nc_templates_select on public.nc_templates for select to authenticated
  using (
    public.is_platform_admin()
    OR organization_id = public.current_organization_id()
  );

drop policy if exists nc_templates_insert on public.nc_templates;
create policy nc_templates_insert on public.nc_templates for insert to authenticated
  with check (
    public.is_platform_admin()
    OR (
      public.is_nutritionist()
      AND organization_id = public.current_organization_id()
    )
  );

drop policy if exists nc_templates_update on public.nc_templates;
create policy nc_templates_update on public.nc_templates for update to authenticated
  using (
    public.is_platform_admin()
    OR (
      public.is_nutritionist()
      AND organization_id = public.current_organization_id()
    )
  )
  with check (
    public.is_platform_admin()
    OR (
      public.is_nutritionist()
      AND organization_id = public.current_organization_id()
    )
  );

drop policy if exists nc_templates_delete on public.nc_templates;
create policy nc_templates_delete on public.nc_templates for delete to authenticated
  using (
    public.is_platform_admin()
    OR (
      public.is_nutritionist()
      AND organization_id = public.current_organization_id()
    )
  );

-- ---------- 4. organization_id preenchido pelo servidor ----------
-- Mesmo motivo da 0102: nao depender do frontend mandar o campo certo, e
-- nao deixar ninguem gravar modelo na org do vizinho.

create or replace function public.set_nc_template_org()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.organization_id is null then
    new.organization_id := public.current_organization_id();
    if new.organization_id is null then
      raise exception 'Usuario sem organizacao';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.set_nc_template_org() from public, anon, authenticated;

drop trigger if exists trg_nc_templates_org on public.nc_templates;
create trigger trg_nc_templates_org
  before insert on public.nc_templates
  for each row execute function public.set_nc_template_org();

-- ---------- 5. Guarda: modelo em uso nao some sem aviso ----------
-- Duas amarras diferentes:
--   - non_conformities.nc_template_id e ON DELETE SET NULL: NC ja aberta
--     sobrevive, so perde a rastreabilidade da origem. Tudo bem.
--   - audit_templates.items[].nc_template_id vive dentro de um jsonb, que
--     nao aceita FK. Sem esta trigger, apagar o modelo deixaria o item do
--     modelo de visita apontando para o vazio e a NC automatica voltaria
--     silenciosamente ao texto cru. Melhor bloquear e mandar desativar.

create or replace function public.block_nc_template_delete_in_use()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_names text;
begin
  select string_agg(distinct t.name, ', ') into v_names
    from public.audit_templates t,
         lateral jsonb_array_elements(t.items) i
   where i->>'nc_template_id' = old.id::text;

  if v_names is not null then
    raise exception
      'Este modelo de NC esta vinculado a itens do(s) modelo(s) de visita: %. Desvincule ou desative o modelo em vez de excluir.', v_names
      using errcode = 'restrict_violation';
  end if;
  return old;
end;
$$;

revoke all on function public.block_nc_template_delete_in_use() from public, anon, authenticated;

drop trigger if exists trg_nc_templates_block_delete on public.nc_templates;
create trigger trg_nc_templates_block_delete
  before delete on public.nc_templates
  for each row execute function public.block_nc_template_delete_in_use();

-- ---------- 6. Coerencia do vinculo no modelo de visita ----------
-- Impede que um item de modelo de visita aponte para um modelo de NC de
-- OUTRA organizacao (o items e jsonb: sem isso, bastaria mandar o uuid).

create or replace function public.validate_audit_template_nc_links()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_bad int;
  v_org uuid;
begin
  -- Modelo global e clonado por todas as orgs; um vinculo dentro dele
  -- apontaria para o modelo de NC de UMA org e chegaria quebrado nas
  -- outras. Global nao carrega plano de acao.
  if new.is_global then
    if exists (
      select 1 from lateral jsonb_array_elements(new.items) i
       where i->>'nc_template_id' is not null
    ) then
      raise exception
        'Modelo oficial da plataforma nao pode vincular plano de acao: o modelo de NC pertence a uma organizacao.'
        using errcode = 'foreign_key_violation';
    end if;
    return new;
  end if;

  -- A org pode ainda nao estar na linha: o trigger que a deriva de
  -- company_id (trg_audit_templates_org, 0102) roda DEPOIS deste — BEFORE
  -- triggers disparam em ordem alfabetica de nome. Por isso a resolucao e
  -- refeita aqui em vez de confiar em new.organization_id.
  v_org := coalesce(
    new.organization_id,
    (select organization_id from public.companies where id = new.company_id),
    public.current_organization_id()
  );

  select count(*) into v_bad
    from lateral jsonb_array_elements(new.items) i
   where i->>'nc_template_id' is not null
     and not exists (
       select 1 from public.nc_templates n
        where n.id = (i->>'nc_template_id')::uuid
          and v_org is not null
          and n.organization_id = v_org
     );

  if v_bad > 0 then
    raise exception
      'Modelo de visita aponta para % modelo(s) de NC inexistente(s) ou de outra organizacao.', v_bad
      using errcode = 'foreign_key_violation';
  end if;
  return new;
end;
$$;

revoke all on function public.validate_audit_template_nc_links() from public, anon, authenticated;

-- Nome com sufixo `z_` de proposito: garante que esta validacao rode
-- DEPOIS de trg_audit_templates_org (0102), que preenche organization_id.
drop trigger if exists trg_audit_templates_nc_links on public.audit_templates;
drop trigger if exists trg_audit_templates_z_nc_links on public.audit_templates;
create trigger trg_audit_templates_z_nc_links
  before insert or update of items on public.audit_templates
  for each row execute function public.validate_audit_template_nc_links();

-- ---------- 7. Abrir NC a partir de um modelo ----------
-- Uma RPC em vez de o frontend montar o payload: o prazo tem de ser
-- calculado no servidor (fuso do cliente nao pode definir vencimento
-- legal) e a NC automatica da visita e a manual passam a nascer iguais.

create or replace function public.open_nc_from_template(
  p_template_id uuid,
  p_company_id uuid,
  p_audit_id uuid default null,
  p_source text default 'manual',
  p_description_override text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  t public.nc_templates%rowtype;
begin
  select * into t from public.nc_templates where id = p_template_id and active;
  if not found then
    raise exception 'Modelo de NC nao encontrado ou desativado';
  end if;

  insert into public.non_conformities (
    company_id, audit_id, source, nc_template_id,
    category, description, severity, status,
    what, why, where_loc, how, how_much,
    when_due, opened_by
  ) values (
    p_company_id, p_audit_id, p_source, t.id,
    t.category, coalesce(p_description_override, t.description), t.severity, 'open',
    t.what, t.why, t.where_loc, t.how, t.how_much,
    (current_date + t.default_due_days)::date, auth.uid()
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.open_nc_from_template(uuid, uuid, uuid, text, text) from public, anon;
grant execute on function public.open_nc_from_template(uuid, uuid, uuid, text, text) to authenticated;
