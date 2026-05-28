-- =====================================================================
-- 0064_print_agents_jobs.sql
-- Impressão direta sem diálogo (estilo PrintNode), relay grátis via
-- Supabase. Um "agente" (script Node rodando no PC da cozinha) recebe
-- jobs e manda ZPL pra impressora térmica (ex: Elgin L42PRO via TCP 9100).
--
-- Fluxo:
--   App  -> insere print_jobs (status=queued, zpl)         [RLS company]
--   Agente -> Edge Function print-agent (poll/ack)         [service role]
--   App  -> escuta status via Realtime (queued->done)      [RLS company]
-- =====================================================================

-- ---------- print_agents: 1 linha por impressora/PC ----------
create table if not exists public.print_agents (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies (id) on delete cascade,
  name          text not null,                       -- "ELGIN L42PRO FULL"
  computer_name text,                                -- "AIO-2455" (informativo)
  token_hash    text not null unique,                -- sha256(token) — token cru só aparece 1x
  printer_host  text,                                -- IP da impressora de rede (TCP 9100)
  printer_port  int  not null default 9100,
  label_width_mm  int not null default 40,
  label_height_mm int not null default 40,
  dpi           int  not null default 203,           -- 203dpi = 8 dots/mm
  active        boolean not null default true,
  last_seen_at  timestamptz,                         -- heartbeat (Online se < 60s)
  created_by    uuid references public.profiles (id),
  created_at    timestamptz not null default now()
);

create index if not exists idx_print_agents_company
  on public.print_agents (company_id);

-- ---------- print_jobs: fila de impressão ----------
create table if not exists public.print_jobs (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  agent_id    uuid not null references public.print_agents (id) on delete cascade,
  label_id    uuid references public.label_prints (id) on delete set null,
  zpl         text not null,                          -- payload cru pra impressora
  copies      int  not null default 1 check (copies >= 1),
  status      text not null default 'queued'
              check (status in ('queued','printing','done','error')),
  error       text,
  created_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  printed_at  timestamptz
);

create index if not exists idx_print_jobs_agent_status
  on public.print_jobs (agent_id, status, created_at);
create index if not exists idx_print_jobs_company
  on public.print_jobs (company_id, created_at desc);

-- ---------- RLS ----------
-- Usuários autenticados operam dentro do escopo da empresa (mesmo padrão
-- do 0043). O agente NUNCA acessa o banco direto — só via Edge Function
-- com service role — então não precisa de política para o agente.

alter table public.print_agents enable row level security;
alter table public.print_jobs   enable row level security;

create policy print_agents_select on public.print_agents for select to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );

create policy print_agents_insert on public.print_agents for insert to authenticated
  with check (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
  );

create policy print_agents_update on public.print_agents for update to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
  )
  with check (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
  );

create policy print_agents_delete on public.print_agents for delete to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
  );

-- Jobs: qualquer usuário no escopo da empresa pode criar e acompanhar.
create policy print_jobs_select on public.print_jobs for select to authenticated
  using (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );

create policy print_jobs_insert on public.print_jobs for insert to authenticated
  with check (
    is_platform_admin()
    OR (is_nutritionist() AND company_id IN (SELECT id FROM companies WHERE organization_id = current_organization_id()))
    OR company_id = current_company_id()
  );

-- ---------- Realtime: frontend acompanha o status do job ----------
alter publication supabase_realtime add table public.print_jobs;
