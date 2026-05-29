-- 0069_relay_status_logs.sql
-- Auto-update do relay (versão) + logs centralizados (erros/eventos enviados
-- pelo relay PowerShell para o servidor, visíveis na tela de Impressoras).
alter table public.print_agents
  add column if not exists relay_version text;

create table if not exists public.relay_logs (
  id          uuid primary key default gen_random_uuid(),
  agent_id    uuid not null references public.print_agents (id) on delete cascade,
  company_id  uuid not null references public.companies (id) on delete cascade,
  level       text not null default 'info' check (level in ('info','warn','error')),
  message     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_relay_logs_company
  on public.relay_logs (company_id, created_at desc);
create index if not exists idx_relay_logs_agent
  on public.relay_logs (agent_id, created_at desc);

alter table public.relay_logs enable row level security;

create policy relay_logs_select on public.relay_logs for select to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );
