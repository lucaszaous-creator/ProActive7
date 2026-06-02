-- =====================================================================
-- 0078_impersonation_consent.sql — Consentimento LGPD para impersonate
-- A org autoriza (ou não) que o suporte (platform_admin) entre como seus
-- usuários. Default OFF. Só a nutri (RT, controladora do dado) liga/desliga
-- via orgs_update; o guard 0077 NÃO congela esta coluna. Property não edita
-- org. A Edge admin-impersonate passa a checar esta coluna server-side.
-- CLAUDE.md §2.1: "sem opt-in, impersonate é bloqueado".
-- =====================================================================

alter table public.organizations
  add column if not exists allow_impersonation boolean not null default false;

comment on column public.organizations.allow_impersonation is
  'Consentimento LGPD: org autoriza o suporte (platform_admin) a entrar como seus usuarios (impersonate). Default OFF; so a nutri/admin liga.';
