-- =====================================================================
-- 0006_profiles_update_guard.sql  —  Bloqueia escalonamento de privilegio
-- ---------------------------------------------------------------------
-- A policy profiles_update (0002_rls.sql) permite que um usuario property
-- atualize a propria linha. Sem esta protecao ele poderia alterar role,
-- company_id ou active e se autopromover a master ou trocar de empresa.
--
-- Este trigger BEFORE UPDATE forca essas colunas aos valores antigos
-- quando o chamador NAO e master. Casos:
--   * usuario master            -> is_master() = true  -> passa livre;
--   * service role (edge funcs) -> auth.uid() is null   -> passa livre;
--   * usuario property          -> restrito a full_name.
-- =====================================================================

create or replace function public.guard_profiles_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_master() then
    new.role       := old.role;
    new.company_id := old.company_id;
    new.active     := old.active;
  end if;
  return new;
end;
$$;

revoke execute on function public.guard_profiles_update()
  from public, anon, authenticated;

create trigger trg_profiles_update_guard
  before update on public.profiles
  for each row execute function public.guard_profiles_update();
