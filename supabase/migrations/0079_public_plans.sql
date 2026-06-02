-- =====================================================================
-- 0079_public_plans.sql — Planos visíveis na landing page (/sistema)
-- A tabela plans só é legível por usuários logados (0077). A landing é
-- anônima, então expomos APENAS os campos de marketing dos planos ativos
-- via RPC SECURITY DEFINER. Sem PII, sem dados de org. Assim, quando o
-- admin edita um plano no painel, ele reflete automaticamente no site.
-- =====================================================================

create or replace function public.public_plans()
returns table (
  key             text,
  name            text,
  company_limit   int,
  allowed_modules text[],
  price_cents     int,
  sort_order      int
) language sql stable security definer set search_path = public as $$
  select key, name, company_limit, allowed_modules, price_cents, sort_order
  from public.plans
  where active = true
  order by sort_order;
$$;

revoke all on function public.public_plans() from public;
grant execute on function public.public_plans() to anon, authenticated;
