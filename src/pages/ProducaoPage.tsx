import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ChefHat,
  AlertTriangle,
  Boxes,
  Clock,
  ArrowDownCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { useAuth } from '@/context/AuthContext';
import { useCompanyScope } from '@/lib/useCompanyScope';
import { formatDateTime } from '@/lib/dates';
import {
  LABEL_CONSUMED_REASON_LABELS,
  type LabelConsumedReason,
  type LabelPrint,
} from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';

const MS_DAY = 86_400_000;

/** Status visual da validade de um item produzido. */
function expiryInfo(expiryAt: string, now: number) {
  const diff = new Date(expiryAt).getTime() - now;
  if (diff < 0)
    return {
      label: 'Vencido',
      badge: 'border-red-200 bg-red-50 text-red-700',
      ring: 'border-red-200',
      expired: true,
      soon: false,
    };
  const days = Math.ceil(diff / MS_DAY);
  if (diff < MS_DAY)
    return {
      label: 'Vence hoje',
      badge: 'border-amber-200 bg-amber-50 text-amber-700',
      ring: 'border-amber-200',
      expired: false,
      soon: true,
    };
  if (days <= 3)
    return {
      label: `Vence em ${days}d`,
      badge: 'border-amber-200 bg-amber-50 text-amber-700',
      ring: 'border-amber-200',
      expired: false,
      soon: true,
    };
  return {
    label: `Vence em ${days}d`,
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    ring: 'border-neutral-200',
    expired: false,
    soon: false,
  };
}

export function ProducaoPage() {
  usePageTitle('Produção');
  // Snapshot de "agora" por sessão (lazy useState → satisfaz react-hooks/purity).
  const [now] = useState(() => Date.now());
  const { profile } = useAuth();
  const { isMaster, companies, companyId, setCompanyId } = useCompanyScope();
  const [searchParams] = useSearchParams();

  const [labels, setLabels] = useState<LabelPrint[]>([]);
  const [balances, setBalances] = useState<
    Map<string, { balance: number; unit: string }>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [target, setTarget] = useState<LabelPrint | null>(null);
  const [reason, setReason] = useState<LabelConsumedReason>('producao');
  const [quantityOut, setQuantityOut] = useState('');
  const [unit, setUnit] = useState('un');
  const [alsoStock, setAlsoStock] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) {
      setLabels([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [lblRes, balRes] = await Promise.all([
      supabase
        .from('label_prints')
        .select('*')
        .eq('company_id', companyId)
        .is('consumed_at', null)
        .order('expiry_at', { ascending: true })
        .limit(500),
      supabase
        .from('stock_balance_v')
        .select('product_id, batch, balance, unit')
        .eq('company_id', companyId),
    ]);
    setLoading(false);
    if (lblRes.error) {
      toast.error('Erro ao carregar: ' + lblRes.error.message);
      return;
    }
    setLabels((lblRes.data as LabelPrint[] | null) ?? []);

    const map = new Map<string, { balance: number; unit: string }>();
    for (const b of (balRes.data ?? []) as {
      product_id: string | null;
      batch: string | null;
      balance: number;
      unit: string;
    }[]) {
      if (b.product_id && b.batch) {
        map.set(`${b.product_id}|${b.batch}`, {
          balance: Number(b.balance),
          unit: b.unit,
        });
      }
    }
    setBalances(map);
  }, [companyId]);

  const stockFor = useCallback(
    (l: LabelPrint) =>
      l.product_id && l.batch
        ? (balances.get(`${l.product_id}|${l.batch}`) ?? null)
        : null,
    [balances],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // Deeplink: /producao?label=<id>
  useEffect(() => {
    const id = searchParams.get('label');
    if (!id) return;
    const match = labels.find((l) => l.id === id);
    if (match && !target) {
      openModal(match);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labels, searchParams]);

  const filtered = useMemo(() => {
    if (!search) return labels;
    const q = search.toLowerCase();
    return labels.filter(
      (l) =>
        l.product_name_snapshot.toLowerCase().includes(q) ||
        (l.batch ?? '').toLowerCase().includes(q),
    );
  }, [labels, search]);

  const summary = useMemo(() => {
    let expired = 0;
    let soon = 0;
    for (const l of labels) {
      const info = expiryInfo(l.expiry_at, now);
      if (info.expired) expired += 1;
      else if (info.soon) soon += 1;
    }
    return { total: labels.length, expired, soon };
  }, [labels, now]);

  function openModal(label: LabelPrint) {
    setTarget(label);
    setReason('producao');
    setQuantityOut('');
    setUnit('un');
    setAlsoStock(false);
  }

  async function handleConfirm() {
    if (!target) return;
    setSaving(true);
    const consumedAt = new Date().toISOString();
    const { error } = await supabase
      .from('label_prints')
      .update({
        consumed_at: consumedAt,
        consumed_by: profile?.id ?? null,
        consumed_reason: reason,
      })
      .eq('id', target.id);
    if (error) {
      setSaving(false);
      toast.error('Erro ao baixar etiqueta: ' + error.message);
      return;
    }

    if (alsoStock && target.product_id && target.batch) {
      const qty = Number(quantityOut);
      if (Number.isFinite(qty) && qty > 0) {
        const kind =
          reason === 'producao'
            ? 'saida'
            : reason === 'vencimento'
              ? 'vencimento'
              : 'descarte';
        const { error: stkErr } = await supabase
          .from('stock_movements')
          .insert({
            company_id: target.company_id,
            product_id: target.product_id,
            batch: target.batch,
            quantity_delta: -qty,
            unit,
            kind,
            reason: `Baixa de etiqueta — ${LABEL_CONSUMED_REASON_LABELS[reason]}`,
            reference_type: 'manual',
            reference_id: target.id,
            moved_by: profile?.id ?? null,
          });
        if (stkErr) {
          toast.error(
            'Etiqueta baixada, mas falha ao gerar movimento de estoque: ' +
              stkErr.message,
          );
        }
      }
    }

    setSaving(false);
    toast.success('Etiqueta baixada.');
    setTarget(null);
    void load();
  }

  const noCompany = isMaster && companies.length === 0;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-800 sm:text-2xl">
            Produção
          </h1>
          <p className="text-sm text-neutral-500">
            Dê baixa nas etiquetas conforme o lote vai sendo usado, descartado
            ou vence.
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
          placeholder="produto ou lote"
        />
      </div>

      {!noCompany && !loading && labels.length > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-3">
          <StatCard
            icon={<Boxes size={16} />}
            label="Itens ativos"
            value={summary.total}
            tone="emerald"
          />
          <StatCard
            icon={<Clock size={16} />}
            label="Vencendo"
            value={summary.soon}
            tone="amber"
          />
          <StatCard
            icon={<AlertTriangle size={16} />}
            label="Vencidos"
            value={summary.expired}
            tone="red"
          />
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
      ) : filtered.length === 0 ? (
        <Card>
          <p className="text-sm text-neutral-500">
            Nenhuma etiqueta ativa. Imprima etiquetas em /imprimir.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((l) => {
            const info = expiryInfo(l.expiry_at, now);
            const stock = stockFor(l);
            return (
              <div
                key={l.id}
                className={`flex flex-col rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md ${info.ring}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      info.expired
                        ? 'bg-red-50 text-red-600'
                        : info.soon
                          ? 'bg-amber-50 text-amber-600'
                          : 'bg-emerald-50 text-emerald-600'
                    }`}
                  >
                    {info.expired ? (
                      <AlertTriangle size={16} />
                    ) : (
                      <ChefHat size={16} />
                    )}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${info.badge}`}
                  >
                    {info.label}
                  </span>
                </div>

                <p
                  className="mt-3 truncate text-sm font-semibold text-neutral-800"
                  title={l.product_name_snapshot}
                >
                  {l.product_name_snapshot}
                </p>
                {l.batch && (
                  <p className="text-xs text-neutral-500">Lote {l.batch}</p>
                )}

                <dl className="mt-3 space-y-1 text-xs text-neutral-500">
                  {l.display_quantity && (
                    <div className="flex justify-between gap-2">
                      <dt>Produzido</dt>
                      <dd className="font-medium text-neutral-700">
                        {l.display_quantity}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-2">
                    <dt>Validade</dt>
                    <dd className="font-medium text-neutral-700">
                      {formatDateTime(l.expiry_at)}
                    </dd>
                  </div>
                  {stock && (
                    <div className="flex justify-between gap-2">
                      <dt>Em estoque (lote)</dt>
                      <dd
                        className={`font-semibold ${
                          stock.balance <= 0
                            ? 'text-red-600'
                            : 'text-emerald-700'
                        }`}
                      >
                        {stock.balance.toLocaleString('pt-BR', {
                          maximumFractionDigits: 3,
                        })}{' '}
                        {stock.unit}
                      </dd>
                    </div>
                  )}
                </dl>

                <Button
                  size="sm"
                  className="mt-4 w-full"
                  onClick={() => openModal(l)}
                >
                  <ArrowDownCircle size={15} /> Dar baixa
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={target !== null}
        onClose={() => setTarget(null)}
        title="Dar baixa na etiqueta"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setTarget(null)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleConfirm} loading={saving}>
              Confirmar baixa
            </Button>
          </>
        }
      >
        {target && (
          <div className="flex flex-col gap-3">
            <div className="rounded-lg bg-neutral-50 p-3 text-sm text-neutral-700">
              <p className="font-medium">{target.product_name_snapshot}</p>
              <p className="text-xs text-neutral-500">
                {target.batch ? `Lote ${target.batch} · ` : ''}
                Vence {formatDateTime(new Date(target.expiry_at))}
              </p>
            </div>
            <Select
              label="Motivo"
              value={reason}
              onChange={(e) => setReason(e.target.value as LabelConsumedReason)}
            >
              {(
                Object.keys(
                  LABEL_CONSUMED_REASON_LABELS,
                ) as LabelConsumedReason[]
              ).map((r) => (
                <option key={r} value={r}>
                  {LABEL_CONSUMED_REASON_LABELS[r]}
                </option>
              ))}
            </Select>
            {target.product_id && target.batch && (
              <label className="flex items-start gap-2 rounded-lg border border-neutral-200 p-3 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={alsoStock}
                  onChange={(e) => setAlsoStock(e.target.checked)}
                  className="mt-0.5 h-5 w-5 accent-emerald-600"
                />
                <span>
                  Também gerar movimento de estoque (sai de
                  <span className="font-medium"> lote {target.batch}</span>)
                </span>
              </label>
            )}
            {alsoStock && (
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <Input
                  id="qty-out"
                  label="Quantidade"
                  type="number"
                  step="0.001"
                  min="0"
                  value={quantityOut}
                  onChange={(e) => setQuantityOut(e.target.value)}
                />
                <Select
                  label="Un."
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                >
                  {['kg', 'g', 'un', 'L', 'mL', 'cx'].map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  tone: 'emerald' | 'amber' | 'red';
}) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
  } as const;
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3 text-center">
      <div
        className={`mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-lg ${tones[tone]}`}
      >
        {icon}
      </div>
      <div className="text-lg font-semibold text-neutral-800">{value}</div>
      <div className="text-[11px] text-neutral-500">{label}</div>
    </div>
  );
}
