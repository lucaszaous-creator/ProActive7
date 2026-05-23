import { QRCodeSVG } from 'qrcode.react';
import { formatAllergenList } from '@/lib/allergens';

export interface LabelData {
  companyName: string;
  companyLogoUrl?: string | null;
  /** Hex (#rrggbb). Tinge o nome da empresa e a linha VALIDADE. */
  primaryColor?: string | null;
  productName: string;
  storageConditionLabel: string;
  manipulationText: string;
  expiryText: string;
  responsibleName: string;
  /** Chaves de alergenicos para imprimir "Contem: X, Y" quando presente. */
  allergens?: string[];
  /** URL codificada no QR (rastreabilidade). Quando ausente, oculta o QR. */
  qrUrl?: string;
}

interface LabelPreviewProps {
  data: LabelData;
  widthMm: number;
  heightMm: number;
}

/**
 * Etiqueta de validade de alimento, dimensionada em milimetros para sair
 * no tamanho exato pela impressora termica (via @page / window.print).
 */
export function LabelPreview({ data, widthMm, heightMm }: LabelPreviewProps) {
  // QR ocupa cerca de 10mm; so cabe em etiquetas grandes o suficiente.
  const showQr = Boolean(data.qrUrl) && widthMm >= 50 && heightMm >= 30;
  const qrSizeMm = Math.min(12, Math.floor(widthMm * 0.22));
  const accent = data.primaryColor ?? undefined;

  return (
    <div
      style={{
        width: `${widthMm}mm`,
        height: `${heightMm}mm`,
        padding: '2mm',
        boxSizing: 'border-box',
        borderTop: accent ? `0.8mm solid ${accent}` : undefined,
      }}
      className="flex flex-col justify-between overflow-hidden border border-neutral-400 bg-white text-black"
    >
      <div className="flex items-center justify-center gap-1">
        {data.companyLogoUrl ? (
          <img
            src={data.companyLogoUrl}
            alt=""
            style={{ height: '4mm', objectFit: 'contain' }}
          />
        ) : null}
        <p
          style={{ fontSize: '2mm', color: accent }}
          className="truncate uppercase tracking-wide"
        >
          {data.companyName || ' '}
        </p>
      </div>

      <div className="text-center">
        <p
          style={{ fontSize: '3.4mm', lineHeight: 1.1 }}
          className="font-bold uppercase"
        >
          {data.productName || '—'}
        </p>
        <p style={{ fontSize: '2mm' }} className="uppercase">
          {data.storageConditionLabel}
        </p>
      </div>

      <div className="flex items-end justify-between gap-2">
        <div
          style={{ fontSize: '2.4mm', lineHeight: 1.25 }}
          className="min-w-0 flex-1"
        >
          <div className="flex justify-between gap-1">
            <span>Manip.:</span>
            <span>{data.manipulationText}</span>
          </div>
          <div
            className="flex justify-between gap-1 font-bold"
            style={{ color: accent }}
          >
            <span>VALIDADE:</span>
            <span>{data.expiryText}</span>
          </div>
          <div className="flex justify-between gap-1">
            <span>Resp.:</span>
            <span className="truncate">{data.responsibleName || '—'}</span>
          </div>
          {data.allergens && data.allergens.length > 0 ? (
            <div
              className="truncate"
              style={{ fontSize: '1.8mm', lineHeight: 1.1 }}
            >
              <span className="font-bold">Contém: </span>
              {formatAllergenList(data.allergens)}
            </div>
          ) : null}
        </div>
        {showQr && data.qrUrl ? (
          <div style={{ width: `${qrSizeMm}mm`, height: `${qrSizeMm}mm` }}>
            <QRCodeSVG
              value={data.qrUrl}
              level="M"
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
