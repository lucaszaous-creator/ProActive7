import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { formatDateTime } from '@/lib/dates';
import { STORAGE_CONDITION_LABELS, type StorageCondition } from '@/lib/types';
import { allergenLabel } from '@/lib/allergens';
import { FullPageSpinner } from '@/components/ui/Spinner';
import {
  BRAND_NAME,
  BRAND_TAGLINE,
  SITE_URL,
  usePageTitle,
} from '@/lib/usePageTitle';

interface PublicLabel {
  product_name: string;
  storage_condition: StorageCondition;
  manipulation_at: string;
  expiry_at: string;
  responsible_name: string;
  batch: string | null;
  supplier: string | null;
  fabricated_at: string | null;
  original_expiry_at: string | null;
  display_quantity: string | null;
  allergens: string[];
  company_name: string;
  company_logo_path: string | null;
  company_cnpj: string | null;
  company_address: string | null;
  company_phone: string | null;
}

/** Adiciona/atualiza <meta name="..."> ou <meta property="..."> no head. */
function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`,
  );
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
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

  // Title dinamico + meta description + og:title/description para
  // preview de WhatsApp/redes ao compartilhar o QR.
  usePageTitle(label?.product_name ?? null);

  useEffect(() => {
    if (!label) return;
    const description = `Rastreabilidade de ${label.product_name} — ${label.company_name}. Manipulado em ${formatDateTime(label.manipulation_at)}, válido até ${formatDateTime(label.expiry_at)}.`;
    upsertMeta('name', 'description', description);
    upsertMeta(
      'property',
      'og:title',
      `${label.product_name} · ${label.company_name}`,
    );
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:url', `${SITE_URL}/etiqueta/${id}`);
  }, [label, id]);

  if (loading) return <FullPageSpinner />;

  if (notFound || !label) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 p-6 text-center">
        <h1 className="text-lg font-semibold text-neutral-800">
          Etiqueta não encontrada
        </h1>
        <p className="max-w-sm text-sm text-neutral-600">
          Este QR aponta para uma etiqueta inexistente ou que foi removida.
        </p>
        <BrandFooter />
      </main>
    );
  }

  const expired = new Date(label.expiry_at) < new Date();
  const logoUrl = label.company_logo_path
    ? supabase.storage.from('branding').getPublicUrl(label.company_logo_path)
        .data.publicUrl
    : null;

  return (
    <main className="flex min-h-screen items-start justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-4 flex items-center gap-2">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={label.company_name}
              className="h-8 object-contain"
            />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-[10px] font-bold text-white">
              P7
            </span>
          )}
          <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-700">
            {label.company_name}
          </span>
        </div>

        <article className="rounded-xl border border-neutral-200 bg-white p-5">
          <p className="mb-1 text-xs uppercase tracking-wide text-neutral-500">
            Produto
          </p>
          <h1 className="mb-4 text-lg font-semibold text-neutral-900">
            {label.product_name}
          </h1>

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
            {label.display_quantity ? (
              <Row label="Quantidade">{label.display_quantity}</Row>
            ) : null}
            {label.original_expiry_at ? (
              <Row label="Validade original">
                {formatDateTime(label.original_expiry_at)}
              </Row>
            ) : null}
            <Row label="Manipulação">
              {formatDateTime(label.manipulation_at)}
            </Row>
            <Row label="Responsável">{label.responsible_name}</Row>
            {label.supplier ? (
              <Row label="Fornecedor / marca">{label.supplier}</Row>
            ) : null}
            {label.batch ? <Row label="Lote">{label.batch}</Row> : null}
            {label.fabricated_at ? (
              <Row label="Fabricação">
                {formatDateTime(label.fabricated_at)}
              </Row>
            ) : null}
          </dl>

          {label.company_address || label.company_cnpj ? (
            <div className="mt-4 border-t border-neutral-200 pt-3 text-xs text-neutral-500">
              {label.company_address ? <p>{label.company_address}</p> : null}
              {label.company_cnpj ? <p>CNPJ {label.company_cnpj}</p> : null}
              {label.company_phone ? <p>Tel {label.company_phone}</p> : null}
            </div>
          ) : null}

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
        </article>

        <BrandFooter />

        {/* JSON-LD Organization para rich result no Google */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: BRAND_NAME,
              description: BRAND_TAGLINE,
              url: SITE_URL,
              logo: `${SITE_URL}/proactive7-logo.svg`,
            }),
          }}
        />
      </div>
    </main>
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
      <dd className="break-words text-right">{children}</dd>
    </div>
  );
}

function BrandFooter() {
  return (
    <footer className="mt-4 flex flex-col items-center gap-3 text-center">
      <p className="text-xs text-neutral-400">Rastreabilidade via QR Code</p>
      <a
        href={SITE_URL}
        aria-label={`Sistema ${BRAND_NAME} — ${BRAND_TAGLINE}`}
        className="inline-block"
      >
        <img
          src="/proactive7-logo.svg"
          alt="ProActive7"
          className="h-9 w-auto opacity-80 transition hover:opacity-100"
        />
      </a>
    </footer>
  );
}
