/**
 * Tabela nutricional da ficha técnica (migration 0110).
 *
 * Regras da RDC 429/2020 + IN 75/2020: a tabela sai por 100 g e por
 * porção, com %VD calculado sobre os valores diários de referência de uma
 * dieta de 2.000 kcal.
 *
 * Tudo aqui é função pura — o número vai para um rótulo que chega ao
 * consumidor, então precisa ser previsível e testável.
 *
 * Princípio que atravessa o arquivo: ingrediente sem dado NÃO vale zero.
 * Somar zero para o que ninguém informou produziria uma tabela que parece
 * completa e está errada para menos. Quando falta dado, o cálculo diz que
 * está incompleto e mostra quais ingredientes faltam.
 */

export interface NutritionFacts {
  energy_kcal?: number | null;
  protein_g?: number | null;
  carb_g?: number | null;
  total_sugars_g?: number | null;
  added_sugars_g?: number | null;
  fat_g?: number | null;
  sat_fat_g?: number | null;
  trans_fat_g?: number | null;
  fiber_g?: number | null;
  sodium_mg?: number | null;
}

export type NutrientKey = keyof NutritionFacts;

export const NUTRIENT_ORDER: NutrientKey[] = [
  'energy_kcal',
  'carb_g',
  'total_sugars_g',
  'added_sugars_g',
  'protein_g',
  'fat_g',
  'sat_fat_g',
  'trans_fat_g',
  'fiber_g',
  'sodium_mg',
];

export const NUTRIENT_LABEL: Record<NutrientKey, string> = {
  energy_kcal: 'Valor energético',
  carb_g: 'Carboidratos',
  total_sugars_g: 'Açúcares totais',
  added_sugars_g: 'Açúcares adicionados',
  protein_g: 'Proteínas',
  fat_g: 'Gorduras totais',
  sat_fat_g: 'Gorduras saturadas',
  trans_fat_g: 'Gorduras trans',
  fiber_g: 'Fibra alimentar',
  sodium_mg: 'Sódio',
};

export const NUTRIENT_UNIT: Record<NutrientKey, string> = {
  energy_kcal: 'kcal',
  carb_g: 'g',
  total_sugars_g: 'g',
  added_sugars_g: 'g',
  protein_g: 'g',
  fat_g: 'g',
  sat_fat_g: 'g',
  trans_fat_g: 'g',
  fiber_g: 'g',
  sodium_mg: 'mg',
};

/**
 * Valores diários de referência (IN 75/2020, dieta de 2.000 kcal).
 * Gordura trans não tem VD: a norma não estabelece — a coluna fica vazia,
 * não zerada.
 */
export const DAILY_VALUES: Partial<Record<NutrientKey, number>> = {
  energy_kcal: 2000,
  carb_g: 300,
  added_sugars_g: 50,
  protein_g: 75,
  fat_g: 55,
  sat_fat_g: 22,
  fiber_g: 25,
  sodium_mg: 2000,
};

export interface NutritionItem {
  productId: string;
  productName: string;
  /** Quantidade líquida usada na receita. */
  quantity: number;
  /** Unidade escolhida na ficha (g, kg, ml, L, un). */
  unit: string;
  nutrition?: NutritionFacts | null;
}

/**
 * Converte a quantidade da ficha para gramas.
 *
 * `ml`/`L` assumem densidade 1 g/ml — verdade para água e caldo, aproximação
 * para óleo (0,92) e leite (1,03). O erro é pequeno e a alternativa seria
 * pedir densidade de cada líquido, o que ninguém preenche.
 *
 * `un` é intraduzível sem o peso da unidade: devolve null e o ingrediente
 * entra na lista de faltantes em vez de virar zero.
 */
export function toGrams(quantity: number, unit: string): number | null {
  if (!Number.isFinite(quantity)) return null;
  switch (unit.trim().toLowerCase()) {
    case 'g':
      return quantity;
    case 'kg':
      return quantity * 1000;
    case 'ml':
      return quantity;
    case 'l':
      return quantity * 1000;
    default:
      return null;
  }
}

/** O ingrediente tem tudo que o cálculo precisa? */
export function isUsable(item: NutritionItem): boolean {
  if (toGrams(item.quantity, item.unit) == null) return false;
  const n = item.nutrition;
  if (!n) return false;
  return NUTRIENT_ORDER.some((k) => typeof n[k] === 'number');
}

export interface NutritionTotals {
  /** Soma da preparação inteira. */
  total: NutritionFacts;
  /** Gramas de ingrediente que entraram no cálculo. */
  gramsCounted: number;
  /** Ingredientes que ficaram de fora, com o motivo. */
  missing: { productName: string; reason: 'sem-dados' | 'unidade' }[];
}

/** Soma a contribuição de cada ingrediente, ignorando o que não dá para somar. */
export function sumRecipe(items: NutritionItem[]): NutritionTotals {
  const total: NutritionFacts = {};
  const missing: NutritionTotals['missing'] = [];
  let gramsCounted = 0;

  for (const item of items) {
    const grams = toGrams(item.quantity, item.unit);
    if (grams == null) {
      missing.push({ productName: item.productName, reason: 'unidade' });
      continue;
    }
    if (!item.nutrition || !isUsable(item)) {
      missing.push({ productName: item.productName, reason: 'sem-dados' });
      continue;
    }
    gramsCounted += grams;
    const ratio = grams / 100;
    for (const key of NUTRIENT_ORDER) {
      const value = item.nutrition[key];
      if (typeof value !== 'number') continue;
      total[key] = (total[key] ?? 0) + value * ratio;
    }
  }

  return { total, gramsCounted, missing };
}

/** Escala os totais para uma massa qualquer (100 g, uma porção...). */
export function scaleTo(
  total: NutritionFacts,
  fromGrams: number,
  toGramsAmount: number,
): NutritionFacts | null {
  if (fromGrams <= 0 || toGramsAmount <= 0) return null;
  const factor = toGramsAmount / fromGrams;
  const out: NutritionFacts = {};
  for (const key of NUTRIENT_ORDER) {
    const value = total[key];
    if (typeof value === 'number') out[key] = value * factor;
  }
  return out;
}

/** %VD de um nutriente. Null quando a norma não define VD (trans). */
export function dailyValuePercent(
  key: NutrientKey,
  value: number | null | undefined,
): number | null {
  const dv = DAILY_VALUES[key];
  if (dv == null || typeof value !== 'number') return null;
  return (value / dv) * 100;
}

/**
 * Arredondamento de exibição da tabela. A IN 75 manda declarar sódio em
 * número inteiro e os demais com no máximo uma casa; energia é inteira.
 */
export function formatNutrient(
  key: NutrientKey,
  value: number | null | undefined,
): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  if (key === 'energy_kcal' || key === 'sodium_mg') {
    return `${Math.round(value)} ${NUTRIENT_UNIT[key]}`;
  }
  const rounded = Math.round(value * 10) / 10;
  return `${rounded.toLocaleString('pt-BR', {
    minimumFractionDigits: rounded % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 1,
  })} ${NUTRIENT_UNIT[key]}`;
}

export function formatPercent(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${Math.round(value)}%`;
}

export interface NutritionLabel {
  per100g: NutritionFacts | null;
  perPortion: NutritionFacts | null;
  portionGrams: number | null;
  /** Massa total considerada (só o que tinha dado). */
  gramsCounted: number;
  missing: NutritionTotals['missing'];
  complete: boolean;
}

/**
 * Monta o rótulo da preparação.
 *
 * O peso da porção vem da ficha (`portion_grams`). Sem ele só dá para
 * declarar a coluna de 100 g — e é isso que acontece, em vez de inventar
 * uma porção padrão.
 */
export function buildLabel(
  items: NutritionItem[],
  portionGrams: number | null | undefined,
): NutritionLabel {
  const { total, gramsCounted, missing } = sumRecipe(items);
  const portion =
    typeof portionGrams === 'number' && portionGrams > 0 ? portionGrams : null;
  return {
    per100g: gramsCounted > 0 ? scaleTo(total, gramsCounted, 100) : null,
    perPortion:
      gramsCounted > 0 && portion
        ? scaleTo(total, gramsCounted, portion)
        : null,
    portionGrams: portion,
    gramsCounted,
    missing,
    complete: missing.length === 0 && gramsCounted > 0,
  };
}

export const SOURCE_LABEL: Record<string, string> = {
  taco: 'TACO (Unicamp)',
  rotulo: 'Rótulo do fornecedor',
  ibge: 'IBGE / POF',
  usda: 'USDA',
  manual: 'Informado pela RT',
};
