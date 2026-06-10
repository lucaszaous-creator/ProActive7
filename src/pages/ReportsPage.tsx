import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Crown,
  Download,
  FolderOpen,
  Printer,
  Tags,
  Users,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { useCompanyScope } from '@/lib/useCompanyScope';
import { STORAGE_CONDITION_LABELS, type StorageCondition } from '@/lib/types';
import { downloadCsv } from '@/lib/csv';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  DeltaBadge,
  DonutChart,
  RankedBars,
  StatCard,
} from '@/components/ui/charts';

/** Linha agregada vinda da RPC label_report (agregação feita no SQL). */
interface ReportRow {
  dimension: 'total' | 'category' | 'user' | 'condition';
  label: string;
  value: number;
}

interface Bucket {
  label: string;
  value: number;
}

interface ReportData {
  byCategory: Bucket[];
  byUser: Bucket[];
  byCondition: Bucket[];
  total: number;
}

const EMPTY_DATA: ReportData = {
  byCategory: [],
  byUser: [],
  byCondition: [],
  total: 0,
};

const PERIODS = [
  { id: '7', label: 'Últimos 7 dias' },
  { id: '30', label: 'Últimos 30 dias' },
  { id: '90', label: 'Últimos 90 dias' },
] as const;

/** Converte as linhas da RPC nos buckets ordenados que a UI consome. */
function toReportData(rows: ReportRow[]): ReportData {
  const byCategory: Bucket[] = [];
  const byUser: Bucket[] = [];
  const byCondition: Bucket[] = [];
  let total = 0;
  for (const r of rows) {
    if (r.dimension === 'total') {
      total = r.value;
    } else if (r.dimension === 'category') {
      byCategory.push({ label: r.label, value: r.value });
    } else if (r.dimension === 'user') {
      byUser.push({ label: r.label, value: r.value });
    } else if (r.dimension === 'condition') {
      const key =
        STORAGE_CONDITION_LABELS[r.label as StorageCondition] ?? r.label;
      byCondition.push({ label: key, value: r.value });
    }
  }
  const sort = (a: Bucket, b: Bucket) => b.value - a.value;
  byCategory.sort(sort);
  byUser.sort(sort);
  byCondition.sort(sort);
  return { byCategory, byUser, byCondition, total };
}

/**
 * Janela anterior por subtração: a RPC agrega "desde p_since", então
 * (acumulado 2N dias) − (acumulado N dias) = somente a janela anterior.
 */
function subtractBuckets(wide: Bucket[], recent: Bucket[]): Bucket[] {
  const recentMap = new Map(recent.map((b) => [b.label, b.value]));
  return wide
    .map((b) => ({
      label: b.label,
      value: b.value - (recentMap.get(b.label) ?? 0),
    }))
    .filter((b) => b.value > 0);
}

export function ReportsPage() {
  usePageTitle('Relatorios');
  const { isMaster, companies, companyId, setCompanyId } = useCompanyScope();
  const [period, setPeriod] = useState<(typeof PERIODS)[number]['id']>('30');
  const [data, setData] = useState<ReportData>(EMPTY_DATA);
  const [prev, setPrev] = useState<ReportData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!companyId) {
      setData(EMPTY_DATA);
      setPrev(EMPTY_DATA);
      setLoading(false);
      return;
    }
    setLoading(true);
    const days = Number(period);
    const dayMs = 24 * 60 * 60 * 1000;
    const since = new Date(Date.now() - days * dayMs).toISOString();
    const sincePrev = new Date(Date.now() - days * 2 * dayMs).toISOString();
    // Agregação feita no SQL (RPC) — devolve só os buckets, não milhares
    // de linhas. Duas chamadas (N e 2N dias) para comparar com a janela
    // anterior por subtração.
    const [cur, wide] = await Promise.all([
      supabase.rpc('label_report', { p_company_id: companyId, p_since: since }),
      supabase.rpc('label_report', {
        p_company_id: companyId,
        p_since: sincePrev,
      }),
    ]);
    setLoading(false);
    const error = cur.error ?? wide.error;
    if (error) {
      toast.error('Erro ao carregar relatório: ' + error.message);
      return;
    }
    const current = toReportData((cur.data as ReportRow[] | null) ?? []);
    const accumulated = toReportData((wide.data as ReportRow[] | null) ?? []);
    setData(current);
    setPrev({
      total: Math.max(0, accumulated.total - current.total),
      byCategory: subtractBuckets(accumulated.byCategory, current.byCategory),
      byUser: subtractBuckets(accumulated.byUser, current.byUser),
      byCondition: subtractBuckets(
        accumulated.byCondition,
        current.byCondition,
      ),
    });
  }, [companyId, period]);

  useEffect(() => {
    void load();
  }, [load]);

  const topCategory = data.byCategory[0] ?? null;
  const prevTopCategoryValue = useMemo(() => {
    if (!topCategory) return 0;
    return prev.byCategory.find((b) => b.label === topCategory.label)?.value ?? 0;
  }, [topCategory, prev.byCategory]);

  const noCompany = isMaster && companies.length === 0;
  const hasData =
    data.total > 0 ||
    data.byCategory.length > 0 ||
    data.byUser.length > 0 ||
    data.byCondition.length > 0;

  function exportCsv() {
    const rows: (string | number)[][] = [
      ['Total', 'Total de etiquetas', data.total],
      ...data.byCategory.map((b): (string | number)[] => [
        'Categoria',
        b.label,
        b.value,
      ]),
      ...data.byUser.map((b): (string | number)[] => [
        'Usuário',
        b.label,
        b.value,
      ]),
      ...data.byCondition.map((b): (string | number)[] => [
        'Condição',
        b.label,
        b.value,
      ]),
    ];
    downloadCsv(`relatorio-etiquetas-${period}d`, ['Dimensão', 'Item', 'Etiquetas'], rows);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Relatórios"
        subtitle="Etiquetas impressas no período selecionado."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={exportCsv}
            disabled={!hasData || loading}
          >
            <Download size={15} />
            Exportar CSV
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        {isMaster && companies.length > 0 && (
          <div className="max-w-xs flex-1">
            <Select
              label="Empresa"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
        )}
        <div className="max-w-xs flex-1">
          <Select
            label="Período"
            value={period}
            onChange={(e) =>
              setPeriod(e.target.value as (typeof PERIODS)[number]['id'])
            }
          >
            {PERIODS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {noCompany ? (
        <Card>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            Nenhuma empresa cadastrada. Crie uma empresa para começar.
          </p>
        </Card>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : !hasData ? (
        <EmptyState
          icon={Printer}
          title="Nenhuma etiqueta no período"
          description="Imprima etiquetas no wizard e os relatórios aparecem aqui automaticamente."
        />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={<Printer size={17} />}
              label="Total de etiquetas"
              value={data.total.toLocaleString('pt-BR')}
              tone="teal"
              delta={<DeltaBadge current={data.total} previous={prev.total} />}
            />
            <StatCard
              icon={<Tags size={17} />}
              label="Categorias ativas"
              value={data.byCategory.length}
              tone="blue"
              delta={
                <DeltaBadge
                  current={data.byCategory.length}
                  previous={prev.byCategory.length}
                />
              }
            />
            <StatCard
              icon={<Users size={17} />}
              label="Usuários ativos"
              value={data.byUser.length}
              tone="amber"
              delta={
                <DeltaBadge
                  current={data.byUser.length}
                  previous={prev.byUser.length}
                />
              }
            />
            <StatCard
              icon={<Crown size={17} />}
              label="Categoria líder"
              value={
                topCategory ? topCategory.value.toLocaleString('pt-BR') : '—'
              }
              hint={topCategory ? topCategory.label : undefined}
              tone="emerald"
              delta={
                topCategory ? (
                  <DeltaBadge
                    current={topCategory.value}
                    previous={prevTopCategoryValue}
                  />
                ) : undefined
              }
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                Por condição de armazenamento
              </h2>
              {data.byCondition.length > 0 ? (
                <DonutChart items={data.byCondition} centerLabel="etiquetas" />
              ) : (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Sem dados de condição no período.
                </p>
              )}
            </Card>
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                Por categoria
              </h2>
              {data.byCategory.length > 0 ? (
                <RankedBars items={data.byCategory} colored />
              ) : (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Sem dados de categoria no período.
                </p>
              )}
            </Card>
          </div>

          <Card>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                Por usuário
              </h2>
              <span className="flex items-center gap-1 text-xs text-neutral-400 dark:text-neutral-500">
                <FolderOpen size={12} />
                quem imprimiu no período
              </span>
            </div>
            {data.byUser.length > 0 ? (
              <RankedBars items={data.byUser} />
            ) : (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Sem dados de usuário no período.
              </p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
