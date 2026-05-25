-- Wave 15 / Item B3: troca chamadas diretas `auth.uid()` em policies
-- por `(select auth.uid())`, transformando-as em InitPlan (uma execucao
-- por query) em vez de re-execucao por linha. Atinge os 5 casos
-- identificados pelo advisor "auth_rls_initplan" em profiles e
-- push_subscriptions.

-- profiles
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select
  using (public.is_master() or id = (select auth.uid()));

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update
  using (public.is_master() or id = (select auth.uid()))
  with check (public.is_master() or id = (select auth.uid()));

-- push_subscriptions
drop policy if exists "push_subs_select" on public.push_subscriptions;
create policy "push_subs_select" on public.push_subscriptions
  for select
  using (public.is_master() or user_id = (select auth.uid()));

drop policy if exists "push_subs_insert" on public.push_subscriptions;
create policy "push_subs_insert" on public.push_subscriptions
  for insert
  with check (user_id = (select auth.uid()));

drop policy if exists "push_subs_delete" on public.push_subscriptions;
create policy "push_subs_delete" on public.push_subscriptions
  for delete
  using (public.is_master() or user_id = (select auth.uid()));
