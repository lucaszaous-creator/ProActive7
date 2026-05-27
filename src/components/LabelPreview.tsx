import { QRCodeSVG } from 'qrcode.react';
import { formatAllergenList } from '@/lib/allergens';

export interface LabelData {
  companyName: string;
  companyLogoUrl?: string | null;
  companyCnpj?: string | null;
  companyAddress?: string | null;
  primaryColor?: string | null;
  productName: string;
  storageConditionLabel: string;
  displayQuantity?: string | null;
  originalExpiryText?: string | null;
  manipulationText: string;
  expiryText: string;
  responsibleName: string;
  batch?: string | null;
  supplier?: string | null;
  allergens?: string[];
  printId?: string | null;
  qrUrl?: string;
}

interface LabelPreviewProps {
  data: LabelData;
  widthMm: number;
  heightMm: number;
}

function Row({
  label,
  value,
  fontSize,
}: {
  label: string;
  value: string;
  fontSize: string;
}) {
  return (
    <div
      className="flex justify-between gap-2"
      style={{ fontSize, color: '#000' }}
    >
      <span className="shrink-0 font-bold" style={{ color: '#000' }}>
        {label}
      </span>
      <span
        className="min-w-0 flex-1 text-right"
        style={{
          overflowWrap: 'anywhere',
          wordBreak: 'break-word',
          color: '#000',
        }}
      >
        {value || '—'}
      </span>
    </div>
  );
}

/**
 * Etiqueta de validade — layout inspirado na Suflex Restaurant:
 * nome do produto à esquerda em destaque, linha separadora, condição
 * de armazenamento, bloco MANIPULAÇÃO/VALIDADE alinhado à direita,
 * responsável, dados da empresa no rodapé, QR no canto inferior direito.
 */
export function LabelPreview({ data, widthMm, heightMm }: LabelPreviewProps) {
  const showQr = Boolean(data.qrUrl) && widthMm >= 50 && heightMm >= 30;
  const qrSizeMm = Math.max(10, Math.min(16, Math.floor(widthMm * 0.22)));

  const fsXs = `${Math.max(1.4, heightMm * 0.04).toFixed(2)}mm`;
  const fsSm = `${Math.max(1.6, heightMm * 0.045).toFixed(2)}mm`;
  const fsLg = `${Math.max(2.8, heightMm * 0.075).toFixed(2)}mm`;

  const compact = heightMm <= 40;

  return (
    <div
      style={{
        width: `${widthMm}mm`,
        height: `${heightMm}mm`,
        padding: '2mm',
        boxSizing: 'border-box',
        color: '#000',
        background: '#fff',
        fontFamily: 'Arial, Helvetica, sans-serif',
      }}
      className="flex flex-col gap-[0.6mm] overflow-hidden border border-neutral-400"
    >
      <p
        className="font-bold uppercase leading-tight"
        style={{ fontSize: fsLg, lineHeight: 1.05, color: '#000' }}
      >
        {data.productName || '—'}
      </p>

      <div style={{ borderTop: '0.25mm solid #000' }} />

      <p
        className="font-bold uppercase"
        style={{ fontSize: fsSm, color: '#000' }}
      >
        {data.storageConditionLabel}
        {data.displayQuantity ? (
          <span className="ml-2" style={{ color: '#000' }}>
            — {data.displayQuantity}
          </span>
        ) : null}
      </p>

      <div
        className="mt-[1mm] flex flex-col gap-[0.4mm]"
        style={{ fontSize: fsSm, lineHeight: 1.2, color: '#000' }}
      >
        {!compact && data.originalExpiryText ? (
          <Row
            label="VALID. ORIGINAL:"
            value={data.originalExpiryText}
            fontSize={fsSm}
          />
        ) : null}
        <Row
          label="MANIPULAÇÃO:"
          value={data.manipulationText}
          fontSize={fsSm}
        />
        <Row label="VALIDADE:" value={data.expiryText} fontSize={fsSm} />
      </div>

      <div className="flex-1" />

      <div className="flex items-end gap-[1.5mm]">
        <div
          className="min-w-0 flex-1"
          style={{ fontSize: fsXs, lineHeight: 1.25, color: '#000' }}
        >
          <p style={{ color: '#000' }}>
            <span className="font-bold">RESP.: </span>
            {data.responsibleName || '—'}
          </p>
          {data.supplier ? (
            <p style={{ color: '#000' }}>
              <span className="font-bold">FORNECEDOR: </span>
              {data.supplier}
            </p>
          ) : null}
          {data.batch ? (
            <p style={{ color: '#000' }}>
              <span className="font-bold">LOTE: </span>
              {data.batch}
            </p>
          ) : null}
          {data.companyName ? (
            <p
              className="font-bold uppercase"
              style={{ color: '#000', overflowWrap: 'anywhere' }}
            >
              {data.companyName}
            </p>
          ) : null}
          {!compact && data.companyCnpj ? (
            <p style={{ color: '#000' }}>CNPJ: {data.companyCnpj}</p>
          ) : null}
          {!compact && data.companyAddress ? (
            <p style={{ overflowWrap: 'anywhere', color: '#000' }}>
              {data.companyAddress}
            </p>
          ) : null}
          {!compact && data.allergens && data.allergens.length > 0 ? (
            <p style={{ overflowWrap: 'anywhere', color: '#000' }}>
              <span className="font-bold">Contém: </span>
              {formatAllergenList(data.allergens)}
            </p>
          ) : null}
          {data.printId ? (
            <p className="font-bold" style={{ color: '#000' }}>
              #{data.printId}
            </p>
          ) : null}
        </div>
        {showQr && data.qrUrl ? (
          <div
            className="shrink-0"
            style={{ width: `${qrSizeMm}mm`, height: `${qrSizeMm}mm` }}
          >
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
