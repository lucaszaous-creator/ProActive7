-- 0067_print_agents_qz_tray.sql
-- Nome exato da impressora instalada no Windows (usado pelo relay PowerShell
-- e, na fase QZ Tray, pela ponte local). O relay imprime nesta impressora.
alter table public.print_agents
  add column if not exists printer_name text;
