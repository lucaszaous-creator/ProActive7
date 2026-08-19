-- =====================================================================
-- 0108_agenda_events.sql
--
-- COMPROMISSOS DA AGENDA.
--
-- Hoje `/agenda` e uma tela somente-leitura que desenha as visitas
-- tecnicas (`audits.scheduled_at`) num calendario. Tudo que a RT faz e
-- que NAO e uma visita — reuniao com o cliente, treinamento da equipe,
-- prazo de entrega de laudo, coleta de amostra, ligacao de follow-up —
-- vive fora do sistema, na agenda do celular dela.
--
-- Esta tabela e o compromisso livre: titulo, quando, opcionalmente de
-- qual empresa, e um lembrete.
--
-- Escopo ORGANIZACAO (nao empresa): a agenda e da consultoria. Um
-- compromisso pode nao ter empresa nenhuma ("fechar relatorios do mes"),
-- por isso `company_id` e opcional — mas quando existe, e checado contra
-- a org na trigger, senao bastaria mandar o uuid da empresa do vizinho.
--
-- Visitas NAO sao copiadas para ca. Elas continuam sendo `audits`; a tela
-- une as duas fontes na leitura. Duplicar geraria dois lugares para
-- cancelar a mesma visita.
-- =====================================================================

-- ---------- 1. Tabela ----------

create table if not exists public.agenda_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.organizations(id) on delete cascade,
  -- Opcional: compromisso pode ser interno, sem empresa envolvida.
  company_id uuid references public.companies(id) on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  description text,
  -- Texto + check em vez de enum: a lista de tipos deve crescer sem
  -- migration (enum novo exige ALTER TYPE e trava o valor no banco).
  kind text not null default 'other'
    check (kind in ('meeting','training','deadline','collection','followup','other')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean not null default false,
  -- Lembrete: quantos dias antes avisar. NULL = sem lembrete.
  -- `reminded_at` da idempotencia ao cron diario (send-expiry-notifications):
  -- avisou uma vez, nao avisa de novo.
  remind_days_before integer
    check (remind_days_before is null or remind_days_before between 0 and 30),
  reminded_at timestamptz,
  done_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agenda_events_period check (ends_at is null or ends_at >= starts_at)
);

-- Consulta dominante da tela: janela de datas dentro de uma organizacao.
create index if not exists agenda_events_org_start_idx
  on public.agenda_events (organization_id, starts_at);

create index if not exists agenda_events_company_idx
  on public.agenda_events (company_id) where company_id is not null;

-- Varredura do cron: so os que ainda tem lembrete pendente.
create index if not exists agenda_events_reminder_idx
  on public.agenda_events (starts_at)
  where remind_days_before is not null and reminded_at is null;

drop trigger if exists trg_agenda_events_updated on public.agenda_events;
create trigger trg_agenda_events_updated
  before update on public.agenda_events
  for each row execute function public.set_updated_at();

-- ---------- 2. organization_id e coerencia da empresa ----------
-- Mesmo motivo da 0102/0103: nao depender do frontend mandar o campo
-- certo. Aqui vai um passo alem e valida que a empresa escolhida pertence
-- a organizacao de quem esta gravando.

create or replace function public.set_agenda_event_org()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_company_org uuid;
begin
  if new.organization_id is null then
    new.organization_id := public.current_organization_id();
  end if;

  if new.company_id is not null then
    select organization_id into v_company_org
      from public.companies where id = new.company_id;
    if v_company_org is null then
      raise exception 'Empresa inexistente';
    end if;
    -- A empresa manda: evita compromisso gravado na org errada.
    new.organization_id := coalesce(new.organization_id, v_company_org);
    if new.organization_id <> v_company_org then
      raise exception 'Empresa pertence a outra organizacao'
        using errcode = 'foreign_key_violation';
    end if;
  end if;

  if new.organization_id is null then
    raise exception 'Usuario sem organizacao';
  end if;

  if new.created_by is null then
    new.created_by := auth.uid();
  end if;

  -- Mudar data ou lembrete rearma o aviso: o cron volta a considerar.
  if tg_op = 'UPDATE'
     and (new.starts_at is distinct from old.starts_at
          or new.remind_days_before is distinct from old.remind_days_before) then
    new.reminded_at := null;
  end if;

  return new;
end;
$$;

revoke all on function public.set_agenda_event_org() from public, anon, authenticated;

drop trigger if exists trg_agenda_events_org on public.agenda_events;
create trigger trg_agenda_events_org
  before insert or update on public.agenda_events
  for each row execute function public.set_agenda_event_org();

-- ---------- 3. RLS ----------
-- A agenda e ferramenta da RT: leitura e escrita so para nutricionista da
-- propria organizacao (e platform_admin). O `property` nao ve a agenda da
-- consultoria — nem no menu dele ela existe (split de portais).

alter table public.agenda_events enable row level security;

drop policy if exists agenda_events_select on public.agenda_events;
create policy agenda_events_select on public.agenda_events for select to authenticated
  using (
    public.is_platform_admin()
    OR (
      public.is_nutritionist()
      AND organization_id = public.current_organization_id()
    )
  );

drop policy if exists agenda_events_insert on public.agenda_events;
create policy agenda_events_insert on public.agenda_events for insert to authenticated
  with check (
    public.is_platform_admin()
    OR (
      public.is_nutritionist()
      AND organization_id = public.current_organization_id()
    )
  );

drop policy if exists agenda_events_update on public.agenda_events;
create policy agenda_events_update on public.agenda_events for update to authenticated
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

drop policy if exists agenda_events_delete on public.agenda_events;
create policy agenda_events_delete on public.agenda_events for delete to authenticated
  using (
    public.is_platform_admin()
    OR (
      public.is_nutritionist()
      AND organization_id = public.current_organization_id()
    )
  );
