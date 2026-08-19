import { Building2, Calendar, Gauge, AlertTriangle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { PortfolioStats } from '@/lib/dashboardQueries';
import { CountUp } from '@/components/ui/CountUp';

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
  value: ReactNode;
  hint?: string;
  icon: LucideIcon;
  tone?: 'neutral' | 'teal' | 'amber' | 'red' | 'green';
}) {
  const accent: Record<typeof tone, string> = {
    neutral: 'bg-neutral-100 text-neutral-600',
    teal: 'bg-neutral-50 text-neutral-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    green: 'bg-neutral-50 text-neutral-700',
  } as Record<string, string>;
  return (
    <div className="fx-lift rounded-xl border border-neutral-200 bg-white p-3 hover:border-neutral-300 sm:p-5">
      <div className="flex items-center gap-2.5 sm:gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 ${accent[tone]}`}
        >
          <Icon size={18} className="sm:hidden" />
          <Icon size={20} className="hidden sm:inline" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[10px] font-medium uppercase tracking-wide text-neutral-500 sm:text-xs">
            {label}
          </p>
          <p className="truncate text-lg font-semibold leading-tight text-neutral-800 sm:text-2xl">
            {value}
          </p>
          {hint ? (
            <p className="truncate text-[10px] text-neutral-500 sm:text-xs">
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
          stats.averageScore == null ? (
            '—'
          ) : (
            <CountUp value={stats.averageScore} suffix="%" />
          )
        }
        hint="Carteira inteira"
        icon={Gauge}
        tone={scoreTone}
      />
      <Kpi
        label="Empresas"
        value={<CountUp value={stats.total} />}
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
        value={<CountUp value={stats.upcomingAudits14d} />}
        hint="Próximos 14 dias"
        icon={Calendar}
        tone="teal"
      />
      <Kpi
        label="Alertas hoje"
        value={<CountUp value={stats.alertsToday} />}
        hint="NCs, ASOs e CIP"
        icon={AlertTriangle}
        tone={stats.alertsToday === 0 ? 'green' : 'red'}
      />
    </section>
  );
}
