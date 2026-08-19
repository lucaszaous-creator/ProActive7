/**
 * Cálculos da ficha técnica (0107). Tudo aqui é função pura: o custo
 * aparece na tela e no PDF, então precisa ser previsível e testável.
 *
 * O custo é registrado POR INGREDIENTE, em centavos, na quantidade
 * informada na ficha — não é preço unitário do produto. Preço de compra
 * muda a cada nota; o que a RT documenta é o custo considerado naquela
 * ficha, na data em que a fez.
 */

export interface CostableItem {
  /** Quantidade líquida usada na receita. */
  quantity: number;
  /** Peso bruto / peso líquido. 1 = sem perda de limpeza. */
  correction_factor?: number | null;
  /** Custo em centavos do ingrediente nesta ficha. */
  cost_cents?: number | null;
}

/**
 * Quantidade bruta a comprar: o que vai para a receita corrigido pela
 * perda de limpeza (casca, aparas, osso). FC ausente ou inválido = 1.
 */
export function grossQuantity(item: CostableItem): number {
  const fc = item.correction_factor;
  const factor = typeof fc === 'number' && fc > 0 ? fc : 1;
  return item.quantity * factor;
}

/** Custo total da ficha, em centavos. Ingrediente sem custo conta zero. */
export function totalCostCents(items: CostableItem[]): number {
  return items.reduce((acc, i) => acc + (i.cost_cents ?? 0), 0);
}

/** true quando algum ingrediente ainda está sem custo preenchido. */
export function hasIncompleteCost(items: CostableItem[]): boolean {
  return items.some((i) => i.cost_cents == null);
}

/**
 * Custo de uma porção, em centavos. Null quando não há rendimento
 * declarado — melhor não mostrar número do que mostrar número errado.
 */
export function costPerPortionCents(
  items: CostableItem[],
  yieldPortions: number | null | undefined,
): number | null {
  if (!yieldPortions || yieldPortions <= 0) return null;
  return totalCostCents(items) / yieldPortions;
}

/**
 * Per capita de um ingrediente: quanto dele vai em cada porção, na
 * unidade do próprio ingrediente. Null sem rendimento declarado.
 */
export function perCapita(
  item: CostableItem,
  yieldPortions: number | null | undefined,
): number | null {
  if (!yieldPortions || yieldPortions <= 0) return null;
  return item.quantity / yieldPortions;
}

/** Formata centavos como moeda brasileira (aceita fração de centavo). */
export function formatBRL(cents: number | null | undefined): string {
  if (cents == null) return '—';
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Converte o texto digitado num campo de dinheiro para centavos.
 * Devolve null quando vazio ou inválido — o chamador decide se isso é
 * erro ou "sem custo".
 *
 * O ponto é ambíguo em PT-BR (milhar) e em teclado numérico (decimal),
 * então a regra é: com vírgula, ela manda e os pontos são milhar
 * ("1.234,56"); sem vírgula, um único ponto com 1 ou 2 casas depois é
 * decimal ("12.50" = R$ 12,50) e qualquer outro arranjo é milhar
 * ("1.234" = R$ 1.234,00).
 */
export function parseBRLToCents(input: string): number | null {
  const raw = input.trim();
  if (!raw) return null;
  if (!/^[\d.,]+$/.test(raw)) return null;

  let normalized: string;
  if (raw.includes(',')) {
    normalized = raw.replace(/\./g, '').replace(',', '.');
  } else {
    const parts = raw.split('.');
    const decimalDot =
      parts.length === 2 && parts[1].length > 0 && parts[1].length <= 2;
    normalized = decimalDot ? raw : raw.replace(/\./g, '');
  }

  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}
