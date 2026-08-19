import { scoreWeights } from './auditAnswers';
import type { AuditItem, AuditResponse } from './types';

/**
 * Calcula o score de uma visita tecnica:
 * score = sum(peso obtido) / sum(peso avaliado) * 100
 *
 * O peso de cada item vem de `scoreWeights`, que conhece os tipos de
 * resposta: conformidade e tudo-ou-nada, nota pontua proporcional, valor
 * medido pontua pela faixa da RT, e texto/N-A ficam fora do calculo.
 *
 * - Itens "NA" sao ignorados no denominador.
 * - Itens sem resposta contam como NC (peso no denominador, zero no
 *   numerador) — incentiva preencher tudo.
 * - Score = null quando nenhum item e pontuavel (divisao por zero).
 */
export function calculateAuditScore(
  items: AuditItem[],
  responses: AuditResponse[],
): number | null {
  const responseMap = new Map(responses.map((r) => [r.itemId, r]));
  let numerator = 0;
  let denominator = 0;
  for (const item of items) {
    const w = scoreWeights(item, responseMap.get(item.id));
    if (!w) continue;
    numerator += w.num;
    denominator += w.den;
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
    const w = scoreWeights(item, responseMap.get(item.id));
    if (!w) continue;
    const b = buckets.get(item.category) ?? { num: 0, den: 0 };
    b.den += w.den;
    b.num += w.num;
    buckets.set(item.category, b);
  }
  return Array.from(buckets.entries()).map(([category, { num, den }]) => ({
    category,
    conformes: num,
    total: den,
    scorePercent: den === 0 ? 0 : Math.round((num / den) * 10000) / 100,
  }));
}
