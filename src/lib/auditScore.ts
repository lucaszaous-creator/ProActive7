import type { AuditItem, AuditResponse } from './types';

/**
 * Calcula o score de uma visita tecnica:
 * score = sum(weight * isC) / sum(weight * isNotNA) * 100
 *
 * - Itens "NA" sao ignorados no denominador.
 * - Itens sem resposta contam como NC (peso no denominador, zero no
 *   numerador) — incentiva preencher tudo.
 * - Score = null se todos os itens forem NA (divisao por zero).
 */
export function calculateAuditScore(
  items: AuditItem[],
  responses: AuditResponse[],
): number | null {
  const responseMap = new Map(responses.map((r) => [r.itemId, r]));
  let numerator = 0;
  let denominator = 0;
  for (const item of items) {
    const r = responseMap.get(item.id);
    if (r?.result === 'NA') continue;
    denominator += item.weight;
    if (r?.result === 'C') numerator += item.weight;
  }
  if (denominator === 0) return null;
  return Math.round((numerator / denominator) * 10000) / 100;
}

export interface CategoryScore {
  category: string;
  conformes: number;
  total: number;
  scorePercent: number;
}

export function scoresByCategory(
  items: AuditItem[],
  responses: AuditResponse[],
): CategoryScore[] {
  const responseMap = new Map(responses.map((r) => [r.itemId, r]));
  const buckets = new Map<string, { num: number; den: number }>();
  for (const item of items) {
    const r = responseMap.get(item.id);
    if (r?.result === 'NA') continue;
    const b = buckets.get(item.category) ?? { num: 0, den: 0 };
    b.den += item.weight;
    if (r?.result === 'C') b.num += item.weight;
    buckets.set(item.category, b);
  }
  return Array.from(buckets.entries()).map(([category, { num, den }]) => ({
    category,
    conformes: num,
    total: den,
    scorePercent: den === 0 ? 0 : Math.round((num / den) * 10000) / 100,
  }));
}
