-- Wave 15 / Item F: cron diario que apaga fisicamente registros
-- soft-deletados ha mais de 30 dias. Rodando 02:00 UTC (23:00 BRT).
-- Cada DELETE aciona CASCADE — empresas levam produtos, audits,
-- manipuladores junto (intencional; o usuario teve 30 dias para
-- restaurar).

create or replace function public.cleanup_soft_deleted()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.companies   where deleted_at < now() - interval '30 days';
  delete from public.products    where deleted_at < now() - interval '30 days';
  delete from public.audits      where deleted_at < now() - interval '30 days';
  delete from public.manipulators where deleted_at < now() - interval '30 days';
  delete from public.documents   where deleted_at < now() - interval '30 days';
end;
$$;

select cron.unschedule('cleanup-soft-deleted-daily')
where exists (
  select 1 from cron.job where jobname = 'cleanup-soft-deleted-daily'
);

select cron.schedule(
  'cleanup-soft-deleted-daily',
  '0 2 * * *',
  $$ select public.cleanup_soft_deleted(); $$
);
