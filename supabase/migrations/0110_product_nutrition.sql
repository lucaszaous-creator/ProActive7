-- =====================================================================
-- 0110_product_nutrition.sql
--
-- INFORMACAO NUTRICIONAL POR INGREDIENTE, para a ficha tecnica calcular a
-- tabela nutricional da preparacao (RDC 429/2020 + IN 75/2020).
--
-- Fica em tabela separada de `products` de proposito:
--   - a maioria dos produtos NUNCA vai ter esses dados (embalagem, material
--     de limpeza, descartavel), e seriam 10 colunas nulas em todas as linhas;
--   - a origem do dado importa e precisa viajar junto (`source`): rotulo do
--     fornecedor e TACO nao tem o mesmo peso legal.
--
-- POR QUE NAO VEM COM DADOS PRONTOS: prazo de validade errado gera uma
-- nao-conformidade; valor nutricional errado vira ALEGACAO IMPRESSA no
-- rotulo que chega ao consumidor. Semear numeros de composicao que ninguem
-- conferiu seria empurrar risco legal para a RT (CLAUDE.md §2 e §4). A
-- plataforma da a conta e a rastreabilidade da fonte; o numero entra por
-- quem responde por ele.
--
-- Base: 100 g de parte comestivel — o mesmo denominador da TACO e do
-- rotulo do fornecedor, entao a RT copia sem converter nada.
-- =====================================================================

create table if not exists public.product_nutrition (
  product_id uuid primary key
    references public.products(id) on delete cascade,

  -- Tudo por 100 g. Nulo = "nao informado", diferente de zero.
  energy_kcal   numeric(8,2) check (energy_kcal   is null or energy_kcal   >= 0),
  protein_g     numeric(8,2) check (protein_g     is null or protein_g     >= 0),
  carb_g        numeric(8,2) check (carb_g        is null or carb_g        >= 0),
  total_sugars_g numeric(8,2) check (total_sugars_g is null or total_sugars_g >= 0),
  added_sugars_g numeric(8,2) check (added_sugars_g is null or added_sugars_g >= 0),
  fat_g         numeric(8,2) check (fat_g         is null or fat_g         >= 0),
  sat_fat_g     numeric(8,2) check (sat_fat_g     is null or sat_fat_g     >= 0),
  trans_fat_g   numeric(8,2) check (trans_fat_g   is null or trans_fat_g   >= 0),
  fiber_g       numeric(8,2) check (fiber_g       is null or fiber_g       >= 0),
  sodium_mg     numeric(10,2) check (sodium_mg    is null or sodium_mg     >= 0),

  -- De onde veio o numero. Sai no rodape da tabela nutricional: a RT
  -- precisa poder defender cada valor depois.
  source text not null default 'manual'
    check (source in ('taco', 'rotulo', 'ibge', 'usda', 'manual')),
  source_note text,

  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.product_nutrition is
  'Composicao por 100 g de parte comestivel. Preenchida pela RT; a origem fica em `source` porque rotulo de fornecedor e tabela de referencia nao tem o mesmo peso legal.';

drop trigger if exists trg_product_nutrition_updated on public.product_nutrition;
create trigger trg_product_nutrition_updated
  before update on public.product_nutrition
  for each row execute function public.set_updated_at();

-- ---------- RLS ----------
-- Herda o alcance de `products`: a subconsulta abaixo tambem passa pela RLS
-- de products, entao "ve a nutricao de quem ve o produto" sai de graca e
-- nao existe um segundo lugar para o escopo divergir.

alter table public.product_nutrition enable row level security;

drop policy if exists product_nutrition_select on public.product_nutrition;
create policy product_nutrition_select on public.product_nutrition
  for select to authenticated
  using (
    exists (select 1 from public.products p where p.id = product_id)
  );

-- Escrita: dado tecnico que embasa rotulo — so a RT (e o platform_admin no
-- catalogo seed). Produto seed nao e editavel por nutricionista, senao uma
-- org mudaria a composicao que todas as outras enxergam.
drop policy if exists product_nutrition_insert on public.product_nutrition;
create policy product_nutrition_insert on public.product_nutrition
  for insert to authenticated
  with check (
    public.is_platform_admin()
    OR (
      public.is_nutritionist()
      AND exists (
        select 1 from public.products p
         where p.id = product_id and p.is_seed = false
      )
    )
  );

drop policy if exists product_nutrition_update on public.product_nutrition;
create policy product_nutrition_update on public.product_nutrition
  for update to authenticated
  using (
    public.is_platform_admin()
    OR (
      public.is_nutritionist()
      AND exists (
        select 1 from public.products p
         where p.id = product_id and p.is_seed = false
      )
    )
  )
  with check (
    public.is_platform_admin()
    OR (
      public.is_nutritionist()
      AND exists (
        select 1 from public.products p
         where p.id = product_id and p.is_seed = false
      )
    )
  );

drop policy if exists product_nutrition_delete on public.product_nutrition;
create policy product_nutrition_delete on public.product_nutrition
  for delete to authenticated
  using (
    public.is_platform_admin()
    OR (
      public.is_nutritionist()
      AND exists (
        select 1 from public.products p
         where p.id = product_id and p.is_seed = false
      )
    )
  );

-- `updated_by` vem do servidor: quem assina o dado nao pode ser escolhido
-- pelo cliente.
create or replace function public.set_product_nutrition_author()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_by := auth.uid();
  return new;
end;
$$;

revoke all on function public.set_product_nutrition_author() from public, anon, authenticated;

drop trigger if exists trg_product_nutrition_author on public.product_nutrition;
create trigger trg_product_nutrition_author
  before insert or update on public.product_nutrition
  for each row execute function public.set_product_nutrition_author();
