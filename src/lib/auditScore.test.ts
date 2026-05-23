import { describe, it, expect } from 'vitest';
import { calculateAuditScore, scoresByCategory } from './auditScore';
import type { AuditItem, AuditResponse } from './types';

const items: AuditItem[] = [
  { id: 'a', category: 'X', text: 'a', weight: 1 },
  { id: 'b', category: 'X', text: 'b', weight: 2 },
  { id: 'c', category: 'Y', text: 'c', weight: 3 },
];

describe('calculateAuditScore', () => {
  it('100% quando tudo conforme', () => {
    const r: AuditResponse[] = [
      { itemId: 'a', result: 'C' },
      { itemId: 'b', result: 'C' },
      { itemId: 'c', result: 'C' },
    ];
    expect(calculateAuditScore(items, r)).toBe(100);
  });

  it('0% quando tudo nao-conforme', () => {
    const r: AuditResponse[] = [
      { itemId: 'a', result: 'NC' },
      { itemId: 'b', result: 'NC' },
      { itemId: 'c', result: 'NC' },
    ];
    expect(calculateAuditScore(items, r)).toBe(0);
  });

  it('ponderado pelo peso', () => {
    // a=1 (C), b=2 (NC), c=3 (C) -> (1+3)/(1+2+3) = 4/6 = 66.67
    const r: AuditResponse[] = [
      { itemId: 'a', result: 'C' },
      { itemId: 'b', result: 'NC' },
      { itemId: 'c', result: 'C' },
    ];
    expect(calculateAuditScore(items, r)).toBeCloseTo(66.67, 2);
  });

  it('itens NA sao ignorados', () => {
    // b=NA -> denominador=1+3=4, numerador=1+3=4 -> 100
    const r: AuditResponse[] = [
      { itemId: 'a', result: 'C' },
      { itemId: 'b', result: 'NA' },
      { itemId: 'c', result: 'C' },
    ];
    expect(calculateAuditScore(items, r)).toBe(100);
  });

  it('itens sem resposta contam como NC', () => {
    const r: AuditResponse[] = [{ itemId: 'a', result: 'C' }];
    // a=C(1), b=sem resp=NC(0), c=sem resp=NC(0) -> 1/6 = 16.67
    expect(calculateAuditScore(items, r)).toBeCloseTo(16.67, 2);
  });

  it('retorna null quando tudo eh NA', () => {
    const r: AuditResponse[] = [
      { itemId: 'a', result: 'NA' },
      { itemId: 'b', result: 'NA' },
      { itemId: 'c', result: 'NA' },
    ];
    expect(calculateAuditScore(items, r)).toBe(null);
  });
});

describe('scoresByCategory', () => {
  it('agrega por categoria', () => {
    const r: AuditResponse[] = [
      { itemId: 'a', result: 'C' },
      { itemId: 'b', result: 'NC' },
      { itemId: 'c', result: 'C' },
    ];
    const out = scoresByCategory(items, r);
    const x = out.find((c) => c.category === 'X');
    const y = out.find((c) => c.category === 'Y');
    expect(x?.scorePercent).toBeCloseTo(33.33, 2);
    expect(y?.scorePercent).toBe(100);
  });
});
