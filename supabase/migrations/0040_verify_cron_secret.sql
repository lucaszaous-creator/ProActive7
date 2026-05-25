-- Wave 15 follow-up: a edge function send-expiry-notifications passa a
-- validar o header x-cron-secret comparando com o secret guardado no
-- supabase_vault (entrada 'cron_secret_expiry'), via SECURITY DEFINER
-- que so retorna boolean — o valor nunca atravessa a fronteira do
-- banco.
--
-- Para o secret existir, rode UMA VEZ via SQL Editor (nao versionado
-- aqui porque secrets nao devem entrar em migration):
--
--   select vault.create_secret(
--     '<seu CRON_SECRET>', 'cron_secret_expiry',
--     'Secret usado pelo cron expiry-notifications-daily.'
--   );

create or replace function public.verify_cron_secret(
  p_name text,
  p_provided text
)
returns boolean
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = p_name;
  return v_secret is not null and v_secret = p_provided;
end;
$$;

revoke all on function public.verify_cron_secret(text, text) from public;
revoke all on function public.verify_cron_secret(text, text) from anon, authenticated;
grant execute on function public.verify_cron_secret(text, text) to service_role;
