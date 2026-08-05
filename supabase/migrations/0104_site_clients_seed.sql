-- Carta de clientes da apresentacao institucional -> site_clients.
--
-- Ate aqui a lista vivia so no bundle (src/lib/clientRoster.ts): o site
-- mostrava os clientes, mas /platform/clientes aparecia vazia e a nutri nao
-- tinha como editar, reordenar ou tirar uma marca do ar sem deploy. Esta
-- migration passa a lista para o banco, que vira a fonte de verdade.
--
-- Os logos continuam sendo arquivos estaticos do proprio site
-- (public/clientes/*.webp). Por isso logo_path guarda um caminho absoluto
-- comecando com "/", que siteAssetUrl() devolve como esta em vez de montar
-- URL do bucket. Custo zero: nada ocupa Storage.

alter table public.site_clients
  add column if not exists slug text,
  add column if not exists units text[] not null default '{}'::text[];

comment on column public.site_clients.slug is
  'Chave estavel dos clientes semeados pela apresentacao. Null nos criados pela tela.';
comment on column public.site_clients.units is
  'Enderecos da mesma marca (ex.: Padaria Panini: Riviera, Cavaleiros, Centro).';

-- Indice unico NAO parcial de proposito. Um indice parcial (WHERE slug is
-- not null) nao pode ser inferido por "on conflict (slug)" sem repetir o
-- predicado, e isso quebra qualquer upsert futuro nesta coluna com um
-- 42P10 nada obvio. Sem o WHERE, NULL continua sendo distinto de NULL,
-- entao as linhas criadas pela tela (slug null) seguem convivendo.
--
-- drop + create em vez de "if not exists": se uma tentativa anterior
-- deixou a versao parcial no banco, o "if not exists" a manteria e o
-- insert abaixo falharia de novo.
drop index if exists public.site_clients_slug_key;
create unique index site_clients_slug_key
  on public.site_clients (slug);

-- Idempotente: rodar de novo nao duplica nem sobrescreve edicao manual.
insert into public.site_clients (slug, name, segment, logo_path, units, sort_order)
values
  ('royal-macae', 'Hotel Royal Macaé', 'Apart hotel e hotéis', '/clientes/royal-macae.webp', '{}'::text[], 0),
  ('royal-urban', 'Hotel Royal Urban', 'Apart hotel e hotéis', '/clientes/royal-urban.webp', '{}'::text[], 1),
  ('royal-atlantica', 'Hotel Royal Atlântica', 'Apart hotel e hotéis', '/clientes/royal-atlantica.webp', '{}'::text[], 2),
  ('royal-kingdom', 'Hotel Royal Kingdom', 'Apart hotel e hotéis', '/clientes/royal-kingdom.webp', '{}'::text[], 3),
  ('wyndham', 'Hotel Wyndham', 'Apart hotel e hotéis', '/clientes/wyndham.webp', '{}'::text[], 4),
  ('hotel-dubai', 'Hotel Dubai', 'Apart hotel e hotéis', '/clientes/hotel-dubai.webp', '{}'::text[], 5),
  ('brisa-tropical', 'Hotel Brisa Tropical', 'Apart hotel e hotéis', '/clientes/brisa-tropical.webp', '{}'::text[], 6),
  ('office-loft', 'Apart Hotel Office Loft', 'Apart hotel e hotéis', '/clientes/office-loft.webp', '{}'::text[], 7),
  ('adoleta', 'Adoleta Creche e Escola', 'Creches e escolas', '/clientes/adoleta.webp', '{}'::text[], 8),
  ('colegio-angular', 'Colégio Angular', 'Creches e escolas', null, '{}'::text[], 9),
  ('nutribom', 'Fábrica Nutribom', 'Fábricas', '/clientes/nutribom.webp', '{}'::text[], 10),
  ('minas-pao', 'Fábrica Minas Pão', 'Fábricas', '/clientes/minas-pao.webp', '{}'::text[], 11),
  ('panini', 'Padaria Panini', 'Padarias e hamburguerias', '/clientes/panini.webp', array['Riviera', 'Cavaleiros', 'Centro'], 12),
  ('macahe-burguer', 'Macahé Burguer', 'Padarias e hamburguerias', '/clientes/macahe-burguer.webp', array['Novo Horizonte', 'Glória', 'Centro', 'Rio das Ostras'], 13),
  ('santa-lenha', 'Pizzaria Santa Lenha', 'Pizzarias e pastelaria', '/clientes/santa-lenha.webp', '{}'::text[], 14),
  ('pizzaria-cristiano', 'Pizzaria do Cristiano', 'Pizzarias e pastelaria', '/clientes/pizzaria-cristiano.webp', '{}'::text[], 15),
  ('vicoli', 'Vicoli', 'Pizzarias e pastelaria', '/clientes/vicoli.webp', '{}'::text[], 16),
  ('vicolina', 'Vicolina', 'Pizzarias e pastelaria', '/clientes/vicolina.webp', '{}'::text[], 17),
  ('pastel-da-paulista', 'Pastel da Paulista', 'Pizzarias e pastelaria', '/clientes/pastel-da-paulista.webp', '{}'::text[], 18),
  ('blue-line', 'Blue Line', 'Restaurantes e café', '/clientes/blue-line.webp', '{}'::text[], 19),
  ('finalmente-bistro', 'Finalmente Bistrô', 'Restaurantes e café', '/clientes/finalmente-bistro.webp', '{}'::text[], 20),
  ('cafe-da-dri', 'Café da Dri', 'Restaurantes e café', '/clientes/cafe-da-dri.webp', '{}'::text[], 21),
  ('folhas-frutos', 'Folhas & Frutos', 'Hortifrutis, minimercados e supermercado', '/clientes/folhas-frutos.webp', array['Barreto', 'São Marcos', 'Aeroporto', 'Cavaleiros', 'Galpão Distribuição', 'Galpão Rancho Off Shore'], 22),
  ('machado', 'Supermercado Machado', 'Hortifrutis, minimercados e supermercado', '/clientes/machado.webp', '{}'::text[], 23),
  ('la-quitanda', 'La Quitanda', 'Mercado saudável e especiarias naturais', '/clientes/la-quitanda.webp', '{}'::text[], 24),
  ('especiarias-naturais', 'Especiarias Naturais', 'Mercado saudável e especiarias naturais', '/clientes/especiarias-naturais.webp', '{}'::text[], 25),
  ('joeli', 'Joeli Buffet e Eventos', 'Buffet e eventos', '/clientes/joeli.webp', '{}'::text[], 26)
on conflict (slug) do nothing;
