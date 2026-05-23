// Teste do agregador puro de relatorios. Reproduz a funcao 'aggregate' do
// ReportsPage sem o React; mantemos a logica espelhada aqui pra teste
// rapido sem importar a pagina inteira.

import { describe, it, expect } from 'vitest';
import { STORAGE_CONDITION_LABELS, type StorageCondition } from './types';

interface Row {
  storage_condition: StorageCondition;
  quantity: number;
  product: { category: string | null } | null;
  printer: { full_name: string | null; email: string | null } | null;
}

function aggregate(rows: Row[]) {
  const cat = new Map<string, number>();
  const user = new Map<string, number>();
  const cond = new Map<string, number>();
  let total = 0;
  for (const r of rows) {
    const q = r.quantity;
    total += q;
    cat.set(
      r.product?.category ?? 'Sem categoria',
      (cat.get(r.product?.category ?? 'Sem categoria') ?? 0) + q,
    );
    const userKey =
      r.printer?.full_name ?? r.printer?.email ?? 'Não identificado';
    user.set(userKey, (user.get(userKey) ?? 0) + q);
    const condKey = STORAGE_CONDITION_LABELS[r.storage_condition];
    cond.set(condKey, (cond.get(condKey) ?? 0) + q);
  }
  return { cat, user, cond, total };
}

describe('aggregate de relatorios', () => {
  it('soma quantity (nao conta apenas linhas)', () => {
    const out = aggregate([
      {
        storage_condition: 'refrigerado',
        quantity: 5,
        product: { category: 'Molhos' },
        printer: { full_name: 'Ana', email: null },
      },
      {
        storage_condition: 'refrigerado',
        quantity: 3,
        product: { category: 'Molhos' },
        printer: { full_name: 'Ana', email: null },
      },
    ]);
    expect(out.total).toBe(8);
    expect(out.cat.get('Molhos')).toBe(8);
    expect(out.user.get('Ana')).toBe(8);
  });

  it('agrupa "Sem categoria" e "Não identificado" quando faltam dados', () => {
    const out = aggregate([
      {
        storage_condition: 'ambiente',
        quantity: 1,
        product: null,
        printer: null,
      },
    ]);
    expect(out.cat.get('Sem categoria')).toBe(1);
    expect(out.user.get('Não identificado')).toBe(1);
  });

  it('usa email quando full_name esta vazio', () => {
    const out = aggregate([
      {
        storage_condition: 'congelado',
        quantity: 2,
        product: { category: 'X' },
        printer: { full_name: null, email: 'x@y.com' },
      },
    ]);
    expect(out.user.get('x@y.com')).toBe(2);
  });
});
