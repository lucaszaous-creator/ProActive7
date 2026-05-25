import { QRCodeSVG } from 'qrcode.react';
import { formatAllergenList } from '@/lib/allergens';

export interface LabelData {
  companyName: string;
  companyLogoUrl?: string | null;
  companyCnpj?: string | null;
  companyAddress?: string | null;
  /** Hex (#rrggbb). Tinge linha de acento e VALIDADE. */
  primaryColor?: string | null;
  productName: string;
  storageConditionLabel: string;
  /** Quantidade / peso impressa em destaque (ex: "500 g", "2 L"). */
  displayQuantity?: string | null;
  /** Validade original do fabricante (opcional). */
  originalExpiryText?: string | null;
  manipulationText: string;
  expiryText: string;
  responsibleName: string;
  /** Lote do produto / numero da nota (opcional). */
  batch?: string | null;
  /** Marca / fornecedor (opcional). */
  supplier?: string | null;
  /** Chaves de alergenicos para imprimir "Contém: X, Y" quando presente. */
  allergens?: string[];
  /** Id curto da impressao (ex: "T154B3"). */
  printId?: string | null;
  /** URL codificada no QR. Quando ausente, oculta o QR. */
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
  accent?: string | undefined;
  fontSize: string;
}

function Row({ label, value, bold, accent, fontSize }: RowProps) {
  if (!value) return null;
  return (
    <div
      className="flex justify-between gap-2"
      style={{ fontSize, color: bold ? accent : undefined }}
    >
      <span className={bold ? 'font-bold' : 'font-bold'}>{label}</span>
      <span className={bold ? 'font-bold' : ''}>{value}</span>
    </div>
  );
}

/**
 * Etiqueta de validade — layout key/value inspirado no padrao
 * Suflex Restaurant: nome do produto em destaque, condicao + quantidade
 * na 2a linha, bloco de campos com label em negrito, rodape com
 * empresa + endereco + CNPJ e QR no canto inferior direito.
 */
export function LabelPreview({ data, widthMm, heightMm }: LabelPreviewProps) {
  const showQr = Boolean(data.qrUrl) && widthMm >= 50 && heightMm >= 30;
  const qrSizeMm = Math.min(14, Math.floor(widthMm * 0.22));
  const accent = data.primaryColor ?? undefined;

  // Tamanhos proporcionais ao tamanho da etiqueta — etiquetas pequenas
  // omitem campos secundarios automaticamente.
  const fsXs = `${Math.max(1.4, heightMm * 0.04).toFixed(2)}mm`;
  const fsSm = `${Math.max(1.6, heightMm * 0.045).toFixed(2)}mm`;
  const fsLg = `${Math.max(3.0, heightMm * 0.085).toFixed(2)}mm`;

  // Etiqueta pequena (<40mm altura): suprime campos extras.
  const compact = heightMm < 40;

  return (
    <div
      style={{
        width: `${widthMm}mm`,
        height: `${heightMm}mm`,
        padding: '2mm',
        boxSizing: 'border-box',
        borderTop: accent ? `0.8mm solid ${accent}` : undefined,
      }}
      className="flex flex-col gap-[1mm] overflow-hidden border border-neutral-400 bg-white text-black"
    >
      {/* Topo: logo (proeminente) + nome empresa */}
      {data.companyLogoUrl || data.companyName ? (
        <div
          className="flex flex-col items-center justify-center gap-[0.5mm]"
          style={{ fontSize: fsXs }}
        >
          {data.companyLogoUrl ? (
            <img
              src={data.companyLogoUrl}
              alt=""
              style={{
                // Escala o logo com a altura da etiqueta: 4mm em etiquetas
                // pequenas, ate 10mm nas grandes. Largura limitada para
                // logos retangulares nao "estourarem" o card.
                height: `${Math.max(4, Math.min(10, heightMm * 0.15)).toFixed(2)}mm`,
                maxWidth: '80%',
                objectFit: 'contain',
              }}
            />
          ) : null}
          {data.companyName ? (
            <p
              className="truncate uppercase tracking-wide"
              style={{ color: accent, maxWidth: '95%' }}
            >
              {data.companyName}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* Nome do produto centralizado */}
      <p
        className="text-center font-bold uppercase leading-tight"
        style={{ fontSize: fsLg, lineHeight: 1.05 }}
      >
        {data.productName || '—'}
      </p>

      {/* Condicao | Quantidade */}
      <div
        className="flex items-center justify-between gap-2 border-y border-neutral-300"
        style={{ fontSize: fsSm, paddingTop: '0.5mm', paddingBottom: '0.5mm' }}
      >
        <span className="font-bold uppercase">
          {data.storageConditionLabel}
        </span>
        {data.displayQuantity ? (
          <span className="font-bold">{data.displayQuantity}</span>
        ) : null}
      </div>

      {/* Bloco de campos key/value */}
      <div
        className="flex flex-1 flex-col"
        style={{ fontSize: fsSm, lineHeight: 1.2 }}
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
        <Row
          label="VALIDADE:"
          value={data.expiryText}
          bold
          accent={accent}
          fontSize={fsSm}
        />
        {!compact && data.supplier ? (
          <Row label="FORNECEDOR:" value={data.supplier} fontSize={fsSm} />
        ) : null}
        {!compact && data.batch ? (
          <Row label="LOTE:" value={data.batch} fontSize={fsSm} />
        ) : null}
        <Row
          label="RESP.:"
          value={data.responsibleName || '—'}
          fontSize={fsSm}
        />
        {!compact && data.allergens && data.allergens.length > 0 ? (
          <div
            className="mt-[0.5mm] truncate"
            style={{ fontSize: fsXs, lineHeight: 1.15 }}
          >
            <span className="font-bold">Contém: </span>
            {formatAllergenList(data.allergens)}
          </div>
        ) : null}
      </div>

      {/* Rodape: endereco da empresa + QR + print ID */}
      <div className="flex items-end justify-between gap-2">
        <div
          className="min-w-0 flex-1"
          style={{ fontSize: fsXs, lineHeight: 1.15 }}
        >
          {!compact && data.companyAddress ? (
            <p className="truncate">{data.companyAddress}</p>
          ) : null}
          {!compact && data.companyCnpj ? (
            <p className="truncate">CNPJ: {data.companyCnpj}</p>
          ) : null}
          {data.printId ? (
            <p className="truncate font-bold">#{data.printId}</p>
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
