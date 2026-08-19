import { describe, expect, it } from 'vitest';
import {
  costPerPortionCents,
  formatBRL,
  grossQuantity,
  hasIncompleteCost,
  parseBRLToCents,
  perCapita,
  totalCostCents,
} from './recipeCost';

describe('grossQuantity', () => {
  it('aplica o fator de correção', () => {
    expect(grossQuantity({ quantity: 1000, correction_factor: 1.25 })).toBe(
      1250,
    );
  });

  it('trata FC ausente, nulo ou inválido como 1', () => {
    expect(grossQuantity({ quantity: 500 })).toBe(500);
    expect(grossQuantity({ quantity: 500, correction_factor: null })).toBe(500);
    expect(grossQuantity({ quantity: 500, correction_factor: 0 })).toBe(500);
  });
});

describe('totalCostCents / hasIncompleteCost', () => {
  const items = [{ quantity: 1, cost_cents: 1250 }, { quantity: 1 }];

  it('soma os custos e conta ingrediente sem custo como zero', () => {
    expect(totalCostCents(items)).toBe(1250);
    expect(totalCostCents([])).toBe(0);
  });

  it('avisa quando algum ingrediente está sem custo', () => {
    expect(hasIncompleteCost(items)).toBe(true);
    expect(hasIncompleteCost([{ quantity: 1, cost_cents: 0 }])).toBe(false);
  });
});

describe('costPerPortionCents', () => {
  it('divide o custo total pelo rendimento', () => {
    expect(costPerPortionCents([{ quantity: 1, cost_cents: 1000 }], 4)).toBe(
      250,
    );
  });

  it('devolve null sem rendimento declarado', () => {
    const items = [{ quantity: 1, cost_cents: 1000 }];
    expect(costPerPortionCents(items, null)).toBeNull();
    expect(costPerPortionCents(items, 0)).toBeNull();
  });
});

describe('perCapita', () => {
  it('divide a quantidade pelas porções', () => {
    expect(perCapita({ quantity: 1200 }, 10)).toBe(120);
  });

  it('devolve null sem rendimento', () => {
    expect(perCapita({ quantity: 1200 }, null)).toBeNull();
  });
});

describe('parseBRLToCents', () => {
  it('aceita vírgula, ponto e separador de milhar', () => {
    expect(parseBRLToCents('12,50')).toBe(1250);
    expect(parseBRLToCents('12.50')).toBe(1250);
    expect(parseBRLToCents('1.234,56')).toBe(123456);
    expect(parseBRLToCents('7')).toBe(700);
  });

  it('devolve null para vazio ou inválido', () => {
    expect(parseBRLToCents('')).toBeNull();
    expect(parseBRLToCents('   ')).toBeNull();
    expect(parseBRLToCents('abc')).toBeNull();
    expect(parseBRLToCents('-5')).toBeNull();
  });
});

describe('formatBRL', () => {
  it('formata centavos e trata nulo', () => {
    // \s casa o espaço não-quebrável que o toLocaleString insere.
    expect(formatBRL(1250)).toMatch(/^R\$\s?12,50$/);
    expect(formatBRL(null)).toBe('—');
  });
});
