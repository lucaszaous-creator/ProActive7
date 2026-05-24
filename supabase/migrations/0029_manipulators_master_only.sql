-- Apenas master (nutricionista RT) pode adicionar/editar/excluir
-- manipuladores, ASOs e treinamentos. Property continua lendo
-- (necessario para mostrar manipuladores no Select de "Responsavel"
-- ao imprimir etiqueta).

-- Manipulators: troca write irrestrito por master-only.
drop policy if exists "manipulators_write" on public.manipulators;

create policy "manipulators_master_write" on public.manipulators
  for all using (public.is_master())
  with check (public.is_master());

-- ASOs: troca write irrestrito por master-only.
drop policy if exists "asos_write" on public.manipulator_asos;

create policy "asos_master_write" on public.manipulator_asos
  for all using (public.is_master())
  with check (public.is_master());

-- Treinamentos: troca write irrestrito por master-only.
drop policy if exists "trainings_write" on public.manipulator_trainings;

create policy "trainings_master_write" on public.manipulator_trainings
  for all using (public.is_master())
  with check (public.is_master());

-- Storage employee-docs: apenas master grava/edita/apaga. Leitura
-- por empresa permanece (URLs assinadas usadas pela RT — property
-- nao precisa baixar). Mantemos employee_docs_select e restringimos
-- as outras tres.
drop policy if exists "employee_docs_insert" on storage.objects;
drop policy if exists "employee_docs_update" on storage.objects;
drop policy if exists "employee_docs_delete" on storage.objects;

create policy "employee_docs_master_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'employee-docs' and public.is_master());

create policy "employee_docs_master_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'employee-docs' and public.is_master());

create policy "employee_docs_master_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'employee-docs' and public.is_master());
