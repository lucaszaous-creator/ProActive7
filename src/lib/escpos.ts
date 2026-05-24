// ESC/POS — comandos para impressoras termicas (58/80mm). Implementacao
// minima para a etiqueta de validade. Todas as funcoes retornam Uint8Array,
// o que torna o modulo testavel sem hardware.

const ESC = 0x1b;
const GS = 0x1d;

function bytes(...values: number[]): Uint8Array {
  return new Uint8Array(values);
}

function concat(...chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

const enc = new TextEncoder();

export const escpos = {
  init: () => bytes(ESC, 0x40),
  feed: (lines = 1) => bytes(ESC, 0x64, Math.max(0, Math.min(255, lines))),
  cut: () => bytes(GS, 0x56, 0x00),

  /** 0 = esquerda, 1 = centro, 2 = direita. */
  align: (n: 0 | 1 | 2) => bytes(ESC, 0x61, n),

  bold: (on: boolean) => bytes(ESC, 0x45, on ? 1 : 0),

  /** w/h: 0..7. Cada incremento dobra a dimensao. */
  size: (w = 0, h = 0) => bytes(GS, 0x21, ((w & 0x07) << 4) | (h & 0x07)),

  text: (s: string) => enc.encode(s),

  line: (s: string) => concat(enc.encode(s), bytes(0x0a)),

  /** Imprime um QR code com os comandos GS ( k. mod=1..16 controla o tamanho do modulo. */
  qr: (data: string, mod = 6): Uint8Array => {
    const dataBytes = enc.encode(data);
    const pL = (dataBytes.length + 3) & 0xff;
    const pH = ((dataBytes.length + 3) >> 8) & 0xff;
    return concat(
      // selecionar modelo 2
      bytes(GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00),
      // tamanho do modulo
      bytes(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, mod),
      // correcao de erro M
      bytes(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 49),
      // armazenar dados
      bytes(GS, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30),
      dataBytes,
      // imprimir
      bytes(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30),
    );
  },
};

export interface EscPosLabelInput {
  companyName: string;
  productName: string;
  storageConditionLabel: string;
  displayQuantity?: string | null;
  manipulationText: string;
  expiryText: string;
  originalExpiryText?: string | null;
  responsibleName: string;
  batch?: string | null;
  supplier?: string | null;
  /** "Contem: X, Y" — ja formatado pelo chamador (usa allergens.ts). */
  allergensText?: string;
  companyAddress?: string | null;
  companyCnpj?: string | null;
  printId?: string | null;
  qrUrl?: string;
}

/**
 * Monta a sequencia ESC/POS completa de uma etiqueta. Layout
 * inspirado no padrao Suflex: nome do produto em destaque,
 * condicao + quantidade na 2a linha, bloco key/value e rodape
 * com empresa/CNPJ/QR.
 */
export function buildLabelEscPos(label: EscPosLabelInput): Uint8Array {
  const parts: Uint8Array[] = [
    escpos.init(),
    escpos.align(1),
    escpos.size(0, 0),
    escpos.line(label.companyName || ' '),
    escpos.feed(1),
    // Nome do produto em destaque
    escpos.size(1, 1),
    escpos.bold(true),
    escpos.line(label.productName),
    escpos.bold(false),
    escpos.size(0, 0),
    // Condicao + quantidade na mesma linha
    escpos.line(
      label.displayQuantity
        ? `${label.storageConditionLabel}  |  ${label.displayQuantity}`
        : label.storageConditionLabel,
    ),
    escpos.feed(1),
    escpos.align(0),
  ];

  if (label.originalExpiryText) {
    parts.push(escpos.line(`VALID. ORIGINAL: ${label.originalExpiryText}`));
  }
  parts.push(
    escpos.line(`MANIPULACAO: ${label.manipulationText}`),
    escpos.bold(true),
    escpos.line(`VALIDADE: ${label.expiryText}`),
    escpos.bold(false),
  );
  if (label.supplier) {
    parts.push(escpos.line(`FORNECEDOR: ${label.supplier}`));
  }
  if (label.batch) {
    parts.push(escpos.line(`LOTE: ${label.batch}`));
  }
  parts.push(escpos.line(`RESP.: ${label.responsibleName || '-'}`));

  if (label.allergensText && label.allergensText.length > 0) {
    parts.push(escpos.line(`Contem: ${label.allergensText}`));
  }

  // Rodape: empresa + CNPJ + print ID
  parts.push(escpos.feed(1));
  if (label.companyAddress) {
    parts.push(escpos.line(label.companyAddress));
  }
  if (label.companyCnpj) {
    parts.push(escpos.line(`CNPJ ${label.companyCnpj}`));
  }
  if (label.printId) {
    parts.push(escpos.line(`#${label.printId}`));
  }

  if (label.qrUrl) {
    parts.push(escpos.feed(1), escpos.align(1), escpos.qr(label.qrUrl, 5));
  }

  parts.push(escpos.feed(3), escpos.cut());
  return concat(...parts);
}
