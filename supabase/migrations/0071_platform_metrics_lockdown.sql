-- 0071_platform_metrics_lockdown.sql
-- CORRECAO DE SEGURANCA (cross-tenant leak): a view platform_org_metrics_v
-- estava com SELECT (e mais) concedido a anon e authenticated, expondo dados
-- de TODAS as organizacoes (inclusive via auth.users) para qualquer um.
--
-- Tranca o acesso direto e expoe os dados apenas via RPC SECURITY DEFINER
-- gated por is_platform_admin(). Para nao-admin a RPC devolve conjunto vazio.

create or replace function public.platform_org_metrics()
returns setof public.platform_org_metrics_v
language sql
security definer
set search_path = public
as $$
  select * from public.platform_org_metrics_v
  where public.is_platform_admin();
$$;

-- Tira o acesso direto a view (era a porta aberta)
revoke all on public.platform_org_metrics_v from anon, authenticated;

-- So usuarios logados podem chamar a RPC (e ela so devolve dados a admin)
revoke all on function public.platform_org_metrics() from public, anon;
grant execute on function public.platform_org_metrics() to authenticated;
