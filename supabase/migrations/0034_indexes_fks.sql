-- Wave 15 / Item B1: indices em todas as FKs nao indexadas
-- identificadas pelo advisor "unindexed_foreign_keys" (25 ocorrencias).
-- Cobertura preventiva para DELETE/UPDATE em massa nas tabelas pai.
-- pg_cron ja indexa o que precisa internamente; foco aqui eh FKs
-- publicas que aparecem em joins / cascades.

create index if not exists products_created_by_idx
  on public.products (created_by);
create index if not exists label_prints_printed_by_idx
  on public.label_prints (printed_by);
create index if not exists label_prints_product_id_idx
  on public.label_prints (product_id);
create index if not exists photos_uploaded_by_idx
  on public.photos (uploaded_by);
create index if not exists temperature_logs_recorded_by_idx
  on public.temperature_logs (recorded_by);
create index if not exists checklist_templates_created_by_idx
  on public.checklist_templates (created_by);
create index if not exists checklist_runs_photo_id_idx
  on public.checklist_runs (photo_id);
create index if not exists checklist_runs_ran_by_idx
  on public.checklist_runs (ran_by);
create index if not exists recipes_created_by_idx
  on public.recipes (created_by);
create index if not exists recipe_items_product_id_idx
  on public.recipe_items (product_id);
create index if not exists documents_approved_by_idx
  on public.documents (approved_by);
create index if not exists documents_created_by_idx
  on public.documents (created_by);
create index if not exists document_versions_saved_by_idx
  on public.document_versions (saved_by);
create index if not exists audit_templates_company_id_idx
  on public.audit_templates (company_id);
create index if not exists audits_auditor_id_idx
  on public.audits (auditor_id);
create index if not exists audits_parent_audit_id_idx
  on public.audits (parent_audit_id);
create index if not exists audits_template_id_idx
  on public.audits (template_id);
create index if not exists non_conformities_audit_id_idx
  on public.non_conformities (audit_id);
create index if not exists non_conformities_checklist_run_id_idx
  on public.non_conformities (checklist_run_id);
create index if not exists non_conformities_closed_by_idx
  on public.non_conformities (closed_by);
create index if not exists non_conformities_closing_photo_id_idx
  on public.non_conformities (closing_photo_id);
create index if not exists non_conformities_evidence_photo_id_idx
  on public.non_conformities (evidence_photo_id);
create index if not exists non_conformities_opened_by_idx
  on public.non_conformities (opened_by);
create index if not exists non_conformities_who_uuid_idx
  on public.non_conformities (who_uuid);
create index if not exists pest_control_services_provider_id_idx
  on public.pest_control_services (provider_id);
