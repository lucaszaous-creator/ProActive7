-- Wave 15 / Item A: ativa o cron de push notifications.
-- Substitui o placeholder do 0016 com um secret real gerado e
-- aplicado direto via MCP. O CRON_SECRET tambem precisa estar
-- configurado nas secrets da edge function send-expiry-notifications
-- (variavel CRON_SECRET) com o mesmo valor desta migration.
--
-- ATENCAO: este secret nao deve ser exposto em PRs publicas. O valor
-- aqui foi gerado especificamente para este projeto; rotacao futura
-- = aplicar nova migration de unschedule+schedule + atualizar a
-- variavel CRON_SECRET na edge function.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('expiry-notifications-daily')
where exists (
  select 1 from cron.job where jobname = 'expiry-notifications-daily'
);

-- Executa todos os dias as 08:00 BRT (11:00 UTC).
select cron.schedule(
  'expiry-notifications-daily',
  '0 11 * * *',
  $$
  select net.http_post(
    url     := 'https://glvdiicipblsohdgmqaz.functions.supabase.co/send-expiry-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', 'eb4fcc17-7299-4b0d-b4c3-5068f7e27a67165287ee778a47bdb49c4c48fa988c0b'
    )
  );
  $$
);
