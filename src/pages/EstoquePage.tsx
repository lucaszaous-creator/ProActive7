import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Boxes, History, Minus, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { useAuth } from '@/context/AuthContext';
import { useCompanyScope } from '@/lib/useCompanyScope';
import { formatDate } from '@/lib/dates';
import {
  RECEIVING_UNIT_LABELS,
  STOCK_EXIT_REASONS,
  type Product,
  type ReceivingUnit,
  type StockBalance,
  type StockMovementKind,
} from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { PageHeader } from '@/components/ui/PageHeader';

interface BalanceRow extends StockBalance {
  product: { id: string; name: string; category: string | null } | null;
}

interface ExitForm {
  product_id: string;
  batch: string;
  quantity: string;
  unit: ReceivingUnit;
  kind: StockMovementKind;
  reason: string;
}

function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date + 'T00:00:00');
  const ms = target.getTime() - today.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function EstoquePage() {
  usePageTitle('Estoque');
  const { profile } = useAuth();
  const { isMaster, companies, companyId, setCompanyId } = useCompanyScope();

  const [rows, setRows] = useState<BalanceRow[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [categoryFilter, setCategoryFilter] = useState('');
  const [search, setSearch] = useState('');

  const [exitOpen, setExitOpen] = useState(false);
  const [exitSaving, setExitSaving] = useState(false);
  const [exitForm, setExitForm] = useState<ExitForm>({
    product_id: '',
    batch: '',
    quantity: '',
    unit: 'kg',
    kind: 'saida',
    reason: '',
  });

  const load = useCallback(async () => {
    if (!companyId) {
      setRows([]);
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [balRes, prodRes] = await Promise.all([
      supabase
        .from('stock_balance_v')
        .select('*, product:products(id, name, category)')
        .eq('company_id', companyId),
      supabase
        .from('products')
        .select(
          'id, name, category, default_storage_condition, active, allergens, is_seed, created_by, created_at, updated_at, company_id',
        )
        .eq('company_id', companyId)
        .eq('active', true)
        .order('name'),
    ]);
    setLoading(false);
    if (balRes.error) {
      toast.error('Erro ao carregar saldo: ' + balRes.error.message);
      return;
    }
    if (prodRes.error) {
      toast.error('Erro ao carregar produtos: ' + prodRes.error.message);
    }
    const data = (balRes.data as unknown as BalanceRow[] | null) ?? [];
    // FIFO: vencendo primeiro, depois por nome
    data.sort((a, b) => {
      if (a.oldest_expiry && b.oldest_expiry) {
        if (a.oldest_expiry !== b.oldest_expiry)
          return a.oldest_expiry < b.oldest_expiry ? -1 : 1;
      } else if (a.oldest_expiry && !b.oldest_expiry) {
        return -1;
      } else if (!a.oldest_expiry && b.oldest_expiry) {
        return 1;
      }
      const an = a.product?.name ?? '';
      const bn = b.product?.name ?? '';
      return an.localeCompare(bn);
    });
    setRows(data);
    setProducts((prodRes.data as Product[] | null) ?? []);
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.product?.category) set.add(r.product.category);
    });
    return Array.from(set).sort();
  }, [rows]);

  const filtered = rows.filter((r) => {
    if (categoryFilter && r.product?.category !== categoryFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const name = r.product?.name?.toLowerCase() ?? '';
      const batch = r.batch.toLowerCase();
      if (!name.includes(q) && !batch.includes(q)) return false;
    }
    return true;
  });

  function openExit(prefill?: BalanceRow) {
    if (prefill) {
      setExitForm({
        product_id: prefill.product_id,
        batch: prefill.batch,
        quantity: '',
        unit: prefill.unit,
        kind: 'saida',
        reason: '',
      });
    } else {
      setExitForm({
        product_id: '',
        batch: '',
        quantity: '',
        unit: 'kg',
        kind: 'saida',
        reason: '',
      });
    }
    setExitOpen(true);
  }

  function handleProductSelectForExit(productId: string) {
    // sugere lote FIFO para o produto
    const fifo = rows
      .filter((r) => r.product_id === productId)
      .sort((a, b) => {
        if (a.oldest_expiry && b.oldest_expiry)
          return a.oldest_expiry < b.oldest_expiry ? -1 : 1;
        if (a.oldest_expiry) return -1;
        if (b.oldest_expiry) return 1;
        return 0;
      })[0];
    setExitForm((prev) => ({
      ...prev,
      product_id: productId,
      batch: fifo?.batch ?? '',
      unit: fifo?.unit ?? prev.unit,
    }));
  }

  async function handleExitSave() {
    if (!companyId) return;
    if (!exitForm.product_id || !exitForm.batch || !exitForm.quantity) {
      toast.error('Produto, lote e quantidade são obrigatórios.');
      return;
    }
    const qty = Number(exitForm.quantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.error('Quantidade inválida.');
      return;
    }
    // saldo atual
    const current = rows.find(
      (r) => r.product_id === exitForm.product_id && r.batch === exitForm.batch,
    );
    if (current && qty > current.balance) {
      toast.error(
        `Quantidade maior que o saldo (${current.balance} ${current.unit}).`,
      );
      return;
    }
    setExitSaving(true);
    const { error } = await supabase.from('stock_movements').insert({
      company_id: companyId,
      product_id: exitForm.product_id,
      batch: exitForm.batch,
      quantity_delta: -qty,
      unit: exitForm.unit,
      kind: exitForm.kind,
      reason: exitForm.reason.trim() || null,
      reference_type: 'manual',
      moved_by: profile?.id ?? null,
    });
    setExitSaving(false);
    if (error) {
      toast.error('Erro ao registrar: ' + error.message);
      return;
    }
    toast.success('Saída registrada.');
    setExitOpen(false);
    void load();
  }

  const noCompany = isMaster && companies.length === 0;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Estoque (matéria-prima)"
        subtitle={
          <>
            Saldo dos <b>itens recebidos</b> (NF / nota), por lote, ordenado
            por validade (FIFO). Para acompanhar etiquetas de produção já
            feitas, use <b>Produção</b>.
          </>
        }
        actions={
          <>
            <Link to="/estoque/movimentacoes">
              <Button variant="secondary">
                <History size={16} />
                Movimentações
              </Button>
            </Link>
            <Button
              onClick={() => openExit()}
              disabled={!companyId || rows.length === 0}
            >
              <Minus size={18} />
              Registrar saída
            </Button>
          </>
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
          label="Categoria"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">Todas</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Input
          id="search"
          label="Buscar (produto ou lote)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Ex.: alface, L-2026"
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
        <Card>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Sem saldo. Registre recebimentos para começar.
          </p>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-left text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  <th className="px-2 py-2">Produto</th>
                  <th className="px-2 py-2">Lote</th>
                  <th className="px-2 py-2 text-right">Saldo</th>
                  <th className="px-2 py-2">Vencimento</th>
                  <th className="px-2 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const days = daysUntil(r.oldest_expiry);
                  const expiringSoon = days !== null && days <= 7;
                  const expired = days !== null && days < 0;
                  return (
                    <tr
                      key={`${r.product_id}-${r.batch}`}
                      className="border-b border-neutral-100 dark:border-neutral-800"
                    >
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-2">
                          <Boxes size={14} className="text-neutral-400" />
                          <span className="font-medium text-neutral-800 dark:text-neutral-100">
                            {r.product?.name ?? '—'}
                          </span>
                          {r.product?.category && (
                            <span className="rounded bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-500 dark:text-neutral-400">
                              {r.product.category}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-neutral-600 dark:text-neutral-300">{r.batch}</td>
                      <td className="px-2 py-2 text-right font-medium text-neutral-800 dark:text-neutral-100">
                        {Number(r.balance).toLocaleString('pt-BR', {
                          maximumFractionDigits: 3,
                        })}{' '}
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">
                          {RECEIVING_UNIT_LABELS[r.unit]}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        {r.oldest_expiry ? (
                          <span
                            className={`inline-flex items-center gap-1 ${
                              expired
                                ? 'text-red-600 dark:text-red-300'
                                : expiringSoon
                                  ? 'text-amber-600 dark:text-amber-300'
                                  : 'text-neutral-600 dark:text-neutral-300'
                            }`}
                          >
                            {(expired || expiringSoon) && (
                              <AlertTriangle size={12} />
                            )}
                            {formatDate(r.oldest_expiry)}
                            {days !== null && (
                              <span className="text-xs text-neutral-400">
                                ({expired ? `vencido há ${-days}d` : `${days}d`}
                                )
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <button
                          onClick={() => openExit(r)}
                          className="rounded-lg bg-neutral-100 dark:bg-neutral-800 px-2 py-1 text-xs font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200"
                        >
                          Dar saída
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        open={exitOpen}
        onClose={() => setExitOpen(false)}
        title="Registrar saída de estoque"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setExitOpen(false)}
              disabled={exitSaving}
            >
              Cancelar
            </Button>
            <Button onClick={handleExitSave} loading={exitSaving}>
              Registrar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Select
            label="Produto"
            value={exitForm.product_id}
            onChange={(e) => handleProductSelectForExit(e.target.value)}
          >
            <option value="">Selecione...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Select
            label="Lote (sugerido FIFO)"
            value={exitForm.batch}
            onChange={(e) =>
              setExitForm((prev) => ({ ...prev, batch: e.target.value }))
            }
            disabled={!exitForm.product_id}
          >
            <option value="">Selecione...</option>
            {rows
              .filter((r) => r.product_id === exitForm.product_id)
              .map((r) => (
                <option key={r.batch} value={r.batch}>
                  {r.batch} — saldo {r.balance} {r.unit}
                  {r.oldest_expiry
                    ? ` · vence ${formatDate(r.oldest_expiry)}`
                    : ''}
                </option>
              ))}
          </Select>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Input
              id="exit-qty"
              label="Quantidade"
              type="number"
              step="0.001"
              min="0"
              value={exitForm.quantity}
              onChange={(e) =>
                setExitForm((prev) => ({ ...prev, quantity: e.target.value }))
              }
            />
            <Input
              id="exit-unit"
              label="Un."
              value={RECEIVING_UNIT_LABELS[exitForm.unit]}
              disabled
            />
          </div>
          <Select
            label="Motivo"
            value={exitForm.kind}
            onChange={(e) =>
              setExitForm((prev) => ({
                ...prev,
                kind: e.target.value as StockMovementKind,
              }))
            }
          >
            {STOCK_EXIT_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
          <Input
            id="exit-reason"
            label="Observação"
            value={exitForm.reason}
            onChange={(e) =>
              setExitForm((prev) => ({ ...prev, reason: e.target.value }))
            }
            placeholder="Ex.: Sopa do almoço de 26/05"
          />
        </div>
      </Modal>
    </div>
  );
}
