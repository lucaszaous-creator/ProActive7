-- =====================================================================
-- 0077_subscriptions.sql — Controle interno de assinatura (sem gateway)
-- Cada nutricionista é uma organização; o platform_admin (dono do SaaS)
-- atribui plano e status. Plano define limite de empresas + módulos
-- liberados. Nenhuma cobrança automática — só controle/visibilidade.
-- =====================================================================

-- ---------- 1. Catálogo de planos ----------
create table if not exists public.plans (
  key             text primary key,
  name            text not null,
  company_limit   int,                       -- null = ilimitado
  allowed_modules text[] not null default '{}',
  price_cents     int not null default 0,    -- informativo (sem gateway)
  active          boolean not null default true,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger trg_plans_updated
  before update on public.plans
  for each row execute function public.set_updated_at();

alter table public.plans enable row level security;

-- Leitura para qualquer logado (a nutri precisa saber os módulos do plano).
create policy plans_select on public.plans
  for select to authenticated using (true);

-- Escrita só platform_admin.
create policy plans_write on public.plans
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- ---------- 2. Campos de assinatura na organização ----------
alter table public.organizations
  add column if not exists plan_key       text references public.plans(key) on delete set null,
  add column if not exists trial_ends_at  timestamptz,
  add column if not exists plan_renews_at timestamptz;

-- ---------- 3. Seed dos planos ----------
insert into public.plans (key, name, company_limit, allowed_modules, price_cents, sort_order) values
  ('trial', 'Trial (14 dias)', 1, array['temperatura'], 0, 0),
  ('essencial', 'Essencial', 1,
    array['temperatura','checklists','nao_conformidades','documentos'], 0, 1),
  ('profissional', 'Profissional', 5,
    array['temperatura','checklists','nao_conformidades','documentos',
          'auditorias','pragas','estoque','relatorios','fotos','agenda',
          'impressao_direta'], 0, 2)
on conflict (key) do nothing;

-- ---------- 4. Orgs existentes recebem o plano completo (não quebrar nada hoje) ----------
update public.organizations set plan_key = 'profissional' where plan_key is null;

-- ---------- 5. Guard: nutri NÃO pode alterar plano/status da própria org ----------
-- A policy orgs_update permite a nutri editar a org (logo/cor/contato). Este
-- trigger congela os campos de assinatura para quem não é platform_admin —
-- mesmo padrão de guard_profiles_update (0045).
create or replace function public.guard_organizations_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then
    new.plan_key       := old.plan_key;
    new.status         := old.status;
    new.trial_ends_at  := old.trial_ends_at;
    new.plan_renews_at := old.plan_renews_at;
  end if;
  return new;
end;
$$;

revoke all on function public.guard_organizations_update() from public, anon, authenticated;

create trigger trg_organizations_update_guard
  before update on public.organizations
  for each row execute function public.guard_organizations_update();

-- ---------- 6. RPC self-service da nutri ----------
create or replace function public.my_subscription()
returns table (
  organization_id   uuid,
  organization_name text,
  status            text,
  plan_key          text,
  plan_name         text,
  allowed_modules   text[],
  company_limit     int,
  company_count     bigint,
  trial_ends_at     timestamptz,
  plan_renews_at    timestamptz
) language sql stable security definer set search_path = public as $$
  select
    o.id,
    o.name,
    o.status,
    o.plan_key,
    p.name,
    coalesce(p.allowed_modules, '{}'),
    p.company_limit,
    (select count(*) from companies c
       where c.organization_id = o.id
         and c.active = true
         and c.deleted_at is null),
    o.trial_ends_at,
    o.plan_renews_at
  from organizations o
  left join plans p on p.key = o.plan_key
  where o.id = public.current_organization_id();
$$;

revoke all on function public.my_subscription() from public, anon;
grant execute on function public.my_subscription() to authenticated;
