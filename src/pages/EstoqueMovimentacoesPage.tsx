import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { useCompanyScope } from '@/lib/useCompanyScope';
import { formatDateTime } from '@/lib/dates';
import {
  RECEIVING_UNIT_LABELS,
  STOCK_MOVEMENT_KIND_LABELS,
  type StockMovement,
  type StockMovementKind,
} from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { PageHeader } from '@/components/ui/PageHeader';

interface Row extends StockMovement {
  product: { id: string; name: string } | null;
}

export function EstoqueMovimentacoesPage() {
  usePageTitle('Movimentações de estoque');
  const { isMaster, companies, companyId, setCompanyId } = useCompanyScope();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [kindFilter, setKindFilter] = useState<StockMovementKind | ''>('');

  const load = useCallback(async () => {
    if (!companyId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*, product:products(id, name)')
      .eq('company_id', companyId)
      .order('moved_at', { ascending: false })
      .limit(200);
    setLoading(false);
    if (error) {
      toast.error('Erro ao carregar: ' + error.message);
      return;
    }
    setRows((data as unknown as Row[] | null) ?? []);
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = rows.filter((r) => !kindFilter || r.kind === kindFilter);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <Link to="/estoque">
              <Button variant="ghost">
                <ArrowLeft size={18} />
                Voltar
              </Button>
            </Link>
            Movimentações de estoque
          </span>
        }
        subtitle="Trilha completa de entradas, saídas, ajustes e descartes."
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
          label="Tipo"
          value={kindFilter}
          onChange={(e) =>
            setKindFilter(e.target.value as StockMovementKind | '')
          }
        >
          <option value="">Todos</option>
          {(Object.keys(STOCK_MOVEMENT_KIND_LABELS) as StockMovementKind[]).map(
            (k) => (
              <option key={k} value={k}>
                {STOCK_MOVEMENT_KIND_LABELS[k]}
              </option>
            ),
          )}
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Sem movimentações no período.
          </p>
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {filtered.map((r) => {
              const isEntry = r.quantity_delta > 0;
              return (
                <li key={r.id} className="flex items-center gap-3 py-3">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      isEntry
                        ? 'bg-neutral-50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-300'
                        : 'bg-red-50 text-red-600'
                    }`}
                  >
                    {isEntry ? (
                      <ArrowUpRight size={16} />
                    ) : (
                      <ArrowDownRight size={16} />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">
                      {r.product?.name ?? '—'} · lote {r.batch}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      {STOCK_MOVEMENT_KIND_LABELS[r.kind]} ·{' '}
                      {formatDateTime(r.moved_at)}
                      {r.reason ? ` · ${r.reason}` : ''}
                    </p>
                  </div>
                  <div
                    className={`text-sm font-medium ${
                      isEntry ? 'text-neutral-700 dark:text-neutral-200' : 'text-red-700'
                    }`}
                  >
                    {isEntry ? '+' : ''}
                    {Number(r.quantity_delta).toLocaleString('pt-BR', {
                      maximumFractionDigits: 3,
                    })}{' '}
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      {RECEIVING_UNIT_LABELS[r.unit]}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
