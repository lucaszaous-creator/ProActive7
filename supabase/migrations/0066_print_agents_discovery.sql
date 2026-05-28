-- =====================================================================
-- 0066_print_agents_discovery.sql
-- Detecção automática de impressoras. O agente (rodando no PC) varre a
-- rede, encontra as impressoras (TCP 9100) e reporta a lista aqui. A web
-- mostra essa lista num popup para o usuário escolher — sem digitar IP.
-- =====================================================================

alter table public.print_agents
  add column if not exists discovered    jsonb       not null default '[]'::jsonb,
  add column if not exists discovered_at timestamptz;

-- printer_host vira opcional de fato: é preenchido depois, ao escolher
-- a impressora detectada (já era nullable na 0064).
