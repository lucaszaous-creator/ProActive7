import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ShieldAlert } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { useCompanyScope } from '@/lib/useCompanyScope';
import { formatDateTime } from '@/lib/dates';
import {
  RECEIVING_UNIT_LABELS,
  STOCK_MOVEMENT_KIND_LABELS,
  type Product,
  type ReceivingUnit,
  type StockBalance,
  type StockMovement,
} from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';

interface BalanceRow extends StockBalance {
  product: { id: string; name: string } | null;
}

interface MovRow extends StockMovement {
  product: { id: string; name: string } | null;
}

export function ControladosPage() {
  usePageTitle('Produtos controlados');
  const { isMaster, companies, companyId, setCompanyId } = useCompanyScope();

  const [products, setProducts] = useState<Product[]>([]);
  const [balances, setBalances] = useState<BalanceRow[]>([]);
  const [movements, setMovements] = useState<MovRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!companyId) {
      setProducts([]);
      setBalances([]);
      setMovements([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: prods, error: prodErr } = await supabase
      .from('products')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_controlled', true)
      .order('name');
    if (prodErr) {
      setLoading(false);
      toast.error('Erro ao carregar produtos: ' + prodErr.message);
      return;
    }
    const list = (prods as Product[] | null) ?? [];
    setProducts(list);

    if (list.length === 0) {
      setBalances([]);
      setMovements([]);
      setLoading(false);
      return;
    }
    const productIds = list.map((p) => p.id);
    const [balRes, movRes] = await Promise.all([
      supabase
        .from('stock_balance_v')
        .select('*, product:products(id, name)')
        .eq('company_id', companyId)
        .in('product_id', productIds),
      supabase
        .from('stock_movements')
        .select('*, product:products(id, name)')
        .eq('company_id', companyId)
        .in('product_id', productIds)
        .order('moved_at', { ascending: false })
        .limit(50),
    ]);
    setLoading(false);
    if (balRes.error) {
      toast.error('Erro ao carregar saldo: ' + balRes.error.message);
    } else {
      setBalances((balRes.data as unknown as BalanceRow[] | null) ?? []);
    }
    if (movRes.error) {
      toast.error('Erro ao carregar movimentos: ' + movRes.error.message);
    } else {
      setMovements((movRes.data as unknown as MovRow[] | null) ?? []);
    }
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const noCompany = isMaster && companies.length === 0;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-800 sm:text-2xl">
            Produtos controlados
          </h1>
          <p className="text-sm text-neutral-500">
            Saneantes, químicos e outros itens marcados como controlados. Aqui
            você vê o <b>cadastro</b> (saldo atual por lote) e o <b>uso</b>{' '}
            (últimas entradas e saídas) — registro exigido para fiscalização
            sanitária.
          </p>
        </div>
      </div>

      {isMaster && companies.length > 0 && (
        <div className="mb-4 max-w-xs">
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
      ) : products.length === 0 ? (
        <Card>
          <p className="text-sm text-neutral-500">
            Nenhum produto controlado. Marque um produto como "controlado" em
            Cadastros → Produtos.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <Card>
            <h2 className="mb-1 text-sm font-semibold text-neutral-700">
              Cadastro · Saldo atual por lote
            </h2>
            <p className="mb-3 text-xs text-neutral-500">
              O que está em estoque agora — base para a contagem física.
            </p>
            {balances.length === 0 ? (
              <p className="text-sm text-neutral-500">
                Sem saldo nos produtos controlados.
              </p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {balances.map((b) => (
                  <li
                    key={`${b.product_id}-${b.batch}`}
                    className="flex items-center gap-3 py-2"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                      <ShieldAlert size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-neutral-800">
                        {b.product?.name ?? '—'}{' '}
                        <span className="text-xs font-normal text-neutral-500">
                          · lote {b.batch}
                        </span>
                      </p>
                    </div>
                    <span className="text-sm font-medium text-neutral-800">
                      {Number(b.balance).toLocaleString('pt-BR', {
                        maximumFractionDigits: 3,
                      })}{' '}
                      <span className="text-xs text-neutral-500">
                        {RECEIVING_UNIT_LABELS[b.unit as ReceivingUnit]}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="mb-1 text-sm font-semibold text-neutral-700">
              Uso · Últimas movimentações
            </h2>
            <p className="mb-3 text-xs text-neutral-500">
              Entradas (recebimento) e saídas (uso, descarte, vencimento) — a
              trilha que comprova o destino dos controlados.
            </p>
            {movements.length === 0 ? (
              <p className="text-sm text-neutral-500">Sem movimentações.</p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {movements.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-800">
                        {m.product?.name ?? '—'} · lote {m.batch}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {STOCK_MOVEMENT_KIND_LABELS[m.kind]} ·{' '}
                        {formatDateTime(m.moved_at)}
                        {m.reason ? ` · ${m.reason}` : ''}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        m.quantity_delta > 0
                          ? 'text-neutral-700'
                          : 'text-red-700'
                      }`}
                    >
                      {m.quantity_delta > 0 ? '+' : ''}
                      {Number(m.quantity_delta).toLocaleString('pt-BR', {
                        maximumFractionDigits: 3,
                      })}{' '}
                      <span className="text-xs text-neutral-500">
                        {RECEIVING_UNIT_LABELS[m.unit as ReceivingUnit]}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
