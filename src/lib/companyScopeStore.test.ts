import { describe, it, expect } from 'vitest';
import { resolveActive } from './companyScopeStore';
import type { Company } from './types';

const company = (id: string, name: string) =>
  ({ id, name }) as unknown as Company;

const list = [company('a', 'Cozinha Central'), company('b', 'Japa Food')];

describe('resolveActive', () => {
  it('mantém a empresa escolhida quando ela ainda existe', () => {
    expect(resolveActive(list, 'b')).toBe('b');
  });

  it('cai na primeira quando nada foi escolhido', () => {
    expect(resolveActive(list, '')).toBe('a');
  });

  it('empresa que sumiu da lista não gruda', () => {
    // Cobre empresa apagada, desativada e — o caso que importa — troca de
    // conta no mesmo aparelho, quando a guardada é de OUTRA organização.
    expect(resolveActive(list, 'de-outra-org')).toBe('a');
  });

  it('sem empresa nenhuma, devolve vazio em vez de inventar', () => {
    expect(resolveActive([], 'a')).toBe('');
  });
});
