-- 0076_label_report_rpc.sql
--
-- Performance/escala: a ReportsPage puxava TODAS as etiquetas do período
-- para o navegador e agregava em JS (centenas de KB e segundos com volume).
-- Esta RPC faz a agregação no SQL e devolve só os buckets (dezenas de
-- linhas). SECURITY DEFINER com guard de tenant (mesma regra da RLS de
-- label_prints) — platform_admin vê tudo, nutri vê a org, property a empresa.

create or replace function public.label_report(
  p_company_id uuid,
  p_since timestamptz
)
returns table (dimension text, label text, value bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  -- Guard de tenant (replica a RLS de label_prints)
  if not (
    is_platform_admin()
    or (is_nutritionist() and p_company_id in (
      select id from public.companies where organization_id = current_organization_id()
    ))
    or p_company_id = current_company_id()
  ) then
    return; -- sem acesso → conjunto vazio
  end if;

  return query
  with lp as (
    select *
    from public.label_prints
    where company_id = p_company_id
      and printed_at >= p_since
  )
  select 'total'::text, 'total'::text, coalesce(sum(lp.quantity), 0)::bigint
  from lp
  union all
  select 'category', coalesce(p.category, 'Sem categoria'),
         coalesce(sum(lp.quantity), 0)::bigint
  from lp
  left join public.products p on p.id = lp.product_id
  group by coalesce(p.category, 'Sem categoria')
  union all
  select 'user',
         coalesce(pr.full_name, pr.email, 'Não identificado'),
         coalesce(sum(lp.quantity), 0)::bigint
  from lp
  left join public.profiles pr on pr.id = lp.printed_by
  group by coalesce(pr.full_name, pr.email, 'Não identificado')
  union all
  select 'condition', lp.storage_condition::text,
         coalesce(sum(lp.quantity), 0)::bigint
  from lp
  group by lp.storage_condition::text;
end;
$$;

revoke all on function public.label_report(uuid, timestamptz) from public, anon;
grant execute on function public.label_report(uuid, timestamptz) to authenticated;
