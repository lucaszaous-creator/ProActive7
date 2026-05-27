import { supabase } from './supabase';

export interface NutriCompanyNoVisit {
  company_id: string;
  company_name: string;
  last_audit_at: string | null;
}

export interface NutriAsoExpiring {
  manipulator_id: string;
  manipulator_name: string;
  company_id: string;
  company_name: string;
  expires_at: string;
}

export interface NutriStaleNc {
  id: string;
  description: string;
  severity: 'high' | 'critical';
  company_id: string;
  company_name: string | null;
  opened_at: string;
}

export interface NutriDraftDoc {
  id: string;
  title: string;
  company_id: string;
  company_name: string | null;
  updated_at: string;
}

const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

/** Empresas sem visita técnica completada nos últimos 60 dias. */
export async function fetchCompaniesWithoutRecentVisit(): Promise<
  NutriCompanyNoVisit[]
> {
  const cutoff = new Date(Date.now() - SIXTY_DAYS_MS).toISOString();
  // 1) lista empresas ativas (RLS escopa para a org)
  const { data: companies, error } = await supabase
    .from('companies')
    .select('id, name')
    .eq('active', true)
    .is('deleted_at', null)
    .order('name');
  if (error) throw error;
  const list = (companies as { id: string; name: string }[] | null) ?? [];
  if (list.length === 0) return [];

  // 2) última visita completada por empresa
  const { data: audits, error: auditErr } = await supabase
    .from('audits')
    .select('company_id, completed_at')
    .not('completed_at', 'is', null)
    .in(
      'company_id',
      list.map((c) => c.id),
    )
    .order('completed_at', { ascending: false });
  if (auditErr) throw auditErr;
  const lastByCompany = new Map<string, string>();
  (
    (audits as { company_id: string; completed_at: string }[] | null) ?? []
  ).forEach((a) => {
    if (!lastByCompany.has(a.company_id)) {
      lastByCompany.set(a.company_id, a.completed_at);
    }
  });

  return list
    .map((c) => ({
      company_id: c.id,
      company_name: c.name,
      last_audit_at: lastByCompany.get(c.id) ?? null,
    }))
    .filter((r) => !r.last_audit_at || r.last_audit_at < cutoff)
    .sort((a, b) => {
      // sem visita primeiro
      if (a.last_audit_at === null && b.last_audit_at !== null) return -1;
      if (a.last_audit_at !== null && b.last_audit_at === null) return 1;
      if (a.last_audit_at && b.last_audit_at) {
        return a.last_audit_at < b.last_audit_at ? -1 : 1;
      }
      return a.company_name.localeCompare(b.company_name);
    });
}

/** ASOs com vencimento nos próximos 30 dias ou já vencidos. */
export async function fetchAsosExpiringSoon(): Promise<NutriAsoExpiring[]> {
  const limit = new Date(Date.now() + THIRTY_DAYS_MS).toISOString();
  const { data, error } = await supabase
    .from('manipulator_asos')
    .select(
      'expires_at, manipulator:manipulators(id, full_name, company:companies(id, name))',
    )
    .lte('expires_at', limit)
    .order('expires_at', { ascending: true })
    .limit(50);
  if (error) throw error;
  type Row = {
    expires_at: string;
    manipulator: {
      id: string;
      full_name: string;
      company: { id: string; name: string } | null;
    } | null;
  };
  return ((data as unknown as Row[] | null) ?? [])
    .filter((r) => r.manipulator !== null)
    .map((r) => ({
      manipulator_id: r.manipulator!.id,
      manipulator_name: r.manipulator!.full_name,
      company_id: r.manipulator!.company?.id ?? '',
      company_name: r.manipulator!.company?.name ?? '—',
      expires_at: r.expires_at,
    }));
}

/** NCs severas (high/critical) abertas ou em andamento há mais de 14 dias. */
export async function fetchStaleNcs(): Promise<NutriStaleNc[]> {
  const cutoff = new Date(Date.now() - FOURTEEN_DAYS_MS).toISOString();
  const { data, error } = await supabase
    .from('non_conformities')
    .select('id, description, severity, opened_at, company:companies(id, name)')
    .in('severity', ['high', 'critical'])
    .in('status', ['open', 'in_progress'])
    .lt('opened_at', cutoff)
    .order('opened_at', { ascending: true })
    .limit(20);
  if (error) throw error;
  type Row = {
    id: string;
    description: string;
    severity: 'high' | 'critical';
    opened_at: string;
    company: { id: string; name: string } | null;
  };
  return ((data as unknown as Row[] | null) ?? []).map((r) => ({
    id: r.id,
    description: r.description,
    severity: r.severity,
    opened_at: r.opened_at,
    company_id: r.company?.id ?? '',
    company_name: r.company?.name ?? null,
  }));
}

/** Documentos em rascunho aguardando aprovação. */
export async function fetchDraftDocuments(): Promise<NutriDraftDoc[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('id, title, updated_at, company:companies(id, name)')
    .eq('status', 'draft')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  type Row = {
    id: string;
    title: string;
    updated_at: string;
    company: { id: string; name: string } | null;
  };
  return ((data as unknown as Row[] | null) ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    updated_at: r.updated_at,
    company_id: r.company?.id ?? '',
    company_name: r.company?.name ?? null,
  }));
}
