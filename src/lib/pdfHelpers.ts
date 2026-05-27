import { jsPDF } from 'jspdf';
import { supabase } from './supabase';

const PRODUCT_NAME = 'ProActive7';
const PRODUCT_TAGLINE = 'Consultoria Nutricional';

export interface PdfHeaderInfo {
  companyName: string;
  companyCnpj?: string | null;
  companyAddress?: string | null;
  companyPhone?: string | null;
  companyLogoDataUrl?: string | null;
  rtName?: string | null;
  rtCrn?: string | null;
  rtEmail?: string | null;
  rtPhone?: string | null;
}

export function drawPdfHeader(doc: jsPDF, info: PdfHeaderInfo): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 12;

  if (info.companyLogoDataUrl) {
    try {
      doc.addImage(info.companyLogoDataUrl, 'PNG', 14, y, 18, 18);
    } catch {
      // ignore image errors
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(info.companyName, 36, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const lines: string[] = [];
  if (info.companyCnpj) lines.push(`CNPJ: ${info.companyCnpj}`);
  if (info.companyAddress) lines.push(info.companyAddress);
  if (info.companyPhone) lines.push(`Tel: ${info.companyPhone}`);
  lines.forEach((line, i) => doc.text(line, 36, y + 12 + i * 4));

  // RT info no canto direito
  if (info.rtName) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Responsavel Tecnico', pageWidth - 14, y + 6, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(info.rtName, pageWidth - 14, y + 11, { align: 'right' });
    if (info.rtCrn)
      doc.text(`CRN ${info.rtCrn}`, pageWidth - 14, y + 15, { align: 'right' });
    if (info.rtEmail)
      doc.text(info.rtEmail, pageWidth - 14, y + 19, { align: 'right' });
  }

  y = 34;
  doc.setDrawColor(180);
  doc.line(14, y, pageWidth - 14, y);
  return y + 4;
}

/**
 * Desenha o rodape de marca em TODAS as paginas do documento.
 * Deve ser chamado depois de toda a renderizacao (autoTable etc).
 */
export function drawPdfFooter(doc: jsPDF): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageCount = doc.getNumberOfPages();
  const generatedAt = new Date().toLocaleDateString('pt-BR');

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(120);
    doc.setDrawColor(220);
    doc.line(14, pageHeight - 10, pageWidth - 14, pageHeight - 10);
    doc.text(`${PRODUCT_NAME} — ${PRODUCT_TAGLINE}`, 14, pageHeight - 6);
    doc.text(`Pagina ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 6, {
      align: 'center',
    });
    doc.text(generatedAt, pageWidth - 14, pageHeight - 6, { align: 'right' });
    doc.setTextColor(0);
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Carrega uma imagem remota (URL publica) como DataURL para inserir no PDF. */
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

/**
 * Baixa um objeto de bucket privado do Supabase Storage (auth session)
 * e converte para DataURL. Use para buckets privados como `signatures`
 * ou `employee-docs` — `urlToDataUrl(getPublicUrl(...))` falha com 403.
 */
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

/** Quebra markdown simples em linhas para `doc.text`. Ignora `**` e `#`. */
export function plainTextFromMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/^---$/gm, '');
}
