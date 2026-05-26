import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ChefHat, AlertTriangle } from 'lucide-react';
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

export function ProducaoPage() {
  usePageTitle('Produção');
  const { profile } = useAuth();
  const { isMaster, companies, companyId, setCompanyId } = useCompanyScope();
  const [searchParams] = useSearchParams();

  const [labels, setLabels] = useState<LabelPrint[]>([]);
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
    const { data, error } = await supabase
      .from('label_prints')
      .select('*')
      .eq('company_id', companyId)
      .is('consumed_at', null)
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
        const { error: stkErr } = await supabase.from('stock_movements').insert({
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

      {noCompany ? (
        <Card>
          <p className="text-sm text-neutral-600">Nenhuma empresa cadastrada.</p>
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
        <Card>
          <ul className="divide-y divide-neutral-100">
            {filtered.map((l) => {
              const exp = new Date(l.expiry_at);
              const expired = exp < new Date();
              return (
                <li
                  key={l.id}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        expired
                          ? 'bg-red-50 text-red-600'
                          : 'bg-emerald-50 text-emerald-600'
                      }`}
                    >
                      {expired ? (
                        <AlertTriangle size={16} />
                      ) : (
                        <ChefHat size={16} />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-800">
                        {l.product_name_snapshot}
                        {l.batch ? ` · lote ${l.batch}` : ''}
                      </p>
                      <p className="text-xs text-neutral-500">
                        Vence {formatDateTime(exp)}
                        {expired ? ' · vencido' : ''}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => openModal(l)}>
                    Dar baixa
                  </Button>
                </li>
              );
            })}
          </ul>
        </Card>
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
              {(Object.keys(LABEL_CONSUMED_REASON_LABELS) as LabelConsumedReason[]).map(
                (r) => (
                  <option key={r} value={r}>
                    {LABEL_CONSUMED_REASON_LABELS[r]}
                  </option>
                ),
              )}
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
