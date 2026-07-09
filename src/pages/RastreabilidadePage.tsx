// Rastreabilidade / Recall em 1 clique
//
// Dado um LOTE (e opcionalmente um produto), mostra TUDO que existe
// envolvendo aquele lote na empresa atual:
//   - Recebimentos: quem trouxe, quando, qual fornecedor, quanto
//   - Etiquetas impressas: quantas, quando, manipulação/validade, status
//     (impressa/consumida/vencida)
//
// É o "recall em 1 clique" da ANVISA: descobre o impacto de um lote
// problemático em segundos.
import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Search, AlertTriangle, Package, Tag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { useCompanyScope } from '@/lib/useCompanyScope';
import { formatDateTime } from '@/lib/dates';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';

interface ReceivingRow {
  id: string;
  batch: string;
  quantity: number;
  unit: string | null;
  product: { name: string } | null;
  receiving: {
    id: string;
    received_at: string;
    supplier: { name: string } | null;
  } | null;
}

interface LabelRow {
  id: string;
  printed_at: string;
  manipulation_at: string;
  expiry_at: string;
  quantity: number;
  batch: string | null;
  supplier: string | null;
  product_name_snapshot: string;
  responsible_name: string;
  consumed_at: string | null;
  consumed_reason: string | null;
}

export function RastreabilidadePage() {
  usePageTitle('Rastreabilidade');
  const { companyId, companyName } = useCompanyScope();
  // Snapshot único de "agora" por sessão da página — lazy initializer do
  // useState para satisfazer a regra react-hooks/purity (sem Date.now no render).
  const [renderNow] = useState(() => Date.now());
  const [batch, setBatch] = useState('');
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [receivings, setReceivings] = useState<ReceivingRow[]>([]);
  const [labels, setLabels] = useState<LabelRow[]>([]);

  const search = useCallback(async () => {
    if (!companyId) return;
    const term = batch.trim();
    if (!term) {
      toast.error('Digite o lote para rastrear.');
      return;
    }
    setSearching(true);
    try {
      const [recRes, lblRes] = await Promise.all([
        supabase
          .from('receiving_items')
          .select(
            'id, batch, quantity, unit, product:products(name), receiving:receivings(id, received_at, supplier:suppliers(name))',
          )
          .eq('batch', term)
          .order('created_at', { ascending: false })
          .limit(500),
        supabase
          .from('label_prints')
          .select(
            'id, printed_at, manipulation_at, expiry_at, quantity, batch, supplier, product_name_snapshot, responsible_name, consumed_at, consumed_reason',
          )
          .eq('company_id', companyId)
          .eq('batch', term)
          .order('printed_at', { ascending: false })
          .limit(500),
      ]);
      if (recRes.error) throw recRes.error;
      if (lblRes.error) throw lblRes.error;
      setReceivings((recRes.data as unknown as ReceivingRow[]) ?? []);
      setLabels((lblRes.data as LabelRow[]) ?? []);
      setSearched(true);
    } catch (e) {
      toast.error('Erro ao buscar: ' + ((e as Error)?.message ?? String(e)));
    } finally {
      setSearching(false);
    }
  }, [batch, companyId]);

  const summary = useMemo(() => {
    const now = renderNow;
    const labelsTotal = labels.length;
    const consumed = labels.filter((l) => l.consumed_at).length;
    const expired = labels.filter(
      (l) => !l.consumed_at && new Date(l.expiry_at).getTime() < now,
    ).length;
    const active = labelsTotal - consumed - expired;
    const recTotal = receivings.length;
    return { labelsTotal, consumed, expired, active, recTotal };
  }, [labels, receivings, renderNow]);

  if (!companyId) {
    return (
      <Card>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Selecione uma empresa primeiro.
        </p>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <PageHeader
        title="Rastreabilidade"
        subtitle={
          <>
            {companyName} — recall em 1 clique. Digite o lote pra ver tudo que o
            envolve.
          </>
        }
      />

      <Card>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void search();
          }}
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
        >
          <Input
            label="Lote a investigar"
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
            placeholder="Ex: L-2026-05-29-01"
            className="flex-1"
            autoFocus
          />
          <Button type="submit" disabled={searching}>
            {searching ? <Spinner className="h-4 w-4" /> : <Search size={16} />}
            Rastrear
          </Button>
        </form>
      </Card>

      {searched && (
        <>
          <Card>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <Stat label="Recebimentos" value={summary.recTotal} />
              <Stat label="Etiquetas (total)" value={summary.labelsTotal} />
              <Stat label="Ativas" value={summary.active} tone="emerald" />
              <Stat
                label="Consumidas"
                value={summary.consumed}
                tone="neutral"
              />
              <Stat label="Vencidas" value={summary.expired} tone="red" />
            </div>
            {summary.labelsTotal === 0 && summary.recTotal === 0 && (
              <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 p-3 text-sm text-amber-800 dark:text-amber-200">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                Nenhum recebimento ou etiqueta com este lote.
              </p>
            )}
          </Card>

          {receivings.length > 0 && (
            <Card>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                <Package size={16} /> Recebimentos ({receivings.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400">
                    <tr>
                      <th className="px-2 py-1 text-left">Quando</th>
                      <th className="px-2 py-1 text-left">Produto</th>
                      <th className="px-2 py-1 text-left">Fornecedor</th>
                      <th className="px-2 py-1 text-right">Quantidade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receivings.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-neutral-100 dark:border-neutral-800"
                      >
                        <td className="px-2 py-1.5">
                          {r.receiving?.received_at
                            ? formatDateTime(new Date(r.receiving.received_at))
                            : '—'}
                        </td>
                        <td className="px-2 py-1.5">
                          {r.product?.name ?? '—'}
                        </td>
                        <td className="px-2 py-1.5">
                          {r.receiving?.supplier?.name ?? '—'}
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          {r.quantity} {r.unit ?? ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {labels.length > 0 && (
            <Card>
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                <Tag size={16} /> Etiquetas impressas ({labels.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400">
                    <tr>
                      <th className="px-2 py-1 text-left">Impressa</th>
                      <th className="px-2 py-1 text-left">Produto</th>
                      <th className="px-2 py-1 text-left">Manipulação</th>
                      <th className="px-2 py-1 text-left">Validade</th>
                      <th className="px-2 py-1 text-left">Responsável</th>
                      <th className="px-2 py-1 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {labels.map((l) => {
                      const now = renderNow;
                      const isConsumed = !!l.consumed_at;
                      const isExpired =
                        !isConsumed && new Date(l.expiry_at).getTime() < now;
                      return (
                        <tr
                          key={l.id}
                          className="border-b border-neutral-100 dark:border-neutral-800"
                        >
                          <td className="px-2 py-1.5">
                            {formatDateTime(new Date(l.printed_at))}
                          </td>
                          <td className="px-2 py-1.5">
                            {l.product_name_snapshot}
                          </td>
                          <td className="px-2 py-1.5">
                            {formatDateTime(new Date(l.manipulation_at))}
                          </td>
                          <td className="px-2 py-1.5">
                            {formatDateTime(new Date(l.expiry_at))}
                          </td>
                          <td className="px-2 py-1.5">{l.responsible_name}</td>
                          <td className="px-2 py-1.5">
                            {isConsumed ? (
                              <span className="rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 font-medium text-neutral-600 dark:text-neutral-300">
                                {l.consumed_reason ?? 'consumida'}
                              </span>
                            ) : isExpired ? (
                              <span className="rounded-full bg-red-50 dark:bg-red-950/40 px-2 py-0.5 font-medium text-red-700 dark:text-red-200">
                                vencida
                              </span>
                            ) : (
                              <span className="rounded-full bg-neutral-50 dark:bg-neutral-800/60 px-2 py-0.5 font-medium text-neutral-700 dark:text-neutral-200">
                                ativa
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = 'sky',
}: {
  label: string;
  value: number;
  tone?: 'sky' | 'emerald' | 'red' | 'neutral';
}) {
  const colors = {
    sky: 'bg-sky-50 text-sky-800',
    emerald:
      'bg-neutral-50 dark:bg-neutral-800/60 text-neutral-800 dark:text-neutral-100',
    red: 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200',
    neutral:
      'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200',
  }[tone];
  return (
    <div className={`rounded-lg p-3 text-center ${colors}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-[11px] font-medium uppercase opacity-80">
        {label}
      </div>
    </div>
  );
}
