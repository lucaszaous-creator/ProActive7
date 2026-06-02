import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Building2,
  Gauge,
  Printer,
  Tag,
  TrendingDown,
  Users,
  Activity,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { usePageTitle } from '@/lib/usePageTitle';
import {
  fetchOrgMetrics,
  fetchFeatureUsage,
  summarize,
  type OrgMetricsRow,
  type FeatureUsageRow,
} from '@/lib/platformMetrics';

type Tab = 'overview' | 'health' | 'usage' | 'churn';

const DAY_MS = 1000 * 60 * 60 * 24;

interface ChurnRow {
  org: OrgMetricsRow;
  daysSinceLogin: number | null; // null = nunca logou
  reasons: string[];
  risk: number; // maior = mais crítico, pra ordenar
}

// Orgs em risco de churn: sem login há >14d OU sem nenhuma etiqueta em 30d.
// Reusa platform_org_metrics (last_login_at + labels_30d) — sem migration.
function computeChurn(orgs: OrgMetricsRow[]): ChurnRow[] {
  const now = Date.now();
  const out: ChurnRow[] = [];
  for (const o of orgs) {
    if (o.status === 'suspended') continue;
    const days =
      o.last_login_at == null
        ? null
        : Math.floor((now - new Date(o.last_login_at).getTime()) / DAY_MS);
    const reasons: string[] = [];
    let risk = 0;
    if (days == null) {
      reasons.push('Nunca fez login');
      risk += 100;
    } else if (days > 14) {
      reasons.push(`Sem login há ${days} dias`);
      risk += days;
    }
    if (o.labels_30d === 0) {
      reasons.push('Nenhuma etiqueta em 30 dias');
      risk += 30;
    }
    if (reasons.length > 0)
      out.push({ org: o, daysSinceLogin: days, reasons, risk });
  }
  return out.sort((a, b) => b.risk - a.risk);
}

function formatRelative(iso: string | null): string {
  if (!iso) return 'nunca';
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days === 0) return 'hoje';
  if (days === 1) return 'ontem';
  if (days < 30) return `${days}d atrás`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}m atrás`;
  return `${Math.floor(months / 12)}a atrás`;
}

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: 'neutral' | 'teal' | 'amber' | 'red' | 'green';
}) {
  const accent = {
    neutral:
      'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
    teal: 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    red: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
    green:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  }[tone];
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-slate-900">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${accent}`}
        >
          <Icon size={20} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {label}
          </p>
          <p className="truncate text-2xl font-semibold leading-tight text-neutral-800 dark:text-neutral-100">
            {value}
          </p>
          {hint ? (
            <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
              {hint}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
        active
          ? 'bg-emerald-600 text-white'
          : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
      }`}
    >
      {children}
    </button>
  );
}

export function PlatformDashboardPage() {
  usePageTitle('Dashboard SaaS');
  const [tab, setTab] = useState<Tab>('overview');
  const [orgs, setOrgs] = useState<OrgMetricsRow[]>([]);
  const [usage, setUsage] = useState<FeatureUsageRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [orgsRes, usageRes] = await Promise.all([
        fetchOrgMetrics(),
        fetchFeatureUsage(),
      ]);
      setOrgs(orgsRes);
      setUsage(usageRes);
    } catch (e) {
      toast.error(
        'Erro ao carregar métricas: ' +
          (e instanceof Error ? e.message : String(e)),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => summarize(orgs), [orgs]);
  const topByLabels = useMemo(
    () => [...orgs].sort((a, b) => b.labels_30d - a.labels_30d).slice(0, 10),
    [orgs],
  );
  const sortedByHealth = useMemo(
    () =>
      [...orgs].sort((a, b) => {
        const sa = a.nc_overdue_30d * 3 + a.asos_expiring_30d;
        const sb = b.nc_overdue_30d * 3 + b.asos_expiring_30d;
        return sb - sa;
      }),
    [orgs],
  );
  const churnRows = useMemo(() => computeChurn(orgs), [orgs]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100">
            Dashboard SaaS
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Visão consolidada de todas as organizações.
          </p>
        </div>
        <div className="flex gap-1">
          <TabButton
            active={tab === 'overview'}
            onClick={() => setTab('overview')}
          >
            Visão geral
          </TabButton>
          <TabButton active={tab === 'health'} onClick={() => setTab('health')}>
            Saúde das orgs
          </TabButton>
          <TabButton active={tab === 'usage'} onClick={() => setTab('usage')}>
            Uso de features
          </TabButton>
          <TabButton active={tab === 'churn'} onClick={() => setTab('churn')}>
            Risco de churn
          </TabButton>
        </div>
      </div>

      {tab === 'overview' ? (
        <>
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi
              label="Organizações"
              value={String(summary.totalOrgs)}
              hint={`${summary.activeOrgs} ativas · ${summary.suspendedOrgs} suspensas`}
              icon={Building2}
              tone="teal"
            />
            <Kpi
              label="Empresas (total)"
              value={String(summary.totalCompanies)}
              hint={`${summary.totalUsers} usuários`}
              icon={Users}
              tone="neutral"
            />
            <Kpi
              label="Etiquetas (30d)"
              value={summary.labels30d.toLocaleString('pt-BR')}
              hint={`${summary.audits30d} auditorias concluídas`}
              icon={Tag}
              tone="green"
            />
            <Kpi
              label="Orgs em risco"
              value={String(summary.orgsInRisk)}
              hint="Sem login há +14 dias"
              icon={TrendingDown}
              tone={summary.orgsInRisk === 0 ? 'green' : 'red'}
            />
          </section>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
              Top 10 orgs por etiquetas impressas (30 dias)
            </h2>
            {topByLabels.length === 0 ? (
              <p className="text-sm text-neutral-500">
                Nenhuma etiqueta impressa nos últimos 30 dias.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-700">
                      <th className="py-2">Organização</th>
                      <th className="py-2 text-right">Empresas</th>
                      <th className="py-2 text-right">Etiquetas</th>
                      <th className="py-2 text-right">Auditorias</th>
                      <th className="py-2 text-right">Último login</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topByLabels.map((o) => (
                      <tr
                        key={o.organization_id}
                        className="border-b border-neutral-100 dark:border-neutral-800"
                      >
                        <td className="py-2">
                          <Link
                            to={`/platform/organizacoes/${o.organization_id}`}
                            className="text-emerald-700 hover:underline dark:text-emerald-400"
                          >
                            {o.organization_name}
                          </Link>
                        </td>
                        <td className="py-2 text-right">{o.company_count}</td>
                        <td className="py-2 text-right">{o.labels_30d}</td>
                        <td className="py-2 text-right">{o.audits_30d}</td>
                        <td className="py-2 text-right text-neutral-500">
                          {formatRelative(o.last_login_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      ) : null}

      {tab === 'health' ? (
        <>
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi
              label="NCs abertas"
              value={String(summary.ncOpen)}
              hint="Em todas as orgs"
              icon={AlertTriangle}
              tone={summary.ncOpen === 0 ? 'green' : 'amber'}
            />
            <Kpi
              label="Orgs com NC +30d"
              value={String(orgs.filter((o) => o.nc_overdue_30d > 0).length)}
              hint="NC aberta há mais de 30d"
              icon={Gauge}
              tone="red"
            />
            <Kpi
              label="ASOs vencendo"
              value={String(
                orgs.reduce((sum, o) => sum + o.asos_expiring_30d, 0),
              )}
              hint="Próximos 30 dias"
              icon={Activity}
              tone="amber"
            />
            <Kpi
              label="Manipuladores"
              value={String(
                orgs.reduce((sum, o) => sum + o.manipulators_active, 0),
              )}
              hint="Total ativo"
              icon={Users}
              tone="teal"
            />
          </section>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
              Saúde por organização (ordem: mais críticas primeiro)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-700">
                    <th className="py-2">Organização</th>
                    <th className="py-2 text-right">NCs abertas</th>
                    <th className="py-2 text-right">NCs +30d</th>
                    <th className="py-2 text-right">ASOs vencendo</th>
                    <th className="py-2 text-right">Manipuladores</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedByHealth.map((o) => {
                    const critical = o.nc_overdue_30d > 0;
                    return (
                      <tr
                        key={o.organization_id}
                        className="border-b border-neutral-100 dark:border-neutral-800"
                      >
                        <td className="py-2">
                          <Link
                            to={`/platform/organizacoes/${o.organization_id}`}
                            className="text-emerald-700 hover:underline dark:text-emerald-400"
                          >
                            {o.organization_name}
                          </Link>
                        </td>
                        <td className="py-2 text-right">{o.nc_open}</td>
                        <td
                          className={`py-2 text-right ${critical ? 'font-semibold text-red-600' : ''}`}
                        >
                          {o.nc_overdue_30d}
                        </td>
                        <td className="py-2 text-right">
                          {o.asos_expiring_30d}
                        </td>
                        <td className="py-2 text-right">
                          {o.manipulators_active}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : null}

      {tab === 'usage' ? (
        <Card>
          <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
            Uso de features (últimos 30 dias)
          </h2>
          {usage.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Nenhum evento registrado ainda. Os eventos são gravados quando
              usuários executam ações no app (imprimir etiqueta, salvar
              auditoria, etc.).
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-700">
                    <th className="py-2">Feature</th>
                    <th className="py-2 text-right">Usos</th>
                    <th className="py-2 text-right">Usuários únicos</th>
                    <th className="py-2 text-right">Orgs únicas</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.map((u) => (
                    <tr
                      key={u.feature_key}
                      className="border-b border-neutral-100 dark:border-neutral-800"
                    >
                      <td className="py-2 font-mono text-xs">
                        {u.feature_key}
                      </td>
                      <td className="py-2 text-right">{u.uses_30d}</td>
                      <td className="py-2 text-right">{u.unique_users}</td>
                      <td className="py-2 text-right">{u.unique_orgs}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-3 text-xs text-neutral-500">
            <Printer size={12} className="mr-1 inline" />
            Para registrar eventos novos, chame{' '}
            <code className="rounded bg-neutral-100 px-1 dark:bg-neutral-800">
              logFeatureEvent('chave')
            </code>{' '}
            de <code>src/lib/platformMetrics.ts</code>.
          </p>
        </Card>
      ) : null}

      {tab === 'churn' ? (
        <Card>
          <h2 className="mb-1 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
            Risco de churn
          </h2>
          <p className="mb-3 text-xs text-neutral-500">
            Organizações sem login há mais de 14 dias ou sem nenhuma etiqueta
            nos últimos 30 dias. As mais críticas aparecem primeiro.
          </p>
          {churnRows.length === 0 ? (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              Nenhuma organização em risco no momento.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-700">
                    <th className="py-2">Organização</th>
                    <th className="py-2">Sinais de risco</th>
                    <th className="py-2 text-right">Etiquetas 30d</th>
                    <th className="py-2 text-right">Último login</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {churnRows.map(({ org, reasons }) => (
                    <tr
                      key={org.organization_id}
                      className="border-b border-neutral-100 dark:border-neutral-800"
                    >
                      <td className="py-2 font-medium text-neutral-800 dark:text-neutral-100">
                        {org.organization_name}
                      </td>
                      <td className="py-2">
                        <div className="flex flex-wrap gap-1">
                          {reasons.map((rsn) => (
                            <span
                              key={rsn}
                              className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                            >
                              {rsn}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2 text-right">{org.labels_30d}</td>
                      <td className="py-2 text-right text-neutral-500">
                        {formatRelative(org.last_login_at)}
                      </td>
                      <td className="py-2 text-right">
                        <Link
                          to={`/platform/organizacoes/${org.organization_id}`}
                          className="text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                        >
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : null}
    </div>
  );
}
