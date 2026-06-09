-- Site CMS — conteúdo institucional gerenciado pelo platform_admin:
-- cursos e clientes (com logo). Exibido nas páginas públicas /cursos e
-- /clientes. Escrita só por platform_admin; leitura pública dos ativos.

-- ── Cursos ──────────────────────────────────────────────────────────
create table if not exists public.site_courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  description text,
  duration text,
  level text,
  price_label text,
  image_path text,
  cta_url text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.site_courses enable row level security;

-- Leitura: ativos visíveis a todos (inclusive anon); admin vê tudo.
create policy site_courses_select on public.site_courses
  for select to anon, authenticated
  using (active or public.is_platform_admin());

-- Escrita: só platform_admin.
create policy site_courses_write on public.site_courses
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- ── Clientes ────────────────────────────────────────────────────────
create table if not exists public.site_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_path text,
  segment text,
  city text,
  testimonial text,
  website_url text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.site_clients enable row level security;

create policy site_clients_select on public.site_clients
  for select to anon, authenticated
  using (active or public.is_platform_admin());

create policy site_clients_write on public.site_clients
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- ── Bucket público para imagens de curso e logos de cliente ─────────
insert into storage.buckets (id, name, public)
values ('site-assets', 'site-assets', true)
on conflict (id) do nothing;

create policy "site-assets public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'site-assets');

create policy "site-assets admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'site-assets' and public.is_platform_admin());

create policy "site-assets admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'site-assets' and public.is_platform_admin());

create policy "site-assets admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'site-assets' and public.is_platform_admin());
