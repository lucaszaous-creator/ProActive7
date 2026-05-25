import { Building2, Calendar, Gauge, AlertTriangle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PortfolioStats } from '@/lib/dashboardQueries';

interface MasterKPIsProps {
  stats: PortfolioStats;
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
  const accent: Record<typeof tone, string> = {
    neutral:
      'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
    teal: 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    red: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
    green:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  } as Record<string, string>;
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-slate-900 sm:p-5">
      <div className="flex items-center gap-2.5 sm:gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 ${accent[tone]}`}
        >
          <Icon size={18} className="sm:hidden" />
          <Icon size={20} className="hidden sm:inline" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[10px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 sm:text-xs">
            {label}
          </p>
          <p className="truncate text-lg font-semibold leading-tight text-neutral-800 dark:text-neutral-100 sm:text-2xl">
            {value}
          </p>
          {hint ? (
            <p className="truncate text-[10px] text-neutral-500 dark:text-neutral-400 sm:text-xs">
              {hint}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function MasterKPIs({ stats }: MasterKPIsProps) {
  const scoreTone: 'green' | 'amber' | 'red' | 'neutral' =
    stats.averageScore == null
      ? 'neutral'
      : stats.averageScore >= 85
        ? 'green'
        : stats.averageScore >= 70
          ? 'amber'
          : 'red';
  return (
    <section className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
      <Kpi
        label="Score médio"
        value={
          stats.averageScore == null ? '—' : `${stats.averageScore.toFixed(0)}%`
        }
        hint="Carteira inteira"
        icon={Gauge}
        tone={scoreTone}
      />
      <Kpi
        label="Empresas"
        value={String(stats.total)}
        hint={
          stats.critical === 0
            ? 'Todas em conformidade'
            : `${stats.critical} em situação crítica`
        }
        icon={Building2}
        tone={stats.critical === 0 ? 'green' : 'amber'}
      />
      <Kpi
        label="Próximas visitas"
        value={String(stats.upcomingAudits14d)}
        hint="Próximos 14 dias"
        icon={Calendar}
        tone="teal"
      />
      <Kpi
        label="Alertas hoje"
        value={String(stats.alertsToday)}
        hint="NCs, ASOs e CIP"
        icon={AlertTriangle}
        tone={stats.alertsToday === 0 ? 'green' : 'red'}
      />
    </section>
  );
}
