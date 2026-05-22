-- =====================================================================
-- 0015_push_subscriptions.sql  —  Inscricoes Web Push por usuario.
-- ---------------------------------------------------------------------
-- A edge function send-expiry-notifications le esta tabela 1x/dia e
-- envia push para os endpoints inscritos. endpoint e UNIQUE pois um
-- mesmo dispositivo nao deve receber duplicatas.
-- =====================================================================

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  endpoint    text not null unique,
  -- keys: { p256dh: "...", auth: "..." }
  keys        jsonb not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_user
  on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

-- O usuario so ve/edita suas proprias inscricoes; master ve todas.
create policy push_subs_select on public.push_subscriptions
  for select to authenticated
  using ( public.is_master() or user_id = auth.uid() );

create policy push_subs_insert on public.push_subscriptions
  for insert to authenticated
  with check ( user_id = auth.uid() );

create policy push_subs_delete on public.push_subscriptions
  for delete to authenticated
  using ( public.is_master() or user_id = auth.uid() );
