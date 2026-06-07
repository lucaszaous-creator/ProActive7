-- Remove as contas demo criadas para gerar o "Manual do Sistema" em PDF.
-- Não é uma migration (não vai para migrations/), é um one-shot que o
-- platform_admin executa manualmente no SQL editor do Supabase quando
-- as capturas de tela do manual já tiverem sido geradas.
--
-- Ordem importa por causa das FKs.

-- 1) Dados operacionais demo (filtrados por organização demo).
delete from public.temperature_logs where equipment_id in (
  select id from public.equipment
  where company_id = '22222222-2222-2222-2222-222222222222'
);
delete from public.equipment where company_id = '22222222-2222-2222-2222-222222222222';
delete from public.manipulator_asos where manipulator_id in (
  select id from public.manipulators
  where company_id = '22222222-2222-2222-2222-222222222222'
);
delete from public.manipulators where company_id = '22222222-2222-2222-2222-222222222222';
delete from public.label_prints where company_id = '22222222-2222-2222-2222-222222222222';
delete from public.non_conformities where company_id = '22222222-2222-2222-2222-222222222222';
delete from public.product_shelf_lives where product_id in (
  select id from public.products
  where company_id = '22222222-2222-2222-2222-222222222222'
);
delete from public.products where company_id = '22222222-2222-2222-2222-222222222222';
delete from public.product_groups where organization_id = '11111111-1111-1111-1111-111111111111';
delete from public.suppliers where organization_id = '11111111-1111-1111-1111-111111111111';

-- 2) Profiles demo
delete from public.profiles where id in (
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444'
);

-- 3) auth.users demo
delete from auth.users where id in (
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444'
);

-- 4) Empresa e organização demo
delete from public.companies where id = '22222222-2222-2222-2222-222222222222';
delete from public.organizations where id = '11111111-1111-1111-1111-111111111111';

select 'demo apagada' as result;
