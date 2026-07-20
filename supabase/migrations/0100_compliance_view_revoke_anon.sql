-- =====================================================================
-- 0100_compliance_view_revoke_anon.sql
--
-- CORRECAO: a 0099 fez `drop view` + `create view` na
-- company_compliance_v. No Supabase, as DEFAULT PRIVILEGES do schema
-- `public` reconcedem SELECT a `anon` automaticamente em qualquer view
-- recriada — reabrindo o acesso anonimo que a 0072 havia trancado
-- (`revoke all ... from anon`). A 0099 nao repetiu esse revoke.
--
-- Impacto e limitado (a view e security_invoker=true e as tabelas-base
-- so tem policy `to authenticated`, entao anon veria zero linhas), mas
-- por defesa-em-profundidade — e para manter a decisao versionada da
-- 0072 — revogamos anon explicitamente apos o recreate.
--
-- Padrao a lembrar: SEMPRE que uma view trancada for recriada com
-- drop+create, repetir o `revoke all ... from anon` na mesma migration.
-- =====================================================================

revoke all on public.company_compliance_v from anon;
