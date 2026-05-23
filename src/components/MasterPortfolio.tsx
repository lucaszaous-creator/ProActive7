import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertOctagon,
  CalendarDays,
  ClipboardCheck,
  FileText,
  Thermometer,
  TrendingUp,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/lib/dates';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import {
  calculateComplianceScore,
  scoreTier,
  type ScoreTier,
} from '@/lib/complianceScore';

interface ComplianceRow {
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
}

const TIER_BG: Record<ScoreTier, string> = {
  green: 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950',
  amber: 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950',
  red: 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950',
};

const TIER_TEXT: Record<ScoreTier, string> = {
  green: 'text-emerald-700 dark:text-emerald-200',
  amber: 'text-amber-700 dark:text-amber-200',
  red: 'text-red-700 dark:text-red-200',
};

export function MasterPortfolio() {
  const [rows, setRows] = useState<ComplianceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('company_compliance_v')
      .select('*')
      .eq('active', true)
      .then(({ data, error }) => {
        setLoading(false);
        if (error) {
          toast.error('Erro ao carregar portfolio: ' + error.message);
          return;
        }
        setRows((data as ComplianceRow[] | null) ?? []);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const enriched = rows
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
      });
      return {
        ...r,
        score: breakdown?.total ?? null,
        tier: scoreTier(breakdown?.total ?? null),
      };
    })
    .sort((a, b) => {
      const order: Record<string, number> = {
        red: 0,
        amber: 1,
        green: 2,
      };
      const ta = a.tier ?? 'green';
      const tb = b.tier ?? 'green';
      if (order[ta] !== order[tb]) return order[ta] - order[tb];
      // desempate: NC criticas abertas
      if (b.nc_open_now !== a.nc_open_now)
        return b.nc_open_now - a.nc_open_now;
      return a.company_name.localeCompare(b.company_name);
    });

  if (enriched.length === 0) {
    return (
      <Card>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Nenhuma empresa cadastrada na sua carteira.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {enriched.map((r) => {
        const tier = r.tier;
        const bgClass = tier ? TIER_BG[tier] : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-slate-900';
        const textClass = tier ? TIER_TEXT[tier] : 'text-neutral-500 dark:text-neutral-400';
        return (
          <div
            key={r.company_id}
            className={`rounded-xl border p-4 sm:p-5 ${bgClass}`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">
                  {r.company_name}
                </h3>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-neutral-600 dark:text-neutral-400">
                  <span className="inline-flex items-center gap-1">
                    <AlertOctagon size={12} />
                    {r.nc_open_now} NC aberta{r.nc_open_now === 1 ? '' : 's'}
                    {r.nc_overdue_30d > 0 ? (
                      <span className="font-semibold text-red-600 dark:text-red-300">
                        {' '}
                        ({r.nc_overdue_30d} vencida{r.nc_overdue_30d === 1 ? '' : 's'})
                      </span>
                    ) : null}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ClipboardCheck size={12} />
                    {r.checklists_ran_30d}/{r.checklists_planned_30d}{' '}
                    checklists 30d
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Thermometer size={12} />
                    {r.temp_out_of_range_7d}/{r.temp_readings_7d} fora da faixa
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <FileText size={12} />
                    {r.docs_published}/6 documentos
                    {r.docs_pending > 0
                      ? ` (${r.docs_pending} rascunho)`
                      : ''}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays size={12} />
                    Ultima visita:{' '}
                    {r.last_audit_at ? formatDate(r.last_audit_at) : 'nunca'}
                    {r.next_audit_at
                      ? ` - proxima ${formatDate(r.next_audit_at)}`
                      : ''}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <div className="text-right">
                  <p className={`text-2xl font-bold ${textClass}`}>
                    {r.score != null ? `${r.score.toFixed(0)}%` : '—'}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    score compliance
                  </p>
                </div>
                <Link
                  to={`/visitas?company=${r.company_id}`}
                  aria-label="Ver detalhes"
                  className="rounded-lg p-2 text-neutral-600 hover:bg-white/60 dark:text-neutral-300 dark:hover:bg-black/30"
                >
                  <TrendingUp size={18} />
                </Link>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
