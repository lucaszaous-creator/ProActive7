import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { BarChart3, Printer } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { useCompanyScope } from '@/lib/useCompanyScope';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { ListSkeleton } from '@/components/ui/Skeleton';

const PERIODS = [
  { value: '7', label: 'Últimos 7 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
];

interface Row {
  product_id: string | null;
  product_name_snapshot: string;
  printed_at: string;
  quantity: number;
}

export function ContagemPage() {
  usePageTitle('Contagem');
  const { isMaster, companies, companyId, setCompanyId } = useCompanyScope();

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');

  const load = useCallback(async () => {
    if (!companyId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const since = new Date();
    since.setDate(since.getDate() - Number(period));
    const { data, error } = await supabase
      .from('label_prints')
      .select('product_id, product_name_snapshot, printed_at, quantity')
      .eq('company_id', companyId)
      .gte('printed_at', since.toISOString())
      .order('printed_at', { ascending: false })
      .limit(5000);
    setLoading(false);
    if (error) {
      toast.error('Erro ao carregar: ' + error.message);
      return;
    }
    setRows((data as Row[] | null) ?? []);
  }, [companyId, period]);

  useEffect(() => {
    void load();
  }, [load]);

  const total = rows.reduce((s, r) => s + (r.quantity ?? 0), 0);
  const distinctProducts = new Set(rows.map((r) => r.product_id)).size;

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    rows.forEach((r) => {
      const key = r.product_id ?? r.product_name_snapshot;
      const cur = map.get(key) ?? { name: r.product_name_snapshot, count: 0 };
      cur.count += r.quantity ?? 0;
      map.set(key, cur);
    });
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [rows]);

  const maxCount = topProducts[0]?.count ?? 1;

  const byDay = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => {
      const d = r.printed_at.slice(0, 10);
      map.set(d, (map.get(d) ?? 0) + (r.quantity ?? 0));
    });
    const entries = Array.from(map.entries()).sort((a, b) =>
      a[0] < b[0] ? -1 : 1,
    );
    const max = Math.max(1, ...entries.map(([, n]) => n));
    return { entries, max };
  }, [rows]);

  const noCompany = isMaster && companies.length === 0;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Contagem"
        subtitle="Quantas etiquetas, em quê e quando — diagnóstico de produção."
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
        <Select
          label="Período"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
      </div>

      {noCompany ? (
        <Card>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            Nenhuma empresa cadastrada.
          </p>
        </Card>
      ) : loading ? (
        <ListSkeleton rows={5} />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-300">
                  <Printer size={18} />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    Total impresso
                  </p>
                  <p className="text-2xl font-semibold text-neutral-800 dark:text-neutral-100">
                    {total.toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300">
                  <BarChart3 size={18} />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    Produtos distintos
                  </p>
                  <p className="text-2xl font-semibold text-neutral-800 dark:text-neutral-100">
                    {distinctProducts}
                  </p>
                </div>
              </div>
            </Card>
            <Card>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300">
                  <BarChart3 size={18} />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    Etiquetas / dia
                  </p>
                  <p className="text-2xl font-semibold text-neutral-800 dark:text-neutral-100">
                    {Math.round(total / Math.max(1, Number(period)))}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
              Top 10 produtos
            </h2>
            {topProducts.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Nenhuma etiqueta no período.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {topProducts.map((p) => (
                  <li key={p.name}>
                    <div className="mb-1 flex justify-between text-xs text-neutral-600 dark:text-neutral-300">
                      <span className="truncate">{p.name}</span>
                      <span className="font-medium text-neutral-800 dark:text-neutral-100">
                        {p.count}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded bg-neutral-100 dark:bg-neutral-800">
                      <div
                        className="h-full bg-neutral-500"
                        style={{ width: `${(p.count / maxCount) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
              Volume por dia
            </h2>
            {byDay.entries.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Nenhuma etiqueta no período.
              </p>
            ) : (
              <div className="flex h-32 items-end gap-1">
                {byDay.entries.map(([day, n]) => {
                  const pct = (n / byDay.max) * 100;
                  return (
                    <div
                      key={day}
                      className="group relative flex flex-1 flex-col items-center"
                      title={`${day}: ${n}`}
                    >
                      <div
                        className="w-full rounded-t bg-neutral-500"
                        style={{ height: `${pct}%` }}
                      />
                      <span className="mt-1 truncate text-[10px] text-neutral-400">
                        {day.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
