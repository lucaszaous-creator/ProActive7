import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { useCompanyScope } from '@/lib/useCompanyScope';
import { STORAGE_CONDITION_LABELS, type StorageCondition } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';

interface LabelRow {
  storage_condition: StorageCondition;
  printed_at: string;
  quantity: number;
  product_id: string | null;
  printed_by: string | null;
  product: { category: string | null } | null;
  printer: { full_name: string | null; email: string | null } | null;
}

const PERIODS = [
  { id: '7', label: 'Últimos 7 dias' },
  { id: '30', label: 'Últimos 30 dias' },
  { id: '90', label: 'Últimos 90 dias' },
] as const;

function aggregate(rows: LabelRow[]): {
  byCategory: { label: string; value: number }[];
  byUser: { label: string; value: number }[];
  byCondition: { label: string; value: number }[];
  total: number;
} {
  const cat = new Map<string, number>();
  const user = new Map<string, number>();
  const cond = new Map<string, number>();
  let total = 0;
  for (const r of rows) {
    const q = r.quantity;
    total += q;
    const catKey = r.product?.category ?? 'Sem categoria';
    cat.set(catKey, (cat.get(catKey) ?? 0) + q);
    const userKey =
      r.printer?.full_name ?? r.printer?.email ?? 'Não identificado';
    user.set(userKey, (user.get(userKey) ?? 0) + q);
    const condKey = STORAGE_CONDITION_LABELS[r.storage_condition];
    cond.set(condKey, (cond.get(condKey) ?? 0) + q);
  }
  const sort = (m: Map<string, number>) =>
    [...m.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  return {
    byCategory: sort(cat),
    byUser: sort(user),
    byCondition: sort(cond),
    total,
  };
}

function Bar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="truncate text-neutral-700">{label}</span>
        <span className="text-neutral-500">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-neutral-100">
        <div
          className="h-2 rounded-full bg-emerald-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function ReportsPage() {
  usePageTitle('Relatorios');
  const { isMaster, companies, companyId, setCompanyId } = useCompanyScope();
  const [period, setPeriod] = useState<(typeof PERIODS)[number]['id']>('30');
  const [rows, setRows] = useState<LabelRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!companyId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const since = new Date(
      Date.now() - Number(period) * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { data, error } = await supabase
      .from('label_prints')
      .select(
        'storage_condition, printed_at, quantity, product_id, printed_by, product:products(category), printer:profiles!label_prints_printed_by_fkey(full_name, email)',
      )
      .eq('company_id', companyId)
      .gte('printed_at', since);
    setLoading(false);
    if (error) {
      toast.error('Erro ao carregar relatório: ' + error.message);
      return;
    }
    setRows((data as unknown as LabelRow[] | null) ?? []);
  }, [companyId, period]);

  useEffect(() => {
    void load();
  }, [load]);

  const data = aggregate(rows);
  const maxCat = Math.max(0, ...data.byCategory.map((r) => r.value));
  const maxUser = Math.max(0, ...data.byUser.map((r) => r.value));
  const maxCond = Math.max(0, ...data.byCondition.map((r) => r.value));
  const noCompany = isMaster && companies.length === 0;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-neutral-800 sm:text-2xl">
          Relatórios
        </h1>
        <p className="text-sm text-neutral-500">
          Etiquetas impressas no período selecionado.
        </p>
      </div>

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
          <p className="text-sm text-neutral-600">
            Nenhuma empresa cadastrada. Crie uma empresa para começar.
          </p>
        </Card>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <p className="text-sm text-neutral-600">
            Nenhuma etiqueta impressa neste período.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <Card>
            <p className="text-xs uppercase tracking-wide text-neutral-500">
              Total de etiquetas
            </p>
            <p className="text-3xl font-semibold text-neutral-800">
              {data.total}
            </p>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-neutral-700">
                Por categoria
              </h2>
              <div className="flex flex-col gap-2">
                {data.byCategory.map((r) => (
                  <Bar
                    key={r.label}
                    label={r.label}
                    value={r.value}
                    max={maxCat}
                  />
                ))}
              </div>
            </Card>

            <Card>
              <h2 className="mb-3 text-sm font-semibold text-neutral-700">
                Por usuário
              </h2>
              <div className="flex flex-col gap-2">
                {data.byUser.map((r) => (
                  <Bar
                    key={r.label}
                    label={r.label}
                    value={r.value}
                    max={maxUser}
                  />
                ))}
              </div>
            </Card>

            <Card className="lg:col-span-2">
              <h2 className="mb-3 text-sm font-semibold text-neutral-700">
                Por condição de armazenamento
              </h2>
              <div className="flex flex-col gap-2">
                {data.byCondition.map((r) => (
                  <Bar
                    key={r.label}
                    label={r.label}
                    value={r.value}
                    max={maxCond}
                  />
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
