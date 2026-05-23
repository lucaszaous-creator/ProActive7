export type UserRole = 'master' | 'property';
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
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  company_id: string | null;
  role: UserRole;
  full_name: string | null;
  email: string | null;
  active: boolean;
  crn: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  company_id: string;
  name: string;
  category: string | null;
  default_storage_condition: StorageCondition;
  active: boolean;
  allergens: string[];
  created_by: string | null;
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
  allergens: string[];
  printed_by: string | null;
  printed_at: string;
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
  company_id: string;
  name: string;
  items: ChecklistItem[];
  frequency: ChecklistFrequency;
  active: boolean;
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
  name: string;
  items: AuditItem[];
  created_at: string;
  updated_at: string;
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
  signature_path: string | null;
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
