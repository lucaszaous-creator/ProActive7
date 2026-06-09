import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  drawPdfHeader,
  drawScoreHero,
  drawKpiRow,
  drawSectionTitle,
  drawPdfFooter,
  storageObjectToDataUrl,
} from './pdfHelpers';
import { PRINT_RGB } from './printTheme';
import { calculateComplianceScore } from './complianceScore';
import { supabase } from './supabase';
import type { EnrichedCompany } from './dashboardQueries';

export interface ReportRtInfo {
  name?: string | null;
  crn?: string | null;
  email?: string | null;
  phone?: string | null;
}

const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

function fmtRel(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('pt-BR');
  } catch {
    return '—';
  }
}

// Lista de pendências derivadas da linha de conformidade — a base do parecer
// que a nutri (RT) assina. Transparente: mostra o que está pendente, sem
// inventar nada positivo (princípio §3 do CLAUDE.md).
function buildFindings(c: EnrichedCompany): string[] {
  const out: string[] = [];
  if (c.nc_overdue_30d > 0)
    out.push(
      `${c.nc_overdue_30d} não-conformidade(s) vencida(s) sem tratamento.`,
    );
  if (c.docs_published < 6)
    out.push(
      `Faltam ${6 - c.docs_published} documento(s) obrigatório(s) (MBP + 5 POPs).`,
    );
  const asoPend = c.manipulators_aso_expired + c.manipulators_aso_missing;
  if (asoPend > 0)
    out.push(`${asoPend} manipulador(es) com ASO vencido ou ausente.`);
  if (!c.has_audit_last_90d)
    out.push('Sem visita técnica registrada nos últimos 90 dias.');
  if (c.temp_readings_7d > 0 && c.temp_out_of_range_7d > 0)
    out.push(
      `${c.temp_out_of_range_7d} leitura(s) de temperatura fora da faixa nos últimos 7 dias.`,
    );
  if (c.has_pest_service_registered && !c.has_pest_service_active)
    out.push('Contrato de controle de pragas (CIP) vencido.');
  if (c.checklists_planned_30d > 0 && c.checklists_ran_30d === 0)
    out.push('Nenhum checklist executado no período.');
  if (out.length === 0)
    out.push('Nenhuma pendência crítica identificada no período.');
  return out;
}

// Gera o relatório de conformidade (PDF) de uma empresa, no estilo do
// design system de impressão. Busca CNPJ/endereço da empresa para o cabeçalho.
export async function generateComplianceReportPdf(
  company: EnrichedCompany,
  rt: ReportRtInfo,
): Promise<void> {
  const breakdown = calculateComplianceScore({
    ncTotal30d: company.nc_total_30d,
    ncOverdue30d: company.nc_overdue_30d,
    checklistsPlanned30d: company.checklists_planned_30d,
    checklistsRan30d: company.checklists_ran_30d,
    hasAuditLast90d: company.has_audit_last_90d,
    tempReadings7d: company.temp_readings_7d,
    tempOutOfRange7d: company.temp_out_of_range_7d,
    publishedDocs: company.docs_published,
    manipulatorsActive: company.manipulators_active,
    manipulatorsAsoOk: company.manipulators_aso_ok,
    hasPestServiceActive: company.has_pest_service_active,
    hasPestServiceRegistered: company.has_pest_service_registered,
  });

  // Metadados da empresa para o cabeçalho (CNPJ/endereço/telefone).
  const { data: meta } = await supabase
    .from('companies')
    .select('cnpj, address, phone')
    .eq('id', company.company_id)
    .maybeSingle();

  const now = new Date();
  const monthLabel = `${MONTHS[now.getMonth()]} de ${now.getFullYear()}`;

  // Logo da empresa (bucket branding) para o cabeçalho — opcional.
  const companyLogoDataUrl = company.company_logo_path
    ? await storageObjectToDataUrl('branding', company.company_logo_path)
    : null;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  let y = drawPdfHeader(doc, {
    documentTitle: `Relatório de Conformidade — ${monthLabel}`,
    companyName: company.company_name,
    companyLogoDataUrl,
    companyCnpj: (meta as { cnpj?: string } | null)?.cnpj ?? null,
    companyAddress: (meta as { address?: string } | null)?.address ?? null,
    companyPhone: (meta as { phone?: string } | null)?.phone ?? null,
    rtName: rt.name,
    rtCrn: rt.crn,
    rtEmail: rt.email,
    rtPhone: rt.phone,
    documentId: company.company_id.slice(0, 8).toUpperCase(),
  });

  y = drawScoreHero(doc, company.score, y);

  y = drawKpiRow(
    doc,
    [
      {
        label: 'NCs abertas',
        value: String(company.nc_open_now),
        tone: company.nc_open_now > 0 ? 'amber' : 'green',
      },
      {
        label: 'NCs vencidas',
        value: String(company.nc_overdue_30d),
        tone: company.nc_overdue_30d > 0 ? 'red' : 'green',
      },
      {
        label: 'Checklists (30d)',
        value: `${company.checklists_ran_30d}/${company.checklists_planned_30d}`,
        tone: 'ink',
      },
      {
        label: 'Temp. fora (7d)',
        value: `${company.temp_out_of_range_7d}/${company.temp_readings_7d}`,
        tone: company.temp_out_of_range_7d > 0 ? 'amber' : 'green',
      },
    ],
    y,
  );

  y = drawKpiRow(
    doc,
    [
      {
        label: 'ASO em dia',
        value: `${company.manipulators_aso_ok}/${company.manipulators_active}`,
        tone:
          company.manipulators_aso_expired + company.manipulators_aso_missing >
          0
            ? 'red'
            : 'green',
      },
      {
        label: 'Documentos',
        value: `${company.docs_published}/6`,
        tone: company.docs_published >= 6 ? 'green' : 'amber',
      },
      {
        label: 'Última visita',
        value: fmtRel(company.last_audit_at),
        tone: company.has_audit_last_90d ? 'ink' : 'red',
      },
      {
        label: 'Controle de pragas',
        value: company.has_pest_service_active
          ? 'Em dia'
          : company.has_pest_service_registered
            ? 'Vencido'
            : 'N/C',
        tone: company.has_pest_service_active
          ? 'green'
          : company.has_pest_service_registered
            ? 'red'
            : 'ink',
      },
    ],
    y,
  );

  // Detalhamento do score
  y = drawSectionTitle(doc, 'Detalhamento do score', y);
  if (breakdown) {
    autoTable(doc, {
      startY: y,
      theme: 'grid',
      headStyles: { fillColor: [...PRINT_RGB.brandDark], fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [...PRINT_RGB.ink] },
      head: [['Critério', 'Pontos', 'Máximo']],
      body: [
        ['Não-conformidades', breakdown.ncPart.toFixed(1), '25'],
        ['Checklists', breakdown.checklistPart.toFixed(1), '20'],
        ['Visita técnica (90d)', breakdown.auditPart.toFixed(1), '20'],
        ['Temperatura', breakdown.tempPart.toFixed(1), '10'],
        ['Documentos obrigatórios', breakdown.docsPart.toFixed(1), '10'],
        ['ASO dos manipuladores', breakdown.manipulatorsPart.toFixed(1), '10'],
        ['Controle de pragas', breakdown.pestPart.toFixed(1), '5'],
        ['Total', breakdown.total.toFixed(0), '100'],
      ],
      margin: { left: 14, right: 14 },
    });
    // @ts-expect-error lastAutoTable é injetado pelo jspdf-autotable
    y = (doc.lastAutoTable?.finalY ?? y) + 8;
  } else {
    doc.setFontSize(9);
    doc.setTextColor(...PRINT_RGB.muted);
    doc.text(
      'Sem dados suficientes para calcular o score neste período.',
      14,
      y + 4,
    );
    y += 12;
  }

  // Pendências e recomendações
  y = drawSectionTitle(doc, 'Pendências e recomendações', y);
  doc.setFontSize(9);
  doc.setTextColor(...PRINT_RGB.ink);
  for (const f of buildFindings(company)) {
    doc.text(`•  ${f}`, 16, y);
    y += 6;
  }
  y += 6;

  // Parecer + assinatura da RT
  if (y > 235) {
    doc.addPage();
    y = 20;
  }
  y = drawSectionTitle(doc, 'Parecer e assinatura do Responsável Técnico', y);
  doc.setDrawColor(...PRINT_RGB.hair);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, y, doc.internal.pageSize.getWidth() - 28, 24, 2, 2, 'S');
  y += 34;
  doc.setDrawColor(...PRINT_RGB.ink);
  doc.line(20, y, 110, y);
  doc.setFontSize(8);
  doc.setTextColor(...PRINT_RGB.muted);
  doc.text(
    `${rt.name ?? 'Responsável Técnico'}${rt.crn ? ` — CRN ${rt.crn}` : ''}`,
    20,
    y + 5,
  );

  drawPdfFooter(doc);

  const safeName = company.company_name
    .normalize('NFD')
    .replace(/[^\w]+/g, '_')
    .slice(0, 40);
  doc.save(
    `conformidade_${safeName}_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.pdf`,
  );
}
