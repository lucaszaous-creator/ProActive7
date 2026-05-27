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

interface RowProps {
  label: string;
  value?: string | null;
  bold?: boolean;
  fontSize: string;
  required?: boolean;
}

function Row({ label, value, bold, fontSize, required }: RowProps) {
  if (!value && !required) return null;
  const display = value && value.length > 0 ? value : '—';
  return (
    <div
      className="flex justify-between gap-2"
      style={{ fontSize, color: '#000' }}
    >
      <span className="shrink-0 font-bold" style={{ color: '#000' }}>
        {label}
      </span>
      <span
        className={`min-w-0 flex-1 text-right ${bold ? 'font-bold' : ''}`}
        style={{
          overflowWrap: 'anywhere',
          wordBreak: 'break-word',
          color: '#000',
        }}
      >
        {display}
      </span>
    </div>
  );
}

export function LabelPreview({ data, widthMm, heightMm }: LabelPreviewProps) {
  const showQr = Boolean(data.qrUrl) && widthMm >= 50 && heightMm >= 30;
  const qrSizeMm = Math.max(10, Math.min(14, Math.floor(widthMm * 0.2)));

  const fsXs = `${Math.max(1.4, heightMm * 0.04).toFixed(2)}mm`;
  const fsSm = `${Math.max(1.6, heightMm * 0.045).toFixed(2)}mm`;
  const fsLg = `${Math.max(3.0, heightMm * 0.085).toFixed(2)}mm`;

  const compact = heightMm <= 40;

  return (
    <div
      style={{
        width: `${widthMm}mm`,
        height: `${heightMm}mm`,
        padding: '1.5mm',
        boxSizing: 'border-box',
        color: '#000',
        background: '#fff',
      }}
      className="flex flex-col gap-[0.6mm] overflow-hidden border border-neutral-400"
    >
      {data.companyLogoUrl || data.companyName ? (
        <div
          className="flex flex-col items-center justify-center gap-[0.5mm]"
          style={{ fontSize: fsXs, color: '#000' }}
        >
          {data.companyLogoUrl ? (
            <img
              src={data.companyLogoUrl}
              alt=""
              style={{
                height: `${Math.max(4, Math.min(10, heightMm * 0.15)).toFixed(2)}mm`,
                maxWidth: '80%',
                objectFit: 'contain',
              }}
            />
          ) : null}
          {data.companyName ? (
            <p
              className="truncate uppercase tracking-wide"
              style={{ maxWidth: '95%', color: '#000' }}
            >
              {data.companyName}
            </p>
          ) : null}
        </div>
      ) : null}

      <p
        className="text-center font-bold uppercase leading-tight"
        style={{ fontSize: fsLg, lineHeight: 1.05, color: '#000' }}
      >
        {data.productName || '—'}
      </p>

      <div
        className="flex items-center justify-between gap-2 border-y border-neutral-300"
        style={{
          fontSize: fsSm,
          paddingTop: '0.5mm',
          paddingBottom: '0.5mm',
          color: '#000',
        }}
      >
        <span className="font-bold uppercase" style={{ color: '#000' }}>
          {data.storageConditionLabel}
        </span>
        {data.displayQuantity ? (
          <span className="font-bold" style={{ color: '#000' }}>
            {data.displayQuantity}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 items-start gap-[1mm]">
        <div
          className="flex min-w-0 flex-1 flex-col"
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
            required
          />
          <Row
            label="VALIDADE:"
            value={data.expiryText}
            bold
            fontSize={fsSm}
            required
          />
          {data.supplier ? (
            <Row label="FORNECEDOR:" value={data.supplier} fontSize={fsSm} />
          ) : null}
          {data.batch ? (
            <Row label="LOTE:" value={data.batch} fontSize={fsSm} />
          ) : null}
          <Row
            label="RESP.:"
            value={data.responsibleName || '—'}
            fontSize={fsSm}
          />
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

      {(!compact &&
        ((data.allergens && data.allergens.length > 0) ||
          data.companyAddress ||
          data.companyCnpj)) ||
      data.printId ? (
        <div style={{ fontSize: fsXs, lineHeight: 1.2, color: '#000' }}>
          {!compact && data.allergens && data.allergens.length > 0 ? (
            <p style={{ overflowWrap: 'anywhere', color: '#000' }}>
              <span className="font-bold">Contém: </span>
              {formatAllergenList(data.allergens)}
            </p>
          ) : null}
          {!compact && data.companyAddress ? (
            <p style={{ overflowWrap: 'anywhere', color: '#000' }}>
              {data.companyAddress}
            </p>
          ) : null}
          {!compact && data.companyCnpj ? (
            <p className="truncate" style={{ color: '#000' }}>
              CNPJ: {data.companyCnpj}
            </p>
          ) : null}
          {data.printId ? (
            <p className="truncate font-bold" style={{ color: '#000' }}>
              #{data.printId}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
