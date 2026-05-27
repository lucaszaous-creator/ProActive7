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
  fontSize: string;
  /** Linha obrigatória — renderiza com "—" mesmo quando value vier vazio. */
  required?: boolean;
}

// Garante contraste mínimo da cor primária da empresa contra fundo branco
// da etiqueta — caso a cor seja muito clara (ex: branco), cai pra preto
// para que VALIDADE não fique invisível.
function isReadableOnWhite(hex?: string): boolean {
  if (!hex) return false;
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return true;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum < 0.75;
}

function Row({ label, value, bold, fontSize, required }: RowProps) {
  if (!value && !required) return null;
  const display = value && value.length > 0 ? value : '—';
  return (
    <div
      className="flex justify-between gap-2"
      style={{ fontSize }}
    >
      <span className="shrink-0 font-bold">{label}</span>
      <span
        className={`min-w-0 flex-1 text-right ${bold ? 'font-bold' : ''}`}
        style={{
          overflowWrap: 'anywhere',
          wordBreak: 'break-word',
        }}
      >
        {display}
      </span>
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
  const qrSizeMm = Math.max(10, Math.min(14, Math.floor(widthMm * 0.2)));
  const rawAccent = data.primaryColor ?? undefined;
  const accent = isReadableOnWhite(rawAccent) ? rawAccent : undefined;

  // Tamanhos proporcionais ao tamanho da etiqueta — etiquetas pequenas
  // omitem campos secundarios automaticamente.
  const fsXs = `${Math.max(1.4, heightMm * 0.04).toFixed(2)}mm`;
  const fsSm = `${Math.max(1.6, heightMm * 0.045).toFixed(2)}mm`;
  const fsLg = `${Math.max(3.0, heightMm * 0.085).toFixed(2)}mm`;

  // Etiqueta pequena (≤40mm altura): suprime endereço, CNPJ e alergênicos.
  const compact = heightMm <= 40;

  return (
    <div
      style={{
        width: `${widthMm}mm`,
        height: `${heightMm}mm`,
        padding: '1.5mm',
        boxSizing: 'border-box',
        borderTop: accent ? `0.8mm solid ${accent}` : undefined,
      }}
      className="flex flex-col gap-[0.6mm] overflow-hidden border border-neutral-400 bg-white text-black"
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

      {/* Bloco de campos key/value + QR no lado direito */}
      <div className="flex flex-1 items-start gap-[1mm]">
        <div
          className="flex min-w-0 flex-1 flex-col"
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

      {/* Rodape full-width: alergenicos, endereco, CNPJ, printId */}
      {(!compact &&
        ((data.allergens && data.allergens.length > 0) ||
          data.companyAddress ||
          data.companyCnpj)) ||
      data.printId ? (
        <div style={{ fontSize: fsXs, lineHeight: 1.2 }}>
          {!compact && data.allergens && data.allergens.length > 0 ? (
            <p style={{ overflowWrap: 'anywhere' }}>
              <span className="font-bold">Contém: </span>
              {formatAllergenList(data.allergens)}
            </p>
          ) : null}
          {!compact && data.companyAddress ? (
            <p style={{ overflowWrap: 'anywhere' }}>{data.companyAddress}</p>
          ) : null}
          {!compact && data.companyCnpj ? (
            <p className="truncate">CNPJ: {data.companyCnpj}</p>
          ) : null}
          {data.printId ? (
            <p className="truncate font-bold">#{data.printId}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
