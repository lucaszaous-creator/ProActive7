import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, PackageCheck, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { useCompanyScope } from '@/lib/useCompanyScope';
import { formatDateTime } from '@/lib/dates';
import type { Supplier } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/PageHeader';

interface ReceivingRow {
  id: string;
  company_id: string;
  invoice_nf: string | null;
  received_at: string;
  notes: string | null;
  supplier: { id: string; name: string } | null;
  receiving_items: { id: string; rejected: boolean }[];
}

export function RecebimentosPage() {
  usePageTitle('Recebimentos');
  const { isMaster, companies, companyId, setCompanyId } = useCompanyScope();

  const [list, setList] = useState<ReceivingRow[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  const [supplierFilter, setSupplierFilter] = useState('');
  const [onlyWithIssues, setOnlyWithIssues] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) {
      setList([]);
      setSuppliers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [recRes, supRes] = await Promise.all([
      supabase
        .from('receivings')
        .select(
          'id, company_id, invoice_nf, received_at, notes, supplier:suppliers(id, name), receiving_items(id, rejected)',
        )
        .eq('company_id', companyId)
        .order('received_at', { ascending: false })
        .limit(100),
      supabase.from('suppliers').select('*').eq('active', true).order('name'),
    ]);
    setLoading(false);
    if (recRes.error) {
      toast.error('Erro ao carregar recebimentos: ' + recRes.error.message);
      return;
    }
    if (supRes.error) {
      toast.error('Erro ao carregar fornecedores: ' + supRes.error.message);
    }
    setList((recRes.data as unknown as ReceivingRow[] | null) ?? []);
    setSuppliers((supRes.data as Supplier[] | null) ?? []);
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = list.filter((r) => {
    if (supplierFilter && r.supplier?.id !== supplierFilter) return false;
    if (onlyWithIssues && !r.receiving_items.some((i) => i.rejected))
      return false;
    return true;
  });

  const noCompany = isMaster && companies.length === 0;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Recebimentos"
        subtitle="Mercadoria que entrou na cozinha — fornecedor, lote, temperatura, validade."
        actions={
          <Link to="/recebimentos/novo">
            <Button disabled={!companyId}>
              <Plus size={18} />
              Novo recebimento
            </Button>
          </Link>
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
        <Select
          label="Fornecedor"
          value={supplierFilter}
          onChange={(e) => setSupplierFilter(e.target.value)}
        >
          <option value="">Todos</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        <label className="flex items-end gap-2 text-sm text-neutral-700 dark:text-neutral-200">
          <input
            type="checkbox"
            checked={onlyWithIssues}
            onChange={(e) => setOnlyWithIssues(e.target.checked)}
            className="mb-3 h-5 w-5 accent-neutral-600"
          />
          <span className="pb-3">Apenas com rejeição</span>
        </label>
      </div>

      {noCompany ? (
        <Card>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            Nenhuma empresa cadastrada. Crie uma empresa para começar.
          </p>
        </Card>
      ) : loading ? (
        <ListSkeleton rows={5} />
      ) : filtered.length === 0 ? (
        <Card>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Nenhum recebimento encontrado.
          </p>
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {filtered.map((r) => {
              const itemCount = r.receiving_items.length;
              const rejectedCount = r.receiving_items.filter(
                (i) => i.rejected,
              ).length;
              return (
                <li key={r.id}>
                  <Link
                    to={`/recebimentos/${r.id}`}
                    className="flex items-center gap-3 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        rejectedCount > 0
                          ? 'bg-amber-50 text-amber-600'
                          : 'bg-neutral-50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-300'
                      }`}
                    >
                      {rejectedCount > 0 ? (
                        <AlertTriangle size={16} />
                      ) : (
                        <PackageCheck size={16} />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">
                        {r.supplier?.name ?? 'Sem fornecedor'}
                        {r.invoice_nf ? ` — NF ${r.invoice_nf}` : ''}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {formatDateTime(r.received_at)} · {itemCount}{' '}
                        {itemCount === 1 ? 'item' : 'itens'}
                        {rejectedCount > 0
                          ? ` · ${rejectedCount} com rejeição`
                          : ''}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
