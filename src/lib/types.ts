export type UserRole =
  | 'master'
  | 'platform_admin'
  | 'nutritionist'
  | 'property_manager'
  | 'property';

export interface Organization {
  id: string;
  name: string;
  slug: string | null;
  status: 'active' | 'suspended';
  logo_path: string | null;
  primary_color: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  owner_user_id: string | null;
  plan_key: string | null;
  trial_ends_at: string | null;
  plan_renews_at: string | null;
  allow_impersonation: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}
export type StorageCondition = 'ambiente' | 'refrigerado' | 'congelado';
export type ValidityUnit = 'hours' | 'days';

export const STORAGE_CONDITION_LABELS: Record<StorageCondition, string> = {
  ambiente: 'Ambiente',
  refrigerado: 'Refrigerado',
  congelado: 'Congelado',
};

export const VALIDITY_UNIT_LABELS: Record<ValidityUnit, string> = {
  hours: 'horas',
  days: 'dias',
};

export interface LabelSettings {
  show_phone?: boolean;
  show_address?: boolean;
  show_responsible?: boolean;
  /** Cor primaria hex (#rrggbb) usada como acento no preview e na pagina publica. */
  primary_color?: string;
}

export interface Company {
  id: string;
  name: string;
  cnpj: string | null;
  address: string | null;
  phone: string | null;
  active: boolean;
  logo_path: string | null;
  label_settings: LabelSettings;
  organization_id: string | null;
  created_at: string;
  updated_at: string;
  /** Soft delete (0037). Ausente em selects parciais. */
  deleted_at?: string | null;
}

export interface Profile {
  id: string;
  company_id: string | null;
  organization_id: string | null;
  role: UserRole;
  full_name: string | null;
  email: string | null;
  active: boolean;
  crn: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Plan {
  key: string;
  name: string;
  company_limit: number | null;
  allowed_modules: string[];
  price_cents: number;
  active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface OrgSubscription {
  organization_id: string;
  organization_name: string;
  status: 'active' | 'suspended';
  plan_key: string | null;
  plan_name: string | null;
  allowed_modules: string[];
  company_limit: number | null;
  company_count: number;
  trial_ends_at: string | null;
  plan_renews_at: string | null;
}

/** Tamanhos disponíveis para impressão de etiquetas. Bate com LABEL_SIZES no wizard. */
export type LabelSizeId = '60x60' | '60x40' | '80x60' | '50x30';

export const LABEL_SIZE_LABELS: Record<LabelSizeId, string> = {
  '60x60': '60 × 60 mm',
  '60x40': '60 × 40 mm',
  '80x60': '80 × 60 mm',
  '50x30': '50 × 30 mm',
};

export const DEFAULT_LABEL_SIZE: LabelSizeId = '60x60';

export interface Product {
  id: string;
  company_id: string | null;
  name: string;
  category: string | null;
  group_id: string | null;
  is_controlled: boolean;
  default_storage_condition: StorageCondition;
  /** Cadastrado pela nutri (RT). NULL = usa o padrão do sistema (60x60). */
  default_label_size: LabelSizeId | null;
  active: boolean;
  allergens: string[];
  is_seed: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductGroup {
  id: string;
  organization_id: string;
  name: string;
  color: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductShelfLife {
  id: string;
  product_id: string;
  storage_condition: StorageCondition;
  validity_value: number;
  validity_unit: ValidityUnit;
  created_at: string;
  updated_at: string;
}

export interface ProductWithShelfLives extends Product {
  product_shelf_lives: ProductShelfLife[];
}

export type LabelConsumedReason = 'producao' | 'descarte' | 'vencimento';

export const LABEL_CONSUMED_REASON_LABELS: Record<LabelConsumedReason, string> =
  {
    producao: 'Uso na produção',
    descarte: 'Descarte',
    vencimento: 'Vencimento',
  };

export interface LabelPrint {
  id: string;
  company_id: string;
  product_id: string | null;
  product_name_snapshot: string;
  storage_condition: StorageCondition;
  manipulation_at: string;
  expiry_at: string;
  responsible_name: string;
  quantity: number;
  batch: string | null;
  supplier: string | null;
  fabricated_at: string | null;
  original_expiry_at: string | null;
  display_quantity: string | null;
  allergens: string[];
  printed_by: string | null;
  printed_at: string;
  consumed_at: string | null;
  consumed_by: string | null;
  consumed_reason: LabelConsumedReason | null;
  created_at: string;
}

export type EquipmentType = 'freezer' | 'geladeira' | 'estufa';

export const EQUIPMENT_TYPE_LABELS: Record<EquipmentType, string> = {
  freezer: 'Freezer',
  geladeira: 'Geladeira',
  estufa: 'Estufa',
};

export interface Equipment {
  id: string;
  company_id: string;
  name: string;
  type: EquipmentType;
  temp_min: number;
  temp_max: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TemperatureLog {
  id: string;
  equipment_id: string;
  recorded_at: string;
  temperature: number;
  notes: string | null;
  recorded_by: string | null;
  /** Foto opcional do termômetro/equipamento no momento da leitura. */
  photo_id: string | null;
  created_at: string;
}

export type ChecklistFrequency = 'daily' | 'weekly' | 'monthly';

export const CHECKLIST_FREQUENCY_LABELS: Record<ChecklistFrequency, string> = {
  daily: 'Diária',
  weekly: 'Semanal',
  monthly: 'Mensal',
};

export interface ChecklistItem {
  id: string;
  text: string;
}

export interface ChecklistTemplate {
  id: string;
  company_id: string | null;
  name: string;
  items: ChecklistItem[];
  frequency: ChecklistFrequency;
  active: boolean;
  is_global: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChecklistRunItem {
  id: string;
  checked: boolean;
  note?: string;
}

export interface Recipe {
  id: string;
  company_id: string;
  name: string;
  yield_amount: string | null;
  /** Rendimento em porções — base do custo por porção e do per capita (0107). */
  yield_portions: number | null;
  /** Peso (g) de uma porção servida (0107). */
  portion_grams: number | null;
  prep_time_minutes: number | null;
  instructions: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecipeItem {
  id: string;
  recipe_id: string;
  product_id: string;
  quantity: number;
  unit: string;
  /** Peso bruto / peso líquido. 1 = sem perda de limpeza (0107). */
  correction_factor: number;
  /** Custo do ingrediente nesta ficha, em centavos (0107). */
  cost_cents: number | null;
  sort_order: number;
  created_at: string;
}

export interface RecipeWithItems extends Recipe {
  recipe_items: (RecipeItem & { product: { name: string } | null })[];
}

export interface ChecklistRun {
  id: string;
  template_id: string;
  ran_by: string | null;
  ran_at: string;
  items: ChecklistRunItem[];
  notes: string | null;
  photo_id: string | null;
  created_at: string;
}

export type PestServiceType =
  | 'desinsetizacao'
  | 'desratizacao'
  | 'descupinizacao'
  | 'sanitizacao'
  | 'outro';

export const PEST_SERVICE_TYPE_LABELS: Record<PestServiceType, string> = {
  desinsetizacao: 'Desinsetização',
  desratizacao: 'Desratização',
  descupinizacao: 'Descupinização',
  sanitizacao: 'Sanitização',
  outro: 'Outro',
};

export interface PestControlProvider {
  id: string;
  company_id: string;
  name: string;
  cnpj: string | null;
  license_number: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PestControlService {
  id: string;
  company_id: string;
  provider_id: string | null;
  service_type: PestServiceType;
  performed_at: string;
  next_due_at: string | null;
  products_used: string | null;
  responsible_technician: string | null;
  certificate_path: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Manipulator {
  id: string;
  company_id: string;
  full_name: string;
  cpf: string | null;
  role: string | null;
  hired_at: string | null;
  active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ManipulatorAso {
  id: string;
  manipulator_id: string;
  issued_at: string;
  expires_at: string;
  doctor_name: string | null;
  doctor_crm: string | null;
  file_path: string | null;
  notes: string | null;
  created_at: string;
}

export interface ManipulatorTraining {
  id: string;
  manipulator_id: string;
  topic: string;
  hours: number | null;
  completed_at: string;
  expires_at: string | null;
  instructor: string | null;
  certificate_path: string | null;
  notes: string | null;
  created_at: string;
}

export type NcSeverity = 'low' | 'medium' | 'high' | 'critical';
export type NcStatus = 'open' | 'in_progress' | 'closed' | 'cancelled';
export type NcSource = 'audit' | 'checklist' | 'manual';

export const NC_SEVERITY_LABELS: Record<NcSeverity, string> = {
  low: 'Baixa',
  medium: 'Media',
  high: 'Alta',
  critical: 'Critica',
};

export const NC_STATUS_LABELS: Record<NcStatus, string> = {
  open: 'Aberta',
  in_progress: 'Em andamento',
  closed: 'Fechada',
  cancelled: 'Cancelada',
};

export interface NonConformity {
  id: string;
  company_id: string;
  audit_id: string | null;
  checklist_run_id: string | null;
  source: NcSource;
  category: string | null;
  description: string;
  severity: NcSeverity;
  status: NcStatus;
  what: string | null;
  why: string | null;
  where_loc: string | null;
  when_due: string | null;
  who_uuid: string | null;
  how: string | null;
  how_much: number | null;
  evidence_photo_id: string | null;
  closing_photo_id: string | null;
  closing_note: string | null;
  opened_by: string | null;
  opened_at: string;
  closed_by: string | null;
  closed_at: string | null;
  updated_at: string;
  /** De qual modelo esta NC nasceu (migration 0103). */
  nc_template_id: string | null;
}

/**
 * Modelo de nao-conformidade (migration 0103): problema recorrente com o
 * plano de acao 5W2H ja pronto. Escopo de organizacao — qualquer nutri da
 * org cria e edita, e vale para todas as empresas dela.
 */
export interface NcTemplate {
  id: string;
  organization_id: string;
  /** Rotulo curto na lista ("Manipulador sem touca"). */
  name: string;
  category: string | null;
  severity: NcSeverity;
  /** Texto que vai para a descricao da NC. */
  description: string;
  what: string | null;
  why: string | null;
  where_loc: string | null;
  how: string | null;
  how_much: number | null;
  /** Prazo em dias a contar da abertura — vira o `when_due` da NC. */
  default_due_days: number;
  active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type AuditStatus =
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type AuditResult = 'C' | 'NC' | 'NA';

export interface AuditItem {
  id: string;
  category: string;
  text: string;
  weight: number;
  legal_ref?: string;
  /**
   * Plano de acao padrao (migration 0103). Quando o item e reprovado na
   * visita, a NC nasce preenchida a partir deste modelo em vez de virar
   * so o texto da pergunta.
   */
  nc_template_id?: string | null;
}

export interface AuditResponse {
  itemId: string;
  result: AuditResult;
  note?: string;
  photo_id?: string;
}

export interface AuditTemplate {
  id: string;
  company_id: string | null;
  /**
   * Escopo do modelo (migration 0102). Exatamente um dos tres vale:
   *  - is_global          -> catalogo da plataforma
   *  - organization_id    -> modelo da consultoria, todas as empresas dela
   *  - company_id         -> modelo de uma empresa so
   */
  organization_id: string | null;
  name: string;
  items: AuditItem[];
  is_global: boolean;
  /** Modelo aposentado: some do seletor de agendamento, mas o historico fica. */
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type AuditTemplateScope = 'global' | 'organization' | 'company';

export function auditTemplateScope(t: AuditTemplate): AuditTemplateScope {
  if (t.is_global) return 'global';
  return t.company_id ? 'company' : 'organization';
}

export interface Audit {
  id: string;
  company_id: string;
  template_id: string | null;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  auditor_id: string | null;
  status: AuditStatus;
  score: number | null;
  responses: AuditResponse[];
  notes: string | null;
  /** Observação por seção do checklist: { [categoria]: texto } (0106). */
  section_notes: Record<string, string> | null;
  signature_path: string | null;
  /** Assinatura de ciência de quem recebeu a visita pela empresa (0106). */
  client_signature_path: string | null;
  client_signer_name: string | null;
  client_signer_role: string | null;
  /** Check-in geolocalizado do início da vistoria (0106). */
  latitude: number | null;
  longitude: number | null;
  geo_accuracy_m: number | null;
  geo_captured_at: string | null;
  recurrence_months: number | null;
  parent_audit_id: string | null;
  created_at: string;
  updated_at: string;
}

export type DocumentType =
  | 'mbp'
  | 'pop_higienizacao'
  | 'pop_agua'
  | 'pop_manipuladores'
  | 'pop_residuos'
  | 'pop_manutencao';

export type DocumentStatus = 'draft' | 'published' | 'archived';

export interface ComplianceDocument {
  id: string;
  company_id: string;
  type: DocumentType;
  title: string;
  content_md: string;
  version: number;
  status: DocumentStatus;
  approved_by: string | null;
  approved_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Documento livre anexado a uma empresa — alvarás, contratos,
 * comprovantes, laudos, etc. Diferente de `documents` (Manual de Boas
 * Práticas e POPs em markdown). Aceita PDF/imagem.
 */
export interface CompanyFile {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  /** Categoria do documento (ver COMPANY_FILE_CATEGORIES). NULL = outros. */
  category: string | null;
  file_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  uploaded_by: string | null;
  uploaded_at: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyFileCategory {
  key: string;
  label: string;
  /** Observação curta (ex.: "Entregue pelo fiscal", "Últimos 3 meses"). */
  hint?: string;
}

export interface CompanyFileGroup {
  group: string;
  /** Observação do grupo (ex.: "Apenas se utilizar carro-pipa"). */
  note?: string;
  items: CompanyFileCategory[];
}

/**
 * Catálogo de documentos por empresa, organizado conforme a LISTA DA
 * VIGILÂNCIA SANITÁRIA 2026 enviada pela RT (Ariane). Cada item é uma
 * "gaveta" de upload — a nutri/gerente carrega o arquivo do
 * estabelecimento ali (sem edição de texto). A ordem define a exibição.
 */
export const COMPANY_FILE_GROUPS: CompanyFileGroup[] = [
  {
    group: 'Contabilidade',
    items: [
      { key: 'cont_alvara', label: 'Alvará da contadora' },
      { key: 'cont_cnpj', label: 'Cartão CNPJ da contadora' },
      { key: 'cont_contrato', label: 'Contrato social da contadora' },
    ],
  },
  {
    group: 'Funcionários e saúde',
    items: [
      { key: 'aso', label: 'Atestados (ASO)', hint: 'Manter atualizados' },
      {
        key: 'exame_fezes',
        label: 'Exames de fezes',
        hint: 'Manter atualizados',
      },
      {
        key: 'relacao_funcionarios',
        label: 'Relação de funcionários, responsáveis e proprietários',
        hint: 'Com as respectivas funções',
      },
      {
        key: 'cert_curso_bp',
        label: 'Certificado do Curso de Boas Práticas',
      },
    ],
  },
  {
    group: 'Controles periódicos',
    note: 'Certificado + ordem de serviço — últimos 3 meses',
    items: [
      {
        key: 'dedetizacao',
        label: 'Dedetização',
        hint: 'Certificado, ordem de serviço e LAS',
      },
      {
        key: 'reservatorio_agua',
        label: 'Higienização de reservatório de água',
        hint: 'Certificado, ordem de serviço e LAS',
      },
      {
        key: 'ar_condicionado',
        label: 'Limpeza de ar condicionado + PMOC',
        hint: 'Certificado, OS e plano de manutenção (PMOC)',
      },
      {
        key: 'coleta_oleo',
        label: 'Comprovante de coleta de óleo',
        hint: 'Se usar óleo para fritura',
      },
    ],
  },
  {
    group: 'Manuais e planilhas',
    items: [
      {
        key: 'mbp',
        label: 'Manual de Boas Práticas',
        hint: 'Elaborado pela RT (Ariane)',
      },
      { key: 'cronograma_limpeza', label: 'Cronograma de limpeza dos setores' },
      {
        key: 'plan_temp_equip',
        label: 'Planilha de temperatura — equipamentos',
      },
      {
        key: 'plan_temp_receb',
        label: 'Planilha de temperatura — recebimento',
      },
    ],
  },
  {
    group: 'Carro-pipa',
    note: 'Apenas se utilizar carro-pipa',
    items: [
      { key: 'pipa_uta', label: 'Licença da UTA' },
      { key: 'pipa_crsv', label: 'CRSV do caminhão' },
      { key: 'pipa_laudo', label: 'Laudo de potabilidade do caminhão' },
      {
        key: 'pipa_etiqueta',
        label: 'Etiqueta de quantidade de água e condição do cloro',
      },
    ],
  },
  {
    group: 'Licenciamento e fiscal',
    items: [
      {
        key: 'guia_licenca',
        label: 'Guia de licença sanitária 2026',
        hint: 'Entregue pelo fiscal',
      },
      {
        key: 'roteiro_inspecao',
        label: 'Roteiro de auto inspeção assinado',
        hint: 'Entregue pelo fiscal',
      },
      {
        key: 'autodeclaracao',
        label: 'Autodeclaração — licenciamento sanitário assinado',
        hint: 'Entregue pelo fiscal',
      },
      { key: 'selo_abc', label: 'Selo de Categorização ABC' },
      { key: 'alvara', label: 'Outros alvarás e licenças' },
    ],
  },
  {
    group: 'Outros',
    items: [{ key: 'outro', label: 'Outros documentos' }],
  },
];

/** Lista achatada de todas as categorias (na ordem dos grupos). */
export const COMPANY_FILE_CATEGORIES: CompanyFileCategory[] =
  COMPANY_FILE_GROUPS.flatMap((g) => g.items);

export const COMPANY_FILE_CATEGORY_LABELS: Record<string, string> =
  Object.fromEntries(COMPANY_FILE_CATEGORIES.map((c) => [c.key, c.label]));

export interface Photo {
  id: string;
  company_id: string;
  storage_path: string;
  original_name: string | null;
  description: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  organization_id: string;
  name: string;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type ReceivingUnit = 'kg' | 'g' | 'un' | 'L' | 'mL' | 'cx';

export const RECEIVING_UNIT_LABELS: Record<ReceivingUnit, string> = {
  kg: 'kg',
  g: 'g',
  un: 'un',
  L: 'L',
  mL: 'mL',
  cx: 'cx',
};

export const RECEIVING_UNITS: ReceivingUnit[] = [
  'kg',
  'g',
  'un',
  'L',
  'mL',
  'cx',
];

export interface Receiving {
  id: string;
  company_id: string;
  supplier_id: string | null;
  invoice_nf: string | null;
  received_at: string;
  received_by: string | null;
  notes: string | null;
  photo_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReceivingItem {
  id: string;
  receiving_id: string;
  product_id: string;
  batch: string;
  quantity: number;
  unit: ReceivingUnit;
  temp_at_arrival: number | null;
  manufacturing_date: string | null;
  expiry_date: string | null;
  storage_condition: StorageCondition | null;
  rejected: boolean;
  rejection_reason: string | null;
  created_at: string;
}

export interface ReceivingWithRelations extends Receiving {
  supplier: { id: string; name: string } | null;
  receiving_items: (ReceivingItem & {
    product: { id: string; name: string } | null;
  })[];
}

export type StockMovementKind =
  | 'entrada'
  | 'saida'
  | 'ajuste'
  | 'descarte'
  | 'vencimento';

export const STOCK_MOVEMENT_KIND_LABELS: Record<StockMovementKind, string> = {
  entrada: 'Entrada',
  saida: 'Saída',
  ajuste: 'Ajuste',
  descarte: 'Descarte',
  vencimento: 'Vencimento',
};

export const STOCK_EXIT_REASONS: { value: StockMovementKind; label: string }[] =
  [
    { value: 'saida', label: 'Uso na produção / venda' },
    { value: 'descarte', label: 'Descarte (qualidade)' },
    { value: 'vencimento', label: 'Vencimento' },
    { value: 'ajuste', label: 'Ajuste de inventário' },
  ];

export interface StockMovement {
  id: string;
  company_id: string;
  product_id: string;
  batch: string;
  quantity_delta: number;
  unit: ReceivingUnit;
  kind: StockMovementKind;
  reason: string | null;
  reference_type: 'receiving_item' | 'manual' | 'production' | null;
  reference_id: string | null;
  moved_at: string;
  moved_by: string | null;
  created_at: string;
}

export interface StockBalance {
  company_id: string;
  product_id: string;
  batch: string;
  balance: number;
  unit: ReceivingUnit;
  oldest_expiry: string | null;
}
