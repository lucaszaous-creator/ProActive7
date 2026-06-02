// Gera ZPL II para impressoras térmicas (Elgin L42PRO, Zebra e compatíveis).
// Espelha a diagramação da LabelPreview (estilo Suflex): nome do produto,
// linha separadora, condição, MANIPULAÇÃO/VALIDADE, rodapé com responsável
// e empresa, QR no canto inferior direito.
//
// Unidade interna: dots. 203 dpi = 8 dots/mm (padrão da maioria das
// térmicas de etiqueta). Para 300 dpi passe dpi=300.
import type { LabelData } from '@/components/LabelPreview';

export interface ZplOptions {
  widthMm: number;
  heightMm: number;
  dpi?: number; // default 203
  copies?: number; // default 1
}

/** Remove caracteres de controle do ZPL (^ ~ \) para não quebrar o comando. */
function sanitize(text: string | null | undefined): string {
  if (!text) return '';
  return text.replace(/[\^~\\]/g, ' ').trim();
}

export function buildLabelZpl(data: LabelData, opts: ZplOptions): string {
  const dpi = opts.dpi ?? 203;
  const copies = Math.max(1, opts.copies ?? 1);
  const mm = (n: number) => Math.round((n * dpi) / 25.4);

  const W = mm(opts.widthMm);
  const H = mm(opts.heightMm);
  const margin = mm(2);
  const contentW = W - margin * 2;

  // Escalas de fonte proporcionais à altura (em dots).
  const fLg = Math.max(mm(3.0), Math.round(H * 0.085));
  const fMd = Math.max(mm(2.2), Math.round(H * 0.055));
  const fSm = Math.max(mm(1.8), Math.round(H * 0.045));

  const compact = opts.heightMm <= 40;
  const lines: string[] = [];
  lines.push('^XA');
  lines.push('^CI28'); // UTF-8 (acentos)
  lines.push(`^PW${W}`);
  lines.push(`^LL${H}`);
  lines.push('^LH0,0');

  let y = margin;

  // Nome do produto (negrito, caixa alta, com quebra de linha)
  const name = sanitize(data.productName).toUpperCase() || '-';
  lines.push(
    `^FO${margin},${y}^A0N,${fLg},${fLg}^FB${contentW},2,0,L,0^FD${name}^FS`,
  );
  y += fLg * 2 + mm(1);

  // Linha separadora
  lines.push(`^FO${margin},${y}^GB${contentW},${mm(0.4)},${mm(0.4)}^FS`);
  y += mm(1.5);

  // Condição de armazenamento (+ quantidade)
  const cond =
    sanitize(data.storageConditionLabel).toUpperCase() +
    (data.displayQuantity ? `  -  ${sanitize(data.displayQuantity)}` : '');
  lines.push(`^FO${margin},${y}^A0N,${fSm},${fSm}^FD${cond}^FS`);
  y += fSm + mm(1.5);

  // MANIPULAÇÃO / VALIDADE — label esquerda, data colada na sequência
  if (!compact && data.originalExpiryText) {
    lines.push(
      `^FO${margin},${y}^A0N,${fSm},${fSm}^FDVALID. ORIGINAL: ${sanitize(data.originalExpiryText)}^FS`,
    );
    y += fSm + mm(0.8);
  }
  lines.push(
    `^FO${margin},${y}^A0N,${fSm},${fSm}^FDMANIPULACAO: ${sanitize(data.manipulationText)}^FS`,
  );
  y += fSm + mm(0.8);
  lines.push(
    `^FO${margin},${y}^A0N,${fMd},${fMd}^FDVALIDADE: ${sanitize(data.expiryText)}^FS`,
  );
  y += fMd + mm(1);

  // QR no canto inferior direito (quando há espaço e url)
  let footerRight = W - margin;
  if (data.qrUrl && opts.widthMm >= 50 && opts.heightMm >= 30) {
    const mag = opts.heightMm >= 60 ? 5 : 4;
    const qrSide = mag * 22; // aproximação do lado do QR em dots
    const qx = W - margin - qrSide;
    const qy = H - margin - qrSide;
    lines.push(`^FO${qx},${qy}^BQN,2,${mag}^FDLA,${sanitize(data.qrUrl)}^FS`);
    footerRight = qx - mm(1.5);
  }

  // Rodapé: responsável, fornecedor/lote, empresa, CNPJ, endereço, printId
  const footerW = footerRight - margin;
  const footer: string[] = [];
  footer.push(`RESP.: ${sanitize(data.responsibleName) || '-'}`);
  if (data.supplier) footer.push(`FORN.: ${sanitize(data.supplier)}`);
  if (data.batch) footer.push(`LOTE: ${sanitize(data.batch)}`);
  if (data.companyName) footer.push(sanitize(data.companyName).toUpperCase());
  if (!compact && data.companyCnpj)
    footer.push(`CNPJ: ${sanitize(data.companyCnpj)}`);
  if (!compact && data.companyAddress)
    footer.push(sanitize(data.companyAddress));
  if (data.printId) footer.push(`#${sanitize(data.printId)}`);

  // Desenha o rodapé de baixo pra cima a partir da base
  let fy = H - margin - fSm;
  for (let i = footer.length - 1; i >= 0 && fy > y; i--) {
    lines.push(
      `^FO${margin},${fy}^A0N,${fSm},${fSm}^FB${footerW},1,0,L,0^FD${footer[i]}^FS`,
    );
    fy -= fSm + mm(0.5);
  }

  lines.push(`^PQ${copies}`);
  lines.push('^XZ');
  return lines.join('\n');
}
