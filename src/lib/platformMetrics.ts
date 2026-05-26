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
  const { data, error } = await supabase
    .from('platform_org_metrics_v')
    .select('*')
    .order('organization_name');
  if (error) throw error;
  return (data as OrgMetricsRow[] | null) ?? [];
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
    const days = (now - new Date(r.last_login_at).getTime()) / (1000 * 60 * 60 * 24);
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
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const { data, error } = await supabase
    .from('feature_events')
    .select('feature_key, user_id, organization_id')
    .gte('occurred_at', since.toISOString());
  if (error) throw error;
  const rows = (data ?? []) as Array<{
    feature_key: string;
    user_id: string | null;
    organization_id: string | null;
  }>;
  const map = new Map<
    string,
    { uses: number; users: Set<string>; orgs: Set<string> }
  >();
  for (const r of rows) {
    const m = map.get(r.feature_key) ?? {
      uses: 0,
      users: new Set(),
      orgs: new Set(),
    };
    m.uses += 1;
    if (r.user_id) m.users.add(r.user_id);
    if (r.organization_id) m.orgs.add(r.organization_id);
    map.set(r.feature_key, m);
  }
  return Array.from(map.entries())
    .map(([feature_key, m]) => ({
      feature_key,
      uses_30d: m.uses,
      unique_users: m.users.size,
      unique_orgs: m.orgs.size,
    }))
    .sort((a, b) => b.uses_30d - a.uses_30d);
}

export async function logFeatureEvent(featureKey: string): Promise<void> {
  const { error } = await supabase.rpc('log_feature_event', {
    feature_key: featureKey,
  });
  if (error) console.warn('[feature_events]', featureKey, error.message);
}
