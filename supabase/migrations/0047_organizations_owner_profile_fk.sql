-- =====================================================================
-- 0047_organizations_owner_profile_fk.sql
-- Adiciona um FK auxiliar de organizations.owner_user_id -> profiles.id
-- alem do FK ja existente para auth.users.id. Como profiles.id e 1:1
-- com auth.users.id por design, ambos FKs apontam para o mesmo conjunto
-- de UUIDs. O FK adicional permite que o PostgREST resolva relacoes
-- aninhadas (organizations.profiles) em selects de companies/usuarios.
-- =====================================================================

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_owner_profile_fkey
  FOREIGN KEY (owner_user_id)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;
