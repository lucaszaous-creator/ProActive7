import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertOctagon,
  Bug,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  FileDown,
  HardHat,
  Search,
  Thermometer,
  TrendingUp,
} from 'lucide-react';
import { formatDate } from '@/lib/dates';
import { CountUp } from '@/components/ui/CountUp';
import type { EnrichedCompany } from '@/lib/dashboardQueries';
import type { ScoreTier } from '@/lib/complianceScore';
import { generateComplianceReportPdf } from '@/lib/complianceReport';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import { SkeletonCard } from './Skeleton';

const TIER_BG: Record<ScoreTier, string> = {
  green:
    'border-neutral-300 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-950',
  amber: 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950',
  red: 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950',
};

const TIER_TEXT: Record<ScoreTier, string> = {
  green: 'text-neutral-700 dark:text-neutral-200',
  amber: 'text-amber-700 dark:text-amber-200',
  red: 'text-red-700 dark:text-red-200',
};

interface PortfolioSummaryProps {
  loading: boolean;
  companies: EnrichedCompany[];
}

export function PortfolioSummary({
  loading,
  companies,
}: PortfolioSummaryProps) {
  const [showAll, setShowAll] = useState(false);
  const [search, setSearch] = useState('');

  const critical = useMemo(
    () => companies.filter((c) => c.tier === 'red' || c.tier === 'amber'),
    [companies],
  );

  const visible = useMemo(() => {
    const list = showAll ? companies : critical;
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter((c) => c.company_name.toLowerCase().includes(q));
  }, [showAll, companies, critical, search]);

  if (loading) {
    return (
      <section className="mb-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">
            Carteira
          </h2>
        </div>
        <div className="flex flex-col gap-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </section>
    );
  }

  const allGreen = critical.length === 0 && companies.length > 0;

  return (
    <section className="mb-5">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">
          Carteira ·{' '}
          <span className="text-neutral-500 dark:text-neutral-400">
            {showAll
              ? `${companies.length} empresas`
              : `${critical.length} crítica${critical.length === 1 ? '' : 's'}`}
          </span>
        </h2>
        {companies.length > 0 ? (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="self-start rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-neutral-300 dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-neutral-700 sm:self-auto"
          >
            {showAll
              ? 'Mostrar só críticas'
              : `Ver todas as ${companies.length} empresas`}
          </button>
        ) : null}
      </div>

      {showAll ? (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-slate-900">
          <Search
            size={16}
            className="shrink-0 text-neutral-400 dark:text-neutral-500"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar empresa..."
            className="min-w-0 flex-1 bg-transparent text-sm text-neutral-800 outline-none placeholder:text-neutral-400 dark:text-neutral-100"
          />
        </div>
      ) : null}

      {companies.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Nenhuma empresa na carteira.
            </p>
            <Link
              to="/admin/empresas"
              className="text-xs font-medium text-neutral-700 hover:underline dark:text-neutral-400"
            >
              Cadastrar primeira empresa →
            </Link>
          </div>
        </Card>
      ) : allGreen && !showAll ? (
        <Card className="border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
          <div className="flex items-center gap-3">
            <CheckCircle2
              size={28}
              className="shrink-0 text-neutral-600 dark:text-neutral-400"
            />
            <div className="min-w-0">
              <p className="font-medium text-neutral-800 dark:text-neutral-200">
                Todas as {companies.length} empresas em conformidade
              </p>
              <p className="text-xs text-neutral-700 dark:text-neutral-300">
                Nenhuma situação crítica no momento.
              </p>
            </div>
          </div>
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <p className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
            Nenhuma empresa encontrada.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {visible.map((r) => (
            <CompanyCard key={r.company_id} r={r} />
          ))}
        </div>
      )}
    </section>
  );
}

function CompanyCard({ r }: { r: EnrichedCompany }) {
  const { profile } = useAuth();
  const [generating, setGenerating] = useState(false);
  const tier = r.tier;
  const bgClass = tier
    ? TIER_BG[tier]
    : 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-slate-900';
  const textClass = tier
    ? TIER_TEXT[tier]
    : 'text-neutral-500 dark:text-neutral-400';

  async function handleReport() {
    setGenerating(true);
    try {
      await generateComplianceReportPdf(r, {
        name: profile?.full_name,
        crn: profile?.crn,
        email: profile?.email,
        phone: profile?.phone,
      });
    } catch (e) {
      toast.error('Erro ao gerar relatório: ' + (e as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className={`rounded-xl border p-3 sm:p-5 ${bgClass}`}>
      {/* Linha 1 mobile: titulo + score na mesma linha. Desktop volta a layout horizontal. */}
      <div className="flex items-start justify-between gap-3 sm:items-center">
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-800 dark:text-neutral-100 sm:text-base">
          {r.company_name}
        </h3>
        <div className="flex shrink-0 items-center gap-2">
          <div className="text-right">
            <p
              className={`text-xl font-bold leading-none sm:text-2xl ${textClass}`}
            >
              {r.score != null ? <CountUp value={r.score} suffix="%" /> : '—'}
            </p>
            <p className="text-[10px] text-neutral-500 dark:text-neutral-400 sm:text-xs">
              score
            </p>
          </div>
          <button
            type="button"
            onClick={handleReport}
            disabled={generating}
            aria-label="Baixar relatório de conformidade (PDF)"
            title="Relatório de conformidade (PDF) para assinatura da RT"
            className="rounded-lg p-1.5 text-neutral-600 hover:bg-white/60 disabled:opacity-50 dark:text-neutral-300 dark:hover:bg-black/30 sm:p-2"
          >
            <FileDown size={16} className="sm:hidden" />
            <FileDown size={18} className="hidden sm:inline" />
          </button>
          <Link
            to={`/visitas?company=${r.company_id}`}
            aria-label="Ver detalhes"
            className="rounded-lg p-1.5 text-neutral-600 hover:bg-white/60 dark:text-neutral-300 dark:hover:bg-black/30 sm:p-2"
          >
            <TrendingUp size={16} className="sm:hidden" />
            <TrendingUp size={18} className="hidden sm:inline" />
          </Link>
        </div>
      </div>
      <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-neutral-600 dark:text-neutral-400 sm:text-xs">
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <AlertOctagon size={12} />
              {r.nc_open_now} NC aberta{r.nc_open_now === 1 ? '' : 's'}
              {r.nc_overdue_30d > 0 ? (
                <span className="font-semibold text-red-600 dark:text-red-300">
                  {' '}
                  ({r.nc_overdue_30d} vencida
                  {r.nc_overdue_30d === 1 ? '' : 's'})
                </span>
              ) : null}
            </span>
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <ClipboardCheck size={12} />
              {r.checklists_ran_30d}/{r.checklists_planned_30d} checklists
            </span>
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <Thermometer size={12} />
              {r.temp_out_of_range_7d}/{r.temp_readings_7d} fora da faixa
            </span>
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <FileText size={12} />
              {r.docs_published}/6 documentos
            </span>
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <HardHat size={12} />
              {r.manipulators_aso_ok}/{r.manipulators_active} ASO em dia
            </span>
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <Bug size={12} />
              CIP{' '}
              {r.has_pest_service_active ? (
                <span className="text-neutral-700 dark:text-neutral-300">
                  em dia
                </span>
              ) : r.has_pest_service_registered ? (
                <span className="font-semibold text-red-600 dark:text-red-300">
                  vencido
                </span>
              ) : (
                <span className="text-neutral-500 dark:text-neutral-400">
                  não contratado
                </span>
              )}
            </span>
            {r.last_audit_at ? (
              <span className="inline-flex items-center gap-1 whitespace-nowrap">
                <CalendarDays size={12} />
                Última visita {formatDate(r.last_audit_at)}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
