import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Tag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDateTime } from '@/lib/dates';
import { STORAGE_CONDITION_LABELS, type StorageCondition } from '@/lib/types';
import { allergenLabel } from '@/lib/allergens';
import { FullPageSpinner } from '@/components/ui/Spinner';

interface PublicLabel {
  product_name: string;
  storage_condition: StorageCondition;
  manipulation_at: string;
  expiry_at: string;
  responsible_name: string;
  batch: string | null;
  supplier: string | null;
  fabricated_at: string | null;
  allergens: string[];
  company_name: string;
  company_logo_path: string | null;
}

export function PublicLabelPage() {
  const { id } = useParams<{ id: string }>();
  const [label, setLabel] = useState<PublicLabel | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    supabase.rpc('get_public_label', { p_id: id }).then(({ data, error }) => {
      setLoading(false);
      if (error || !data || data.length === 0) {
        setNotFound(true);
        return;
      }
      setLabel(data[0] as PublicLabel);
    });
  }, [id]);

  if (loading) return <FullPageSpinner />;

  if (notFound || !label) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 p-6 text-center">
        <h1 className="text-lg font-semibold text-neutral-800">
          Etiqueta não encontrada
        </h1>
        <p className="max-w-sm text-sm text-neutral-600">
          Este QR aponta para uma etiqueta inexistente ou que foi removida.
        </p>
      </div>
    );
  }

  const expired = new Date(label.expiry_at) < new Date();
  const logoUrl = label.company_logo_path
    ? supabase.storage.from('branding').getPublicUrl(label.company_logo_path)
        .data.publicUrl
    : null;

  return (
    <div className="flex min-h-screen items-start justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-4 flex items-center gap-2">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-8 object-contain" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <Tag size={18} />
            </span>
          )}
          <span className="text-sm font-medium text-neutral-700">
            {label.company_name}
          </span>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="mb-1 text-xs uppercase tracking-wide text-neutral-500">
            Produto
          </p>
          <p className="mb-4 text-lg font-semibold text-neutral-900">
            {label.product_name}
          </p>

          <div
            className={`mb-4 rounded-lg p-3 text-sm ${
              expired
                ? 'bg-red-50 text-red-700'
                : 'bg-emerald-50 text-emerald-700'
            }`}
          >
            <p className="font-medium">
              {expired ? 'Vencida em' : 'Válida até'}
            </p>
            <p className="text-base font-semibold">
              {formatDateTime(label.expiry_at)}
            </p>
          </div>

          <dl className="space-y-2 text-sm text-neutral-700">
            <Row label="Armazenamento">
              {STORAGE_CONDITION_LABELS[label.storage_condition]}
            </Row>
            <Row label="Manipulação">
              {formatDateTime(label.manipulation_at)}
            </Row>
            <Row label="Responsável">{label.responsible_name}</Row>
            {label.batch ? <Row label="Lote">{label.batch}</Row> : null}
            {label.supplier ? (
              <Row label="Fornecedor">{label.supplier}</Row>
            ) : null}
            {label.fabricated_at ? (
              <Row label="Fabricação">
                {formatDateTime(label.fabricated_at)}
              </Row>
            ) : null}
          </dl>

          {label.allergens && label.allergens.length > 0 ? (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
              <p className="mb-1 font-medium text-amber-800">
                Contém alergênicos
              </p>
              <p className="text-xs text-amber-700">
                {label.allergens.map(allergenLabel).join(' · ')}
              </p>
            </div>
          ) : null}
        </div>

        <p className="mt-4 text-center text-xs text-neutral-400">
          Rastreabilidade via QR · Etiqueta
        </p>
      </div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
