import { describe, it, expect } from 'vitest';
import {
  buildLabel,
  dailyValuePercent,
  formatNutrient,
  formatPercent,
  isUsable,
  scaleTo,
  sumRecipe,
  toGrams,
  type NutritionItem,
} from './nutrition';

const arroz: NutritionItem = {
  productId: 'p1',
  productName: 'Arroz cozido',
  quantity: 1000,
  unit: 'g',
  nutrition: { energy_kcal: 128, carb_g: 28.1, protein_g: 2.5, sodium_mg: 1 },
};

const oleo: NutritionItem = {
  productId: 'p2',
  productName: 'Óleo de soja',
  quantity: 100,
  unit: 'ml',
  nutrition: { energy_kcal: 884, fat_g: 100, sat_fat_g: 15 },
};

describe('toGrams', () => {
  it('converte as unidades de massa', () => {
    expect(toGrams(2, 'kg')).toBe(2000);
    expect(toGrams(250, 'g')).toBe(250);
  });
  it('assume densidade 1 para volume', () => {
    expect(toGrams(500, 'ml')).toBe(500);
    expect(toGrams(1.5, 'L')).toBe(1500);
  });
  it('unidade avulsa não vira grama por adivinhação', () => {
    expect(toGrams(3, 'un')).toBeNull();
  });
});

describe('isUsable', () => {
  it('exige unidade convertível e algum nutriente', () => {
    expect(isUsable(arroz)).toBe(true);
    expect(isUsable({ ...arroz, unit: 'un' })).toBe(false);
    expect(isUsable({ ...arroz, nutrition: null })).toBe(false);
    expect(isUsable({ ...arroz, nutrition: {} })).toBe(false);
  });
});

describe('sumRecipe', () => {
  it('soma proporcional a 100 g de cada ingrediente', () => {
    const { total, gramsCounted } = sumRecipe([arroz]);
    expect(gramsCounted).toBe(1000);
    expect(total.energy_kcal).toBeCloseTo(1280, 5);
    expect(total.carb_g).toBeCloseTo(281, 5);
  });

  it('soma vários ingredientes', () => {
    const { total, gramsCounted } = sumRecipe([arroz, oleo]);
    expect(gramsCounted).toBe(1100);
    expect(total.energy_kcal).toBeCloseTo(1280 + 884, 5);
    expect(total.fat_g).toBeCloseTo(100, 5);
  });

  it('ingrediente sem dado NÃO vale zero: fica de fora e é reportado', () => {
    const semDados: NutritionItem = {
      productId: 'p3',
      productName: 'Tempero da casa',
      quantity: 50,
      unit: 'g',
      nutrition: null,
    };
    const { total, gramsCounted, missing } = sumRecipe([arroz, semDados]);
    // 1000 g, não 1050: o que não tem dado não entra no denominador,
    // senão a tabela por 100 g sairia diluída (errada para menos).
    expect(gramsCounted).toBe(1000);
    expect(total.energy_kcal).toBeCloseTo(1280, 5);
    expect(missing).toEqual([
      { productName: 'Tempero da casa', reason: 'sem-dados' },
    ]);
  });

  it('separa o que falta por motivo', () => {
    const { missing } = sumRecipe([
      { ...arroz, unit: 'un', productName: 'Ovo' },
      { ...arroz, nutrition: null, productName: 'Sal' },
    ]);
    expect(missing).toEqual([
      { productName: 'Ovo', reason: 'unidade' },
      { productName: 'Sal', reason: 'sem-dados' },
    ]);
  });
});

describe('scaleTo', () => {
  it('reescala para outra massa', () => {
    const out = scaleTo({ energy_kcal: 1280 }, 1000, 100);
    expect(out?.energy_kcal).toBeCloseTo(128, 5);
  });
  it('não divide por zero', () => {
    expect(scaleTo({ energy_kcal: 10 }, 0, 100)).toBeNull();
  });
});

describe('buildLabel', () => {
  it('monta as duas colunas quando há peso de porção', () => {
    const label = buildLabel([arroz], 200);
    expect(label.per100g?.energy_kcal).toBeCloseTo(128, 5);
    expect(label.perPortion?.energy_kcal).toBeCloseTo(256, 5);
    expect(label.complete).toBe(true);
  });

  it('sem peso de porção declara só a coluna de 100 g', () => {
    const label = buildLabel([arroz], null);
    expect(label.per100g).not.toBeNull();
    expect(label.perPortion).toBeNull();
  });

  it('marca incompleto quando falta ingrediente', () => {
    const label = buildLabel(
      [arroz, { ...arroz, productName: 'X', nutrition: null }],
      100,
    );
    expect(label.complete).toBe(false);
    expect(label.missing).toHaveLength(1);
  });

  it('ficha sem nenhum dado não produz rótulo vazio disfarçado de zero', () => {
    const label = buildLabel([{ ...arroz, nutrition: null }], 100);
    expect(label.per100g).toBeNull();
    expect(label.perPortion).toBeNull();
    expect(label.complete).toBe(false);
  });
});

describe('%VD', () => {
  it('usa os valores diários da IN 75', () => {
    expect(dailyValuePercent('sodium_mg', 400)).toBeCloseTo(20, 5);
    expect(dailyValuePercent('carb_g', 150)).toBeCloseTo(50, 5);
  });
  it('gordura trans não tem VD definido pela norma', () => {
    expect(dailyValuePercent('trans_fat_g', 2)).toBeNull();
  });
  it('sem valor não calcula', () => {
    expect(dailyValuePercent('protein_g', null)).toBeNull();
  });
});

describe('formatação da tabela', () => {
  it('energia e sódio em número inteiro', () => {
    expect(formatNutrient('energy_kcal', 127.6)).toBe('128 kcal');
    expect(formatNutrient('sodium_mg', 401.4)).toBe('401 mg');
  });
  it('demais nutrientes com no máximo uma casa', () => {
    expect(formatNutrient('carb_g', 28.14)).toBe('28,1 g');
    expect(formatNutrient('protein_g', 3)).toBe('3 g');
  });
  it('ausência não vira zero', () => {
    expect(formatNutrient('protein_g', null)).toBe('—');
    expect(formatPercent(null)).toBe('—');
  });
});
