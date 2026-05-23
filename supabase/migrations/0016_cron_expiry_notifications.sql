-- =====================================================================
-- 0016_cron_expiry_notifications.sql  —  Push diario de etiquetas
-- vencendo nas proximas 24h.
-- ---------------------------------------------------------------------
-- Pre-requisitos (rodar nesta ordem):
--   1. Deploy da edge function send-expiry-notifications.
--   2. Definir secrets na function: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
--      VAPID_SUBJECT (mailto:...), CRON_SECRET.
-- Substitua <CRON_SECRET> pelo mesmo valor configurado na function.
-- =====================================================================

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
      'x-cron-secret', '<CRON_SECRET>'
    )
  );
  $$
);
