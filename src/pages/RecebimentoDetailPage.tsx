import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Printer,
  AlertTriangle,
  PackageCheck,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { formatDateTime, formatDate } from '@/lib/dates';
import {
  STORAGE_CONDITION_LABELS,
  type ReceivingWithRelations,
  type StorageCondition,
} from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

export function RecebimentoDetailPage() {
  usePageTitle('Recebimento');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<ReceivingWithRelations | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data: rec, error } = await supabase
      .from('receivings')
      .select(
        `*,
         supplier:suppliers(id, name),
         receiving_items(*, product:products(id, name))`,
      )
      .eq('id', id)
      .single();
    if (error) {
      toast.error('Erro ao carregar: ' + error.message);
      setLoading(false);
      return;
    }
    const full = rec as unknown as ReceivingWithRelations;
    setData(full);

    if (full.photo_id) {
      const { data: photo } = await supabase
        .from('photos')
        .select('storage_path')
        .eq('id', full.photo_id)
        .single();
      if (photo?.storage_path) {
        const { data: signed } = await supabase.storage
          .from('photos')
          .createSignedUrl(photo.storage_path, 3600);
        setPhotoUrl(signed?.signedUrl ?? null);
      }
    } else {
      setPhotoUrl(null);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  function buildLabelUrl(
    item: ReceivingWithRelations['receiving_items'][number],
  ) {
    const params = new URLSearchParams();
    if (item.product_id) params.set('product_id', item.product_id);
    if (item.batch) params.set('batch', item.batch);
    if (data?.supplier?.name) params.set('supplier', data.supplier.name);
    if (item.expiry_date) params.set('expiry', item.expiry_date);
    if (item.storage_condition) params.set('storage', item.storage_condition);
    if (data?.id) params.set('receiving_id', data.id);
    return `/imprimir?${params.toString()}`;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex items-center gap-3">
        <Button variant="ghost" onClick={() => navigate('/recebimentos')}>
          <ArrowLeft size={18} />
          Voltar
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-neutral-800 sm:text-2xl">
            Recebimento
          </h1>
          {data && (
            <p className="text-sm text-neutral-500">
              {formatDateTime(data.received_at)}
            </p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : !data ? (
        <Card>
          <p className="text-sm text-neutral-500">Não encontrado.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <Card>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Fornecedor" value={data.supplier?.name ?? '—'} />
              <Field label="Nota fiscal" value={data.invoice_nf ?? '—'} />
              <Field
                label="Recebido em"
                value={formatDateTime(data.received_at)}
              />
              <Field label="Observações" value={data.notes ?? '—'} />
            </div>
            {photoUrl && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Foto anexada
                </p>
                <a href={photoUrl} target="_blank" rel="noopener noreferrer">
                  <img
                    src={photoUrl}
                    alt="Foto do recebimento"
                    className="max-h-64 rounded-lg border border-neutral-200"
                  />
                </a>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-neutral-700">
              Itens recebidos
            </h2>
            {data.receiving_items.length === 0 ? (
              <p className="text-sm text-neutral-500">Sem itens.</p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {data.receiving_items.map((it) => (
                  <li
                    key={it.id}
                    className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          it.rejected
                            ? 'bg-red-50 text-red-600'
                            : 'bg-neutral-50 text-neutral-600'
                        }`}
                      >
                        {it.rejected ? (
                          <AlertTriangle size={16} />
                        ) : (
                          <PackageCheck size={16} />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-neutral-800">
                          {it.product?.name ?? '—'} · lote {it.batch}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {it.quantity} {it.unit}
                          {it.temp_at_arrival != null
                            ? ` · ${it.temp_at_arrival}°C`
                            : ''}
                          {it.storage_condition
                            ? ` · ${STORAGE_CONDITION_LABELS[it.storage_condition as StorageCondition]}`
                            : ''}
                          {it.expiry_date
                            ? ` · vence ${formatDate(it.expiry_date)}`
                            : ''}
                        </p>
                        {it.rejected && it.rejection_reason && (
                          <p className="mt-1 text-xs text-red-600">
                            Rejeitado: {it.rejection_reason}
                          </p>
                        )}
                      </div>
                    </div>
                    {!it.rejected && (
                      <Link to={buildLabelUrl(it)}>
                        <Button size="sm" variant="secondary">
                          <Printer size={14} />
                          Etiquetar lote
                          <ExternalLink size={12} />
                        </Button>
                      </Link>
                    )}
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <p className="mt-1 text-sm text-neutral-800">{value}</p>
    </div>
  );
}
