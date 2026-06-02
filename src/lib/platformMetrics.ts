import { supabase } from './supabase';

export interface OrgMetricsRow {
  organization_id: string;
  organization_name: string;
  status: 'active' | 'suspended';
  created_at: string;
  company_count: number;
  user_count: number;
  labels_30d: number;
  audits_30d: number;
  nc_overdue_30d: number;
  nc_open: number;
  manipulators_active: number;
  asos_expiring_30d: number;
  last_login_at: string | null;
}

export async function fetchOrgMetrics(): Promise<OrgMetricsRow[]> {
  // Via RPC SECURITY DEFINER gated por is_platform_admin() — o acesso direto
  // à view foi revogado (era um vazamento cross-tenant para anon/authenticated).
  const { data, error } = await supabase.rpc('platform_org_metrics');
  if (error) throw error;
  const rows = (data as OrgMetricsRow[] | null) ?? [];
  return [...rows].sort((a, b) =>
    a.organization_name.localeCompare(b.organization_name),
  );
}

export interface PlatformSummary {
  totalOrgs: number;
  activeOrgs: number;
  suspendedOrgs: number;
  totalCompanies: number;
  totalUsers: number;
  labels30d: number;
  audits30d: number;
  ncOpen: number;
  orgsInRisk: number;
}

export function summarize(rows: OrgMetricsRow[]): PlatformSummary {
  const now = Date.now();
  const RISK_DAYS = 14;
  let orgsInRisk = 0;
  for (const r of rows) {
    if (!r.last_login_at) {
      orgsInRisk += 1;
      continue;
    }
    const days =
      (now - new Date(r.last_login_at).getTime()) / (1000 * 60 * 60 * 24);
    if (days > RISK_DAYS) orgsInRisk += 1;
  }
  return {
    totalOrgs: rows.length,
    activeOrgs: rows.filter((r) => r.status === 'active').length,
    suspendedOrgs: rows.filter((r) => r.status === 'suspended').length,
    totalCompanies: rows.reduce((sum, r) => sum + r.company_count, 0),
    totalUsers: rows.reduce((sum, r) => sum + r.user_count, 0),
    labels30d: rows.reduce((sum, r) => sum + r.labels_30d, 0),
    audits30d: rows.reduce((sum, r) => sum + r.audits_30d, 0),
    ncOpen: rows.reduce((sum, r) => sum + r.nc_open, 0),
    orgsInRisk,
  };
}

export interface FeatureUsageRow {
  feature_key: string;
  uses_30d: number;
  unique_users: number;
  unique_orgs: number;
}

export async function fetchFeatureUsage(): Promise<FeatureUsageRow[]> {
  // Agregação feita no SQL (RPC). Antes era no cliente sem .limit, e o
  // PostgREST cortava em 1000 linhas — a contagem ficava subnotificada.
  const { data, error } = await supabase.rpc('feature_usage_30d');
  if (error) throw error;
  const rows = (data ?? []) as Array<{
    feature_key: string;
    uses_30d: number | string;
    unique_users: number | string;
    unique_orgs: number | string;
  }>;
  return rows.map((r) => ({
    feature_key: r.feature_key,
    uses_30d: Number(r.uses_30d),
    unique_users: Number(r.unique_users),
    unique_orgs: Number(r.unique_orgs),
  }));
}

export async function logFeatureEvent(featureKey: string): Promise<void> {
  const { error } = await supabase.rpc('log_feature_event', {
    feature_key: featureKey,
  });
  if (error) console.warn('[feature_events]', featureKey, error.message);
}
