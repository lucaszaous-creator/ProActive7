import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  CalendarClock,
  AlertTriangle,
  Snowflake,
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
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-800 sm:text-2xl">
            Validades
          </h1>
          <p className="text-sm text-neutral-500">
            Etiquetas vivas, ordenadas por quem vence primeiro. Use para evitar
            servir vencido e reduzir desperdício.
          </p>
        </div>
      </div>

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
          <p className="text-sm text-neutral-600">
            Nenhuma empresa cadastrada.
          </p>
        </Card>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <p className="text-sm text-neutral-500">
            Nenhuma etiqueta viva. Imprima etiquetas em /imprimir para começar.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {(['today', 'tomorrow', 'week', 'later'] as const).map((bucket) => {
            const items = grouped[bucket];
            if (items.length === 0) return null;
            return (
              <section key={bucket}>
                <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-neutral-700">
                  <CalendarClock size={16} className="text-neutral-400" />
                  {BUCKET_LABELS[bucket]}
                  <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-normal text-neutral-500">
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
                        className={`rounded-lg border bg-white p-3 dark:bg-slate-900 ${
                          isToday
                            ? 'border-amber-300'
                            : 'border-neutral-200 dark:border-neutral-800'
                        }`}
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-200">
                              {l.product_name_snapshot}
                            </p>
                            {l.supplier && (
                              <p className="truncate text-xs text-neutral-500">
                                {l.supplier}
                              </p>
                            )}
                          </div>
                          <span
                            className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${
                              isToday
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-neutral-100 text-neutral-600'
                            }`}
                          >
                            {countdownLabel(exp, now)}
                          </span>
                        </div>
                        <p className="flex items-center gap-1 text-xs text-neutral-500">
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
