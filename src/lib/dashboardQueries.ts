import { supabase } from './supabase';
import {
  calculateComplianceScore,
  scoreTier,
  type ScoreTier,
} from './complianceScore';

export interface ComplianceRow {
  company_id: string;
  company_name: string;
  company_logo_path: string | null;
  active: boolean;
  nc_total_30d: number;
  nc_overdue_30d: number;
  nc_open_now: number;
  checklists_ran_30d: number;
  checklists_planned_30d: number;
  last_audit_at: string | null;
  next_audit_at: string | null;
  has_audit_last_90d: boolean;
  temp_readings_7d: number;
  temp_out_of_range_7d: number;
  docs_published: number;
  docs_pending: number;
  manipulators_active: number;
  manipulators_aso_ok: number;
  manipulators_aso_expired: number;
  manipulators_aso_missing: number;
  has_pest_service_active: boolean;
  has_pest_service_registered: boolean;
  last_pest_at: string | null;
  next_pest_due_at: string | null;
}

export interface EnrichedCompany extends ComplianceRow {
  score: number | null;
  tier: ScoreTier | null;
}

export interface PortfolioStats {
  total: number;
  critical: number; // red + amber
  averageScore: number | null;
  upcomingAudits14d: number;
  alertsToday: number; // NCs vencidas + ASOs vencidos/sem ASO + CIP vencido
}

/**
 * Enriquece a lista da view com score+tier e ordena por criticidade.
 * Funcao pura — usa apenas calculateComplianceScore/scoreTier.
 */
export function enrichCompanies(rows: ComplianceRow[]): EnrichedCompany[] {
  return rows
    .map((r) => {
      const breakdown = calculateComplianceScore({
        ncTotal30d: r.nc_total_30d,
        ncOverdue30d: r.nc_overdue_30d,
        checklistsPlanned30d: r.checklists_planned_30d,
        checklistsRan30d: r.checklists_ran_30d,
        hasAuditLast90d: r.has_audit_last_90d,
        tempReadings7d: r.temp_readings_7d,
        tempOutOfRange7d: r.temp_out_of_range_7d,
        publishedDocs: r.docs_published,
        manipulatorsActive: r.manipulators_active,
        manipulatorsAsoOk: r.manipulators_aso_ok,
        hasPestServiceActive: r.has_pest_service_active,
        hasPestServiceRegistered: r.has_pest_service_registered,
      });
      return {
        ...r,
        score: breakdown?.total ?? null,
        tier: scoreTier(breakdown?.total ?? null),
      };
    })
    .sort((a, b) => {
      const order: Record<string, number> = { red: 0, amber: 1, green: 2 };
      const ta = a.tier ?? 'green';
      const tb = b.tier ?? 'green';
      if (order[ta] !== order[tb]) return order[ta] - order[tb];
      if (b.nc_open_now !== a.nc_open_now) return b.nc_open_now - a.nc_open_now;
      return a.company_name.localeCompare(b.company_name);
    });
}

/** Estatisticas agregadas da carteira para os 4 KPI cards do master. */
export function aggregatePortfolioStats(
  companies: EnrichedCompany[],
): PortfolioStats {
  const withScore = companies.filter((c) => c.score != null);
  const averageScore =
    withScore.length === 0
      ? null
      : Math.round(
          (withScore.reduce((s, c) => s + (c.score ?? 0), 0) /
            withScore.length) *
            10,
        ) / 10;

  const critical = companies.filter(
    (c) => c.tier === 'red' || c.tier === 'amber',
  ).length;

  // CIP so conta como alerta se a empresa REGISTROU pelo menos um
  // servico anteriormente e o atual venceu. Empresa que nunca contratou
  // CIP nao deve aparecer como "alerta" — isso inflava o KPI.
  const alertsToday = companies.reduce(
    (s, c) =>
      s +
      c.nc_overdue_30d +
      c.manipulators_aso_expired +
      c.manipulators_aso_missing +
      (c.has_pest_service_registered && !c.has_pest_service_active ? 1 : 0),
    0,
  );

  return {
    total: companies.filter((c) => c.active).length,
    critical,
    averageScore,
    upcomingAudits14d: 0, // preenchido separadamente (query distinta)
    alertsToday,
  };
}

// ---------------- Queries (efeito colateral) ------------------

export async function fetchPortfolio(): Promise<EnrichedCompany[]> {
  const { data, error } = await supabase
    .from('company_compliance_v')
    .select('*')
    .eq('active', true);
  if (error) throw error;
  return enrichCompanies((data as ComplianceRow[] | null) ?? []);
}

export interface UpcomingAudit {
  id: string;
  company_id: string;
  scheduled_at: string;
  company: { name: string } | null;
}

export async function fetchUpcomingAudits(
  limit = 5,
  withinDays = 14,
): Promise<UpcomingAudit[]> {
  const inWindow = new Date();
  inWindow.setDate(inWindow.getDate() + withinDays);
  const { data, error } = await supabase
    .from('audits')
    .select('id, company_id, scheduled_at, company:companies(name)')
    .eq('status', 'scheduled')
    .gte('scheduled_at', new Date().toISOString())
    .lte('scheduled_at', inWindow.toISOString())
    .order('scheduled_at')
    .limit(limit);
  if (error) throw error;
  return (data as unknown as UpcomingAudit[] | null) ?? [];
}

export async function countUpcomingAudits14d(): Promise<number> {
  const inWindow = new Date();
  inWindow.setDate(inWindow.getDate() + 14);
  const { count, error } = await supabase
    .from('audits')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'scheduled')
    .gte('scheduled_at', new Date().toISOString())
    .lte('scheduled_at', inWindow.toISOString());
  if (error) throw error;
  return count ?? 0;
}

export type ActivityKind = 'nc_opened' | 'audit_completed' | 'doc_published';

export interface ActivityItem {
  kind: ActivityKind;
  id: string;
  at: string;
  companyName: string | null;
  /** Texto resumo para a timeline. */
  summary: string;
  /** Rota destino ao clicar. */
  href: string;
}

export async function fetchRecentActivity(limit = 10): Promise<ActivityItem[]> {
  const since = new Date();
  since.setDate(since.getDate() - 14);
  const sinceIso = since.toISOString();

  const [nc, au, dc] = await Promise.all([
    supabase
      .from('non_conformities')
      .select('id, opened_at, description, company:companies(name)')
      .gte('opened_at', sinceIso)
      .order('opened_at', { ascending: false })
      .limit(limit),
    supabase
      .from('audits')
      .select('id, completed_at, score, company:companies(name)')
      .eq('status', 'completed')
      .gte('completed_at', sinceIso)
      .order('completed_at', { ascending: false })
      .limit(limit),
    supabase
      .from('documents')
      .select('id, approved_at, title, company:companies(name)')
      .eq('status', 'published')
      .gte('approved_at', sinceIso)
      .order('approved_at', { ascending: false })
      .limit(limit),
  ]);

  type NcRow = {
    id: string;
    opened_at: string;
    description: string;
    company: { name: string } | null;
  };
  type AuRow = {
    id: string;
    completed_at: string;
    score: number | null;
    company: { name: string } | null;
  };
  type DcRow = {
    id: string;
    approved_at: string;
    title: string;
    company: { name: string } | null;
  };

  const items: ActivityItem[] = [];
  for (const r of (nc.data as unknown as NcRow[] | null) ?? []) {
    items.push({
      kind: 'nc_opened',
      id: r.id,
      at: r.opened_at,
      companyName: r.company?.name ?? null,
      summary: `NC aberta: ${r.description}`,
      href: '/nao-conformidades',
    });
  }
  for (const r of (au.data as unknown as AuRow[] | null) ?? []) {
    items.push({
      kind: 'audit_completed',
      id: r.id,
      at: r.completed_at,
      companyName: r.company?.name ?? null,
      summary: `Visita finalizada${r.score != null ? ` · ${r.score.toFixed(0)}%` : ''}`,
      href: `/visitas/${r.id}`,
    });
  }
  for (const r of (dc.data as unknown as DcRow[] | null) ?? []) {
    items.push({
      kind: 'doc_published',
      id: r.id,
      at: r.approved_at,
      companyName: r.company?.name ?? null,
      summary: `Documento aprovado: ${r.title}`,
      href: '/documentos',
    });
  }

  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}

// ---------------- Property "today" queries ------------------

export interface PendingChecklist {
  id: string;
  name: string;
}

export async function fetchPendingChecklistsToday(
  companyId: string,
): Promise<PendingChecklist[]> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  // Templates ativos
  const { data: tpls, error: tplErr } = await supabase
    .from('checklist_templates')
    .select('id, name')
    .eq('company_id', companyId)
    .eq('active', true);
  if (tplErr) throw tplErr;
  // Runs de hoje
  const { data: runs, error: runErr } = await supabase
    .from('checklist_runs')
    .select('template_id')
    .gte('ran_at', start.toISOString());
  if (runErr) throw runErr;
  const ranIds = new Set((runs ?? []).map((r) => r.template_id));
  return ((tpls as PendingChecklist[] | null) ?? []).filter(
    (t) => !ranIds.has(t.id),
  );
}

export interface PendingEquipment {
  id: string;
  name: string;
}

export async function fetchEquipmentWithoutReadingToday(
  companyId: string,
): Promise<PendingEquipment[]> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const { data: eq, error: eqErr } = await supabase
    .from('equipment')
    .select('id, name')
    .eq('company_id', companyId)
    .eq('active', true);
  if (eqErr) throw eqErr;
  const { data: logs, error: logErr } = await supabase
    .from('temperature_logs')
    .select('equipment_id')
    .gte('recorded_at', start.toISOString());
  if (logErr) throw logErr;
  const loggedIds = new Set((logs ?? []).map((r) => r.equipment_id));
  return ((eq as PendingEquipment[] | null) ?? []).filter(
    (e) => !loggedIds.has(e.id),
  );
}
