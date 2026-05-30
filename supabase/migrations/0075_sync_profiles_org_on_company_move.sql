-- 0075_sync_profiles_org_on_company_move.sql
--
-- Garante o vínculo property → org do nutri responsável MESMO quando uma
-- empresa é movida entre organizações. O trigger existente
-- (sync_profile_org_from_company) só reage a mudanças no PROFILE; este
-- propaga mudanças de organization_id da COMPANY para os profiles ligados
-- a ela. Fecha a brecha de borda em que um property ficaria com
-- organization_id defasado após a empresa trocar de org.

create or replace function public.sync_profiles_org_on_company_move()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.organization_id is distinct from OLD.organization_id then
    update public.profiles
       set organization_id = NEW.organization_id
     where company_id = NEW.id
       and organization_id is distinct from NEW.organization_id;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_sync_profiles_org_on_company_move on public.companies;
create trigger trg_sync_profiles_org_on_company_move
  after update of organization_id on public.companies
  for each row execute function public.sync_profiles_org_on_company_move();

-- Função de trigger não deve ser callable via /rpc.
revoke execute on function public.sync_profiles_org_on_company_move()
  from public, anon, authenticated;

-- Reconciliação defensiva de qualquer divergência atual (idempotente).
update public.profiles p
   set organization_id = c.organization_id
  from public.companies c
 where p.company_id = c.id
   and p.organization_id is distinct from c.organization_id;
