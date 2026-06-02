-- =====================================================================
-- 0086_articles_site_author.sql
-- Corrige brecha: a política de escrita de `articles` permitia que QUALQUER
-- nutricionista (de qualquer org) editasse/apagasse/publicasse os artigos do
-- site público compartilhado. Agora a escrita exige platform_admin OU a flag
-- `is_site_author` no perfil (delegação controlada, default false).
-- =====================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_site_author boolean NOT NULL DEFAULT false;

-- Impede que não-admins alterem a própria flag (anti escalonamento).
CREATE OR REPLACE FUNCTION public.guard_profiles_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
begin
  if auth.uid() is not null and not public.is_master() then
    new.role            := old.role;
    new.company_id      := old.company_id;
    new.organization_id := old.organization_id;
    new.active          := old.active;
    new.is_site_author  := old.is_site_author;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.is_site_author()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(
    (select is_site_author from public.profiles where id = auth.uid()),
    false
  );
$$;

DROP POLICY IF EXISTS articles_admin_read ON public.articles;
DROP POLICY IF EXISTS articles_admin_write ON public.articles;

CREATE POLICY articles_admin_read ON public.articles FOR SELECT
  USING (public.is_platform_admin() OR public.is_site_author());

CREATE POLICY articles_admin_write ON public.articles FOR ALL
  USING (public.is_platform_admin() OR public.is_site_author())
  WITH CHECK (public.is_platform_admin() OR public.is_site_author());

REVOKE ALL ON FUNCTION public.is_site_author() FROM public;
GRANT EXECUTE ON FUNCTION public.is_site_author() TO authenticated;
