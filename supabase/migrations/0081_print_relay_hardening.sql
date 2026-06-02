-- =====================================================================
-- 0081_print_relay_hardening.sql — Robustez do relay de impressão
-- - print_agents.language: linguagem da impressora (zpl Zebra/Elgin |
--   escpos térmicas 58/80mm). Default 'zpl' (compatível com o que existe).
-- - print_jobs.format: como o payload deve ser interpretado pelo relay
--   (zpl = texto UTF-8; escpos = bytes em base64). Default 'zpl'.
-- O roteamento atômico por agente e o re-enfileiramento de jobs presos são
-- feitos na Edge print-agent (sem mudança de schema).
-- =====================================================================

alter table public.print_agents
  add column if not exists language text not null default 'zpl'
    check (language in ('zpl', 'escpos'));

alter table public.print_jobs
  add column if not exists format text not null default 'zpl'
    check (format in ('zpl', 'escpos'));
