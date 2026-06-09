import { jsPDF } from 'jspdf';
import { supabase } from './supabase';
import { BRAND, PRINT_RGB, scoreTier, tierLabel, tierRgb } from './printTheme';
import { PDF_BRAND_LOGO } from './pdfBrandLogo';

const M = 14; // margem lateral (mm)

export interface PdfHeaderInfo {
  documentTitle: string; // ex: "Relatório de Visita Técnica"
  companyName: string;
  companyCnpj?: string | null;
  companyAddress?: string | null;
  companyPhone?: string | null;
  companyLogoDataUrl?: string | null;
  rtName?: string | null;
  rtCrn?: string | null;
  rtEmail?: string | null;
  rtPhone?: string | null;
  documentId?: string | null; // rastreabilidade (ex: id curto da visita)
}

/**
 * Cabeçalho premium: faixa emerald no topo com marca + título do documento
 * à esquerda e responsável técnico à direita; abaixo, bloco da empresa.
 * Retorna o Y onde o conteúdo deve começar.
 */
export function drawPdfHeader(doc: jsPDF, info: PdfHeaderInfo): number {
  const pw = doc.internal.pageSize.getWidth();
  const bandH = 30;

  // Faixa da marca
  doc.setFillColor(...PRINT_RGB.brandDeep);
  doc.rect(0, 0, pw, bandH, 'F');
  // Acento de conformidade na base da faixa (verde do semáforo)
  doc.setFillColor(...PRINT_RGB.green);
  doc.rect(0, bandH - 1.2, pw, 1.2, 'F');

  // Marca — logo gráfica (wordmark + tagline) em branco, encaixada à
  // esquerda da faixa preservando a proporção (~2.15:1).
  try {
    const logoH = 14;
    const logoW = logoH * 2.286; // proporção 320:140
    doc.addImage(PDF_BRAND_LOGO, 'PNG', M, 5, logoW, logoH);
  } catch {
    // Fallback: texto, caso a imagem falhe.
    doc.setTextColor(...PRINT_RGB.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(BRAND.name, M, 13);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...PRINT_RGB.faint);
    doc.text(BRAND.tagline.toUpperCase(), M, 18);
  }

  // Título do documento (na faixa, à esquerda, abaixo da marca)
  doc.setTextColor(...PRINT_RGB.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(info.documentTitle, M, 26);

  // RT à direita (dentro da faixa)
  if (info.rtName) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(180, 220, 205);
    doc.text('RESPONSÁVEL TÉCNICO', pw - M, 11, { align: 'right' });
    doc.setTextColor(...PRINT_RGB.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(info.rtName, pw - M, 16, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(200, 230, 218);
    const rtSub = [info.rtCrn ? `CRN ${info.rtCrn}` : '', info.rtEmail ?? '']
      .filter(Boolean)
      .join('  ·  ');
    if (rtSub) doc.text(rtSub, pw - M, 20.5, { align: 'right' });
  }

  // Bloco da empresa (abaixo da faixa)
  let y = bandH + 7;
  if (info.companyLogoDataUrl) {
    try {
      // Encaixa o logo num quadrado de 14mm preservando a proporção
      // (sem distorcer) e detecta o formato real (PNG/JPEG/etc.).
      const box = 14;
      const props = doc.getImageProperties(info.companyLogoDataUrl);
      const ratio = props.width / props.height || 1;
      let w = box;
      let h = box;
      if (ratio > 1) h = box / ratio;
      else w = box * ratio;
      const ox = M + (box - w) / 2;
      const oy = y - 1 + (box - h) / 2;
      doc.addImage(
        info.companyLogoDataUrl,
        props.fileType || 'PNG',
        ox,
        oy,
        w,
        h,
      );
    } catch {
      /* ignore */
    }
  }
  const tx = info.companyLogoDataUrl ? M + 18 : M;
  doc.setTextColor(...PRINT_RGB.ink);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.text(info.companyName || '—', tx, y + 3);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...PRINT_RGB.muted);
  const meta = [
    info.companyCnpj ? `CNPJ ${info.companyCnpj}` : '',
    info.companyAddress ?? '',
    info.companyPhone ? `Tel ${info.companyPhone}` : '',
  ].filter(Boolean);
  if (meta.length) doc.text(meta.join('   ·   '), tx, y + 8);

  // Emissão / id no canto direito do bloco
  doc.setFontSize(7.5);
  doc.setTextColor(...PRINT_RGB.faint);
  const emitted = `Emitido em ${new Date().toLocaleString('pt-BR')}`;
  doc.text(emitted, pw - M, y + 3, { align: 'right' });
  if (info.documentId) {
    doc.text(`Doc #${info.documentId}`, pw - M, y + 7.5, { align: 'right' });
  }

  y += 14;
  doc.setDrawColor(...PRINT_RGB.hair);
  doc.setLineWidth(0.3);
  doc.line(M, y, pw - M, y);
  doc.setTextColor(...PRINT_RGB.ink);
  return y + 7;
}

/** Título de seção: rótulo em caixa-alta emerald + filete. */
export function drawSectionTitle(doc: jsPDF, text: string, y: number): number {
  const pw = doc.internal.pageSize.getWidth();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...PRINT_RGB.brandDark);
  doc.text(text.toUpperCase(), M, y);
  doc.setDrawColor(...PRINT_RGB.hair);
  doc.setLineWidth(0.3);
  doc.line(M, y + 2, pw - M, y + 2);
  doc.setTextColor(...PRINT_RGB.ink);
  return y + 8;
}

/**
 * Hero de score: bloco arredondado colorido por tier, número grande à
 * esquerda e selo do tier. Desenha em (M, y) ocupando a largura útil.
 */
export function drawScoreHero(
  doc: jsPDF,
  score: number | null,
  y: number,
): number {
  const pw = doc.internal.pageSize.getWidth();
  const w = pw - M * 2;
  const h = 22;
  const tier = scoreTier(score);
  const c = tierRgb(tier);

  // Card suave
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(...PRINT_RGB.hair);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, y, w, h, 2.5, 2.5, 'FD');

  // Faixa colorida à esquerda
  doc.setFillColor(...c);
  doc.roundedRect(M, y, 3, h, 1.5, 1.5, 'F');
  doc.rect(M + 1.5, y, 1.5, h, 'F');

  // Número
  doc.setTextColor(...c);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.text(score == null ? '—' : String(Math.round(score)), M + 9, y + 15);
  doc.setFontSize(9);
  doc.setTextColor(...PRINT_RGB.muted);
  doc.text('/100', M + 9 + (score == null ? 8 : 18), y + 15);

  // Rótulo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...PRINT_RGB.muted);
  doc.text('SCORE DE CONFORMIDADE', M + 9, y + 6);

  // Selo do tier à direita
  const badge = tierLabel(tier);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const bw = doc.getTextWidth(badge) + 10;
  doc.setFillColor(...c);
  doc.roundedRect(pw - M - bw - 6, y + h / 2 - 4.5, bw, 9, 4.5, 4.5, 'F');
  doc.setTextColor(...PRINT_RGB.white);
  doc.text(badge, pw - M - bw - 6 + bw / 2, y + h / 2 + 0.8, {
    align: 'center',
  });

  doc.setTextColor(...PRINT_RGB.ink);
  return y + h + 8;
}

/** Linha de mini-cards de indicadores (label em cima, valor grande). */
export function drawKpiRow(
  doc: jsPDF,
  items: {
    label: string;
    value: string;
    tone?: 'green' | 'amber' | 'red' | 'ink';
  }[],
  y: number,
): number {
  const pw = doc.internal.pageSize.getWidth();
  const gap = 4;
  const w = (pw - M * 2 - gap * (items.length - 1)) / items.length;
  const h = 16;
  // Cor forte (texto/acento) e suave (fundo) por tom.
  const STRONG: Record<string, readonly [number, number, number]> = {
    green: PRINT_RGB.green,
    amber: PRINT_RGB.amber,
    red: PRINT_RGB.red,
    ink: PRINT_RGB.ink,
  };
  const SOFT: Record<string, readonly [number, number, number]> = {
    green: [220, 252, 231], // verde-100
    amber: [254, 243, 199], // âmbar-100
    red: [254, 226, 226], // vermelho-100
    ink: [245, 245, 245], // neutro-100
  };
  items.forEach((it, i) => {
    const x = M + i * (w + gap);
    const key = it.tone ?? 'ink';
    const strong = STRONG[key];
    const soft = SOFT[key];
    // Fundo tonal suave + contorno
    doc.setFillColor(soft[0], soft[1], soft[2]);
    doc.setDrawColor(...PRINT_RGB.hair);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, w, h, 2, 2, 'FD');
    // Barra-acento colorida à esquerda
    doc.setFillColor(strong[0], strong[1], strong[2]);
    doc.roundedRect(x, y, 1.6, h, 0.8, 0.8, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(...PRINT_RGB.muted);
    doc.text(it.label.toUpperCase(), x + 4.5, y + 5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(strong[0], strong[1], strong[2]);
    doc.text(it.value, x + 4.5, y + 12.5);
  });
  doc.setTextColor(...PRINT_RGB.ink);
  return y + h + 8;
}

/** Rodapé de marca em todas as páginas. */
export function drawPdfFooter(doc: jsPDF): void {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...PRINT_RGB.hair);
    doc.setLineWidth(0.3);
    doc.line(M, ph - 10, pw - M, ph - 10);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...PRINT_RGB.brandDark);
    doc.text(BRAND.name, M, ph - 6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...PRINT_RGB.faint);
    doc.text(BRAND.tagline, M + doc.getTextWidth(BRAND.name) + 3, ph - 6);
    doc.text(`Página ${i} de ${pages}`, pw - M, ph - 6, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  }
}

/** Para o tier de score usado no PDF (reexport p/ conveniência). */
export { scoreTier as pdfScoreTier };

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Carrega uma imagem remota (URL publica) como DataURL para o PDF. */
export async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    return await blobToDataUrl(blob);
  } catch {
    return null;
  }
}

/** Baixa objeto de bucket privado (auth) e converte para DataURL. */
export async function storageObjectToDataUrl(
  bucket: string,
  path: string,
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error || !data) return null;
    return await blobToDataUrl(data);
  } catch {
    return null;
  }
}

/** Quebra markdown simples em texto plano para `doc.text`. */
export function plainTextFromMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/^---$/gm, '');
}
