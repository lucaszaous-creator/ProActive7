-- Wave 15 follow-up: as chaves VAPID (publica, privada, subject)
-- ficam guardadas no supabase_vault como secrets nomeados:
--   vapid_public_key, vapid_private_key, vapid_subject
--
-- A edge function send-expiry-notifications le tudo de uma vez via
-- esta RPC, sem precisar de variavel de ambiente Deno.env.
--
-- Cadastro INICIAL dos secrets (UMA vez, via SQL Editor, nao
-- versionado aqui):
--
--   select vault.create_secret('<chave publica>', 'vapid_public_key', '...');
--   select vault.create_secret('<chave privada>', 'vapid_private_key', '...');
--   select vault.create_secret('mailto:contato@proactive7.com.br', 'vapid_subject', '...');
--
-- Rotacao: vault.update_secret_by_name(name, new_value).

create or replace function public.get_vapid_keys()
returns table (
  vapid_public  text,
  vapid_private text,
  vapid_subject text
)
language plpgsql
security definer
set search_path = public, vault
as $$
begin
  return query
  select
    (select decrypted_secret from vault.decrypted_secrets where name='vapid_public_key')  as vapid_public,
    (select decrypted_secret from vault.decrypted_secrets where name='vapid_private_key') as vapid_private,
    (select decrypted_secret from vault.decrypted_secrets where name='vapid_subject')     as vapid_subject;
end;
$$;

revoke all on function public.get_vapid_keys() from public;
revoke all on function public.get_vapid_keys() from anon, authenticated;
grant execute on function public.get_vapid_keys() to service_role;
