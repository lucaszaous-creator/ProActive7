-- =====================================================================
-- 0106_audit_field_work.sql — vistoria em campo: nota por seção,
-- assinatura do responsável da empresa e check-in geolocalizado
-- ---------------------------------------------------------------------
-- Paridade (e um passo além) com o que a cliente viu em apps
-- concorrentes de consultoria de alimentos:
--
--  * `section_notes`: observação por SEÇÃO do checklist, além da nota por
--    item e da observação geral que já existiam. Chave = nome da
--    categoria do item (o mesmo `category` de audit_templates.items), o
--    que evita criar tabela nova e sobrevive a renomear/reordenar seções
--    no modelo (a chave some do JSON e nada quebra).
--  * assinatura do RESPONSÁVEL DA EMPRESA (quem recebeu a visita), com
--    nome e cargo — a assinatura da RT (`signature_path`) continua como
--    está. Duas assinaturas fazem do relatório um documento de ciência,
--    não só um laudo unilateral.
--  * check-in geolocalizado: comprova que a visita aconteceu no local.
--    Capturado no navegador, com consentimento do próprio browser, e
--    guardado com a precisão informada pelo GPS.
--
-- LGPD: a geolocalização é do ESTABELECIMENTO visitado (endereço
-- comercial já conhecido no cadastro), não rastreamento do profissional
-- — é gravada uma vez, no início da vistoria, e nunca em background.
-- =====================================================================

alter table public.audits
  add column if not exists section_notes    jsonb not null default '{}'::jsonb,
  add column if not exists client_signature_path text,
  add column if not exists client_signer_name    text,
  add column if not exists client_signer_role    text,
  add column if not exists latitude         numeric(9,6),
  add column if not exists longitude        numeric(9,6),
  add column if not exists geo_accuracy_m   numeric(8,1),
  add column if not exists geo_captured_at  timestamptz;

comment on column public.audits.section_notes is
  'Observação por seção do checklist: { "<categoria>": "texto" }. Chave = audit_templates.items[].category.';
comment on column public.audits.client_signature_path is
  'Assinatura de ciência do responsável da empresa (bucket signatures, sufixo -cliente.png).';
comment on column public.audits.client_signer_name is
  'Nome de quem recebeu a visita e assinou pela empresa.';
comment on column public.audits.client_signer_role is
  'Cargo/função de quem assinou pela empresa (ex.: gerente, cozinheiro-chefe).';
comment on column public.audits.latitude is
  'Check-in da vistoria: latitude capturada no início (LGPD: local do estabelecimento, não rastreio contínuo).';
comment on column public.audits.geo_accuracy_m is
  'Precisão em metros informada pelo GPS no check-in.';
