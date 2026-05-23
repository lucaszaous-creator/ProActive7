-- =====================================================================
-- 0009_branding_tighten_listing.sql  —  Remove a policy de SELECT no
-- bucket "branding" para nao permitir listagem ampla. Como o bucket e
-- publico, o acesso por URL direta ja funciona sem essa policy.
-- =====================================================================

drop policy if exists branding_storage_select on storage.objects;
