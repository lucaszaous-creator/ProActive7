import { jsPDF } from 'jspdf';

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

/** Carrega uma imagem remota como DataURL para inserir no PDF. */
export async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
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
