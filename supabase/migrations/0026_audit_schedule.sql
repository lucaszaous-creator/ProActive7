-- Wave 10: cronograma de visitas (recorrencia + agenda).
-- Sem nova tabela: estende audits com periodicidade. Ao finalizar
-- uma visita com recurrence_months > 0, o front cria a proxima
-- automaticamente.

alter table public.audits
  add column if not exists recurrence_months smallint,
  add column if not exists parent_audit_id uuid references public.audits(id) on delete set null;

create index if not exists audits_scheduled_idx
  on public.audits (scheduled_at)
  where status = 'scheduled';
