import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  CalendarX,
  HardHat,
  AlertOctagon,
  Bug,
  ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { formatDate } from '@/lib/dates';
import {
  fetchAsosExpiringSoon,
  fetchCompaniesWithoutRecentVisit,
  fetchPestControlOverdue,
  fetchStaleNcs,
  type NutriAsoExpiring,
  type NutriCompanyNoVisit,
  type NutriPestOverdue,
  type NutriStaleNc,
} from '@/lib/nutriQueries';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';

interface CardState<T> {
  loading: boolean;
  items: T[];
}

function daysAgo(iso: string): number {
  const diff = Date.now() - new Date(iso).getTime();
  return Math.floor(diff / (24 * 60 * 60 * 1000));
}

function daysUntil(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

function AlertCard({
  icon: Icon,
  title,
  count,
  tone,
  to,
  loading,
  emptyMsg,
  children,
}: {
  icon: LucideIcon;
  title: string;
  count: number;
  tone: 'red' | 'amber' | 'blue';
  to: string;
  loading: boolean;
  emptyMsg: string;
  children: React.ReactNode;
}) {
  const toneClasses: Record<typeof tone, string> = {
    red: 'bg-red-50 text-red-700',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700',
  };
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-lg ${toneClasses[tone]}`}
          >
            <Icon size={18} />
          </span>
          <div>
            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              {title}
            </p>
            <p className="text-xs text-neutral-500">
              {loading
                ? '...'
                : count === 0
                  ? emptyMsg
                  : `${count} item${count === 1 ? '' : 's'}`}
            </p>
          </div>
        </div>
        <Link
          to={to}
          className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          aria-label="Ver tudo"
        >
          <ChevronRight size={18} />
        </Link>
      </div>
      {loading ? (
        <div className="flex justify-center py-4">
          <Spinner className="h-6 w-6" />
        </div>
      ) : count === 0 ? null : (
        <div className="space-y-1.5">{children}</div>
      )}
    </Card>
  );
}

export function NutriAlerts() {
  const [noVisit, setNoVisit] = useState<CardState<NutriCompanyNoVisit>>({
    loading: true,
    items: [],
  });
  const [asos, setAsos] = useState<CardState<NutriAsoExpiring>>({
    loading: true,
    items: [],
  });
  const [staleNcs, setStaleNcs] = useState<CardState<NutriStaleNc>>({
    loading: true,
    items: [],
  });
  const [pest, setPest] = useState<CardState<NutriPestOverdue>>({
    loading: true,
    items: [],
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchCompaniesWithoutRecentVisit(),
      fetchAsosExpiringSoon(),
      fetchStaleNcs(),
      fetchPestControlOverdue(),
    ])
      .then(([nv, as, nc, pe]) => {
        if (cancelled) return;
        setNoVisit({ loading: false, items: nv });
        setAsos({ loading: false, items: as });
        setStaleNcs({ loading: false, items: nc });
        setPest({ loading: false, items: pe });
      })
      .catch((e: Error) => {
        if (cancelled) return;
        toast.error('Erro ao carregar alertas: ' + e.message);
        setNoVisit({ loading: false, items: [] });
        setAsos({ loading: false, items: [] });
        setStaleNcs({ loading: false, items: [] });
        setPest({ loading: false, items: [] });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="mb-4">
      <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
        Afazeres · pendências dos seus clientes
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <AlertCard
          icon={CalendarX}
          title="Empresas sem visita técnica"
          count={noVisit.items.length}
          tone="amber"
          to="/visitas"
          loading={noVisit.loading}
          emptyMsg="Todas em dia"
        >
          {noVisit.items.slice(0, 3).map((c) => (
            <Link
              key={c.company_id}
              to="/visitas"
              className="flex items-center justify-between gap-2 rounded px-2 py-1 text-xs hover:bg-neutral-50"
            >
              <span className="truncate text-neutral-700">
                {c.company_name}
              </span>
              <span className="shrink-0 text-neutral-400">
                {c.last_audit_at
                  ? `há ${daysAgo(c.last_audit_at)}d`
                  : 'sem visita'}
              </span>
            </Link>
          ))}
        </AlertCard>

        <AlertCard
          icon={HardHat}
          title="ASOs vencendo em 30d"
          count={asos.items.length}
          tone="red"
          to="/manipuladores"
          loading={asos.loading}
          emptyMsg="Tudo certo"
        >
          {asos.items.slice(0, 3).map((a) => {
            const d = daysUntil(a.expires_at);
            return (
              <Link
                key={a.manipulator_id + a.expires_at}
                to="/manipuladores"
                className="flex items-center justify-between gap-2 rounded px-2 py-1 text-xs hover:bg-neutral-50"
              >
                <span className="truncate text-neutral-700">
                  {a.manipulator_name}
                  <span className="text-neutral-400"> · {a.company_name}</span>
                </span>
                <span
                  className={`shrink-0 ${d < 0 ? 'text-red-600' : 'text-amber-600'}`}
                >
                  {d < 0 ? `vencido há ${-d}d` : `${d}d`}
                </span>
              </Link>
            );
          })}
        </AlertCard>

        <AlertCard
          icon={AlertOctagon}
          title="NCs graves paradas há +14d"
          count={staleNcs.items.length}
          tone="red"
          to="/nao-conformidades"
          loading={staleNcs.loading}
          emptyMsg="Nenhuma parada"
        >
          {staleNcs.items.slice(0, 3).map((n) => (
            <Link
              key={n.id}
              to="/nao-conformidades"
              className="flex items-center justify-between gap-2 rounded px-2 py-1 text-xs hover:bg-neutral-50"
            >
              <span className="truncate text-neutral-700">
                {n.description}
                {n.company_name && (
                  <span className="text-neutral-400"> · {n.company_name}</span>
                )}
              </span>
              <span className="shrink-0 text-red-600">
                {daysAgo(n.opened_at)}d
              </span>
            </Link>
          ))}
        </AlertCard>

        <AlertCard
          icon={Bug}
          title="Controle de pragas vencido"
          count={pest.items.length}
          tone="red"
          to="/controle-pragas"
          loading={pest.loading}
          emptyMsg="Todas em dia"
        >
          {pest.items.slice(0, 3).map((p) => (
            <Link
              key={p.company_id}
              to="/controle-pragas"
              className="flex items-center justify-between gap-2 rounded px-2 py-1 text-xs hover:bg-neutral-50"
            >
              <span className="truncate text-neutral-700">
                {p.company_name}
              </span>
              <span className="shrink-0 text-red-600">
                venceu {formatDate(p.next_due_at)}
              </span>
            </Link>
          ))}
        </AlertCard>
      </div>
    </section>
  );
}
