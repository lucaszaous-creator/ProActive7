-- =====================================================================
-- 0042_organizations.sql  —  Multi-tenant: camada Organizations
-- Introduz o conceito de "organization" (portfolio de um nutricionista)
-- e os novos roles 'platform_admin' e 'nutritionist'.
-- =====================================================================

-- ---------- 1. Novos valores no enum user_role ----------
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'platform_admin';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'nutritionist';

-- ---------- 2. Tabela organizations ----------
create table public.organizations (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text unique,
  owner_user_id uuid references auth.users(id) on delete set null,
  status        text not null default 'active' check (status in ('active', 'suspended')),
  logo_path     text,
  primary_color text,
  contact_email text,
  contact_phone text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create trigger trg_organizations_updated
  before update on public.organizations
  for each row execute function public.set_updated_at();

-- ---------- 3. organization_id em companies ----------
ALTER TABLE public.companies
  ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX idx_companies_organization_id ON public.companies(organization_id);

-- ---------- 4. organization_id em profiles ----------
ALTER TABLE public.profiles
  ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX idx_profiles_organization_id ON public.profiles(organization_id);

-- ---------- 5. Trigger: sincroniza organization_id do profile com a company ----------
-- Quando um profile tem company_id definido (usuarios property), o organization_id
-- e automaticamente sincronizado a partir da empresa. Para nutritionist e
-- platform_admin, organization_id e definido diretamente (nao via trigger).

create or replace function public.sync_profile_org_from_company()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.company_id is not null then
    NEW.organization_id := (select organization_id from companies where id = NEW.company_id);
  end if;
  return NEW;
end;
$$;

create trigger trg_sync_profile_org
  before insert or update of company_id on public.profiles
  for each row execute function public.sync_profile_org_from_company();
