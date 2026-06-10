import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  CalendarClock,
  CalendarDays,
  Clock3,
  AlertTriangle,
  Download,
  Printer,
  Snowflake,
  Tag,
  ThermometerSnowflake,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { useAuth } from '@/context/AuthContext';
import { useCompanyScope } from '@/lib/useCompanyScope';
import { formatDateTime } from '@/lib/dates';
import {
  STORAGE_CONDITION_LABELS,
  type LabelPrint,
  type StorageCondition,
} from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ColumnChart, DonutChart, StatCard } from '@/components/ui/charts';
import { downloadCsv } from '@/lib/csv';

function bucketOf(
  expiry: Date,
  now: Date,
): 'today' | 'tomorrow' | 'week' | 'later' {
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const startTomorrow = new Date(startToday);
  startTomorrow.setDate(startTomorrow.getDate() + 1);
  const endTomorrow = new Date(startTomorrow);
  endTomorrow.setDate(endTomorrow.getDate() + 1);
  const endWeek = new Date(startToday);
  endWeek.setDate(endWeek.getDate() + 7);
  if (expiry < startTomorrow) return 'today';
  if (expiry < endTomorrow) return 'tomorrow';
  if (expiry < endWeek) return 'week';
  return 'later';
}

const BUCKET_LABELS: Record<'today' | 'tomorrow' | 'week' | 'later', string> = {
  today: 'Hoje',
  tomorrow: 'Amanhã',
  week: 'Esta semana',
  later: 'Mais tarde',
};

function countdownLabel(expiry: Date, now: Date): string {
  const ms = expiry.getTime() - now.getTime();
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours < 24) {
    const h = expiry.getHours().toString().padStart(2, '0');
    const m = expiry.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  }
  const days = Math.floor(hours / 24);
  return `Em ${days}d`;
}

export function ValidadesPage() {
  usePageTitle('Validades');
  const { profile } = useAuth();
  const { isMaster, companies, companyId, setCompanyId } = useCompanyScope();

  const [labels, setLabels] = useState<LabelPrint[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [discarding, setDiscarding] = useState<LabelPrint | null>(null);
  const [discardBusy, setDiscardBusy] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) {
      setLabels([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('label_prints')
      .select('*')
      .eq('company_id', companyId)
      .is('consumed_at', null)
      .gt('expiry_at', new Date().toISOString())
      .order('expiry_at', { ascending: true })
      .limit(500);
    setLoading(false);
    if (error) {
      toast.error('Erro ao carregar: ' + error.message);
      return;
    }
    setLabels((data as LabelPrint[] | null) ?? []);
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!search) return labels;
    const q = search.toLowerCase();
    return labels.filter(
      (l) =>
        l.product_name_snapshot.toLowerCase().includes(q) ||
        (l.batch ?? '').toLowerCase().includes(q) ||
        (l.supplier ?? '').toLowerCase().includes(q),
    );
  }, [labels, search]);

  const now = useMemo(() => new Date(), []);
  const grouped = useMemo(() => {
    const acc: Record<'today' | 'tomorrow' | 'week' | 'later', LabelPrint[]> = {
      today: [],
      tomorrow: [],
      week: [],
      later: [],
    };
    filtered.forEach((l) => {
      const exp = new Date(l.expiry_at);
      acc[bucketOf(exp, now)].push(l);
    });
    return acc;
  }, [filtered, now]);

  // KPIs sobre o conjunto completo carregado (não afetados pela busca).
  const stats = useMemo(() => {
    const acc = { today: 0, tomorrow: 0, week: 0, later: 0 };
    labels.forEach((l) => {
      acc[bucketOf(new Date(l.expiry_at), now)] += 1;
    });
    return {
      today: acc.today,
      tomorrow: acc.tomorrow,
      next7: acc.today + acc.tomorrow + acc.week,
      total: labels.length,
    };
  }, [labels, now]);

  // Vencimentos por dia nos próximos 14 dias (eixo contínuo, com zeros).
  const next14Days = useMemo(() => {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
    const counts = new Map<string, number>();
    labels.forEach((l) => {
      const d = new Date(l.expiry_at);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return days.map((d) => {
      const dd = d.getDate().toString().padStart(2, '0');
      const mm = (d.getMonth() + 1).toString().padStart(2, '0');
      return {
        label: `${dd}/${mm}`,
        value:
          counts.get(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`) ?? 0,
        hint: `${dd}/${mm}`,
      };
    });
  }, [labels, now]);

  // Distribuição por condição de armazenamento.
  const byCondition = useMemo(() => {
    const counts = new Map<string, number>();
    labels.forEach((l) => {
      const label =
        STORAGE_CONDITION_LABELS[l.storage_condition as StorageCondition] ??
        'Outros';
      counts.set(label, (counts.get(label) ?? 0) + 1);
    });
    return Array.from(counts, ([label, value]) => ({ label, value }));
  }, [labels]);

  function exportCsv() {
    downloadCsv(
      'validades',
      ['Produto', 'Lote', 'Fornecedor', 'Condição', 'Vence em'],
      filtered.map((l) => [
        l.product_name_snapshot,
        l.batch ?? '',
        l.supplier ?? '',
        STORAGE_CONDITION_LABELS[l.storage_condition as StorageCondition] ??
          '',
        formatDateTime(new Date(l.expiry_at)),
      ]),
    );
  }

  async function handleDiscard() {
    if (!discarding) return;
    setDiscardBusy(true);
    const { error } = await supabase
      .from('label_prints')
      .update({
        consumed_at: new Date().toISOString(),
        consumed_by: profile?.id ?? null,
        consumed_reason: 'descarte',
      })
      .eq('id', discarding.id);
    setDiscardBusy(false);
    if (error) {
      toast.error('Erro ao descartar: ' + error.message);
      return;
    }
    toast.success('Etiqueta descartada.');
    setDiscarding(null);
    void load();
  }

  const noCompany = isMaster && companies.length === 0;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Validades"
        subtitle={
          <>
            Etiquetas vivas, ordenadas por quem vence primeiro. Use para evitar
            servir vencido e reduzir desperdício.
          </>
        }
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={exportCsv}
            disabled={filtered.length === 0}
          >
            <Download size={15} />
            Exportar CSV
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {isMaster && companies.length > 0 && (
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
        )}
        <Input
          id="search"
          label="Buscar"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="produto, lote ou fornecedor"
        />
      </div>

      {noCompany ? (
        <Card>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            Nenhuma empresa cadastrada.
          </p>
        </Card>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Printer}
          title="Nenhuma etiqueta viva"
          description="Imprima etiquetas no wizard de impressão e o controle de validades aparece aqui em tempo real."
        />
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={<AlertTriangle size={17} />}
              label="Vencendo hoje"
              value={stats.today.toLocaleString('pt-BR')}
              tone={stats.today > 0 ? 'red' : 'neutral'}
            />
            <StatCard
              icon={<Clock3 size={17} />}
              label="Amanhã"
              value={stats.tomorrow.toLocaleString('pt-BR')}
              tone="amber"
            />
            <StatCard
              icon={<CalendarDays size={17} />}
              label="Próximos 7 dias"
              value={stats.next7.toLocaleString('pt-BR')}
              tone="blue"
            />
            <StatCard
              icon={<Tag size={17} />}
              label="Total ativo"
              value={stats.total.toLocaleString('pt-BR')}
              tone="teal"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                Vencimentos nos próximos 14 dias
              </h2>
              <ColumnChart
                data={next14Days}
                height={160}
                showAvg={false}
                color="#f59e0b"
              />
            </Card>
            {byCondition.length > 0 && (
              <Card>
                <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                  Por condição de armazenamento
                </h2>
                <DonutChart items={byCondition} centerLabel="etiquetas" />
              </Card>
            )}
          </div>
          {(['today', 'tomorrow', 'week', 'later'] as const).map((bucket) => {
            const items = grouped[bucket];
            if (items.length === 0) return null;
            return (
              <section key={bucket}>
                <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                  <CalendarClock size={16} className="text-neutral-400" />
                  {BUCKET_LABELS[bucket]}
                  <span className="rounded bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 text-xs font-normal text-neutral-500 dark:text-neutral-400">
                    {items.length}
                  </span>
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {items.map((l) => {
                    const exp = new Date(l.expiry_at);
                    const isToday = bucket === 'today';
                    return (
                      <div
                        key={l.id}
                        className={`rounded-lg border bg-white p-3 dark:bg-neutral-900 ${
                          isToday
                            ? 'border-amber-300 dark:border-amber-900'
                            : 'border-neutral-200 dark:border-neutral-800'
                        }`}
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-200">
                              {l.product_name_snapshot}
                            </p>
                            {l.supplier && (
                              <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                                {l.supplier}
                              </p>
                            )}
                          </div>
                          <span
                            className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${
                              isToday
                                ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200'
                                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                            }`}
                          >
                            {countdownLabel(exp, now)}
                          </span>
                        </div>
                        <p className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                          {l.storage_condition === 'congelado' ? (
                            <Snowflake size={12} />
                          ) : l.storage_condition === 'refrigerado' ? (
                            <ThermometerSnowflake size={12} />
                          ) : (
                            <AlertTriangle size={12} />
                          )}
                          {
                            STORAGE_CONDITION_LABELS[
                              l.storage_condition as StorageCondition
                            ]
                          }
                          {l.batch ? ` · lote ${l.batch}` : ''}
                        </p>
                        <p className="mt-1 text-xs text-neutral-400">
                          Vence {formatDateTime(exp)}
                        </p>
                        <div className="mt-3 flex justify-end">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setDiscarding(l)}
                          >
                            Descartar
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={discarding !== null}
        title="Descartar etiqueta"
        message={`Descartar "${discarding?.product_name_snapshot ?? ''}"? A etiqueta sairá da lista de validades.`}
        confirmLabel="Descartar"
        loading={discardBusy}
        onConfirm={handleDiscard}
        onCancel={() => setDiscarding(null)}
      />
    </div>
  );
}
