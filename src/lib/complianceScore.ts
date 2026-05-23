/**
 * Score de compliance por empresa (0-100).
 *
 *   35 * (1 - overdue_nc_ratio_30d)         // NCs fechadas/abertas no prazo
 * + 25 * (checklists_executados_30d / planejados_30d)
 * + 20 * (1 se houve visita <= 90d, senao 0)
 * + 10 * (1 - temp_out_of_range_ratio_7d)
 * + 10 * (1 se MBP + 5 POPs publicados, senao 0)
 *
 * Inputs sao numeros agregados que vem do backend (view
 * `company_compliance_v`). Retorna 0-100 ou null (empresa sem
 * dados suficientes).
 */
export interface ComplianceInputs {
  ncTotal30d: number;
  ncOverdue30d: number;
  checklistsPlanned30d: number;
  checklistsRan30d: number;
  hasAuditLast90d: boolean;
  tempReadings7d: number;
  tempOutOfRange7d: number;
  publishedDocs: number; // 0..6 (mbp + 5 pops)
}

export interface ComplianceBreakdown {
  ncPart: number;
  checklistPart: number;
  auditPart: number;
  tempPart: number;
  docsPart: number;
  total: number;
}

export function calculateComplianceScore(
  i: ComplianceInputs,
): ComplianceBreakdown | null {
  // Sem nenhum dado relevante -> nao calcula
  const hasAnyData =
    i.ncTotal30d > 0 ||
    i.checklistsPlanned30d > 0 ||
    i.hasAuditLast90d ||
    i.tempReadings7d > 0 ||
    i.publishedDocs > 0;
  if (!hasAnyData) return null;

  const overdueRatio =
    i.ncTotal30d > 0 ? i.ncOverdue30d / i.ncTotal30d : 0;
  const ncPart = 35 * (1 - overdueRatio);

  const checklistRatio =
    i.checklistsPlanned30d > 0
      ? Math.min(1, i.checklistsRan30d / i.checklistsPlanned30d)
      : 1; // sem plano = neutro positivo
  const checklistPart = 25 * checklistRatio;

  const auditPart = i.hasAuditLast90d ? 20 : 0;

  const tempRatio =
    i.tempReadings7d > 0 ? i.tempOutOfRange7d / i.tempReadings7d : 0;
  const tempPart = 10 * (1 - tempRatio);

  const docsPart = i.publishedDocs >= 6 ? 10 : 0;

  const total =
    Math.round((ncPart + checklistPart + auditPart + tempPart + docsPart) *
      100) / 100;
  return {
    ncPart: Math.round(ncPart * 100) / 100,
    checklistPart: Math.round(checklistPart * 100) / 100,
    auditPart,
    tempPart: Math.round(tempPart * 100) / 100,
    docsPart,
    total,
  };
}

export type ScoreTier = 'green' | 'amber' | 'red';

export function scoreTier(total: number | null): ScoreTier | null {
  if (total == null) return null;
  if (total >= 85) return 'green';
  if (total >= 70) return 'amber';
  return 'red';
}
