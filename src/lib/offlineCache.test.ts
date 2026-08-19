import { describe, it, expect, vi, beforeEach } from 'vitest';

const store = new Map<string, unknown>();

vi.mock('./offlineQueue', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./offlineQueue')>()),
  hasIndexedDb: () => true,
  saveDraft: async (key: string, value: unknown) => {
    store.set(key, value);
  },
  readDraft: async (key: string) => store.get(key) ?? null,
  removeDraft: async (key: string) => {
    store.delete(key);
  },
}));

const { readThrough, cacheNotice } = await import('./offlineCache');

function setOnline(online: boolean) {
  vi.stubGlobal('navigator', { onLine: online });
}

beforeEach(() => {
  store.clear();
  setOnline(true);
});

const netFail = { message: 'Failed to fetch' };

describe('readThrough', () => {
  it('devolve o dado da rede e guarda a cópia', async () => {
    const result = await readThrough('k', async () => ({
      data: [{ id: 1 }],
      error: null,
    }));
    expect(result.data).toEqual([{ id: 1 }]);
    expect(result.fromCache).toBe(false);
    expect(store.size).toBe(1);
  });

  it('sem rede, devolve a cópia guardada', async () => {
    await readThrough('k', async () => ({ data: [{ id: 1 }], error: null }));
    setOnline(false);
    const result = await readThrough('k', async () => ({
      data: null,
      error: netFail,
    }));
    expect(result.data).toEqual([{ id: 1 }]);
    expect(result.fromCache).toBe(true);
    expect(result.cachedAt).not.toBeNull();
    expect(result.error).toBeNull();
  });

  it('NUNCA serve cópia quando a rede respondeu', async () => {
    await readThrough('k', async () => ({ data: [{ id: 1 }], error: null }));
    // Servidor respondeu lista vazia (o item foi apagado): a tela tem de
    // mostrar vazio, não ressuscitar o registro antigo do cache.
    const result = await readThrough('k', async () => ({
      data: [],
      error: null,
    }));
    expect(result.data).toEqual([]);
    expect(result.fromCache).toBe(false);
  });

  it('erro de permissão não vira cache: esconderia o problema real', async () => {
    await readThrough('k', async () => ({ data: [{ id: 1 }], error: null }));
    const rls = { message: 'new row violates row-level security policy' };
    const result = await readThrough('k', async () => ({
      data: null,
      error: rls,
    }));
    expect(result.error).toEqual(rls);
    expect(result.data).toBeNull();
    expect(result.fromCache).toBe(false);
  });

  it('sem rede e sem cópia, devolve o erro em vez de fingir vazio', async () => {
    setOnline(false);
    const result = await readThrough('nunca-carregado', async () => ({
      data: null,
      error: netFail,
    }));
    expect(result.data).toBeNull();
    expect(result.error).toEqual(netFail);
  });

  it('consulta que REJEITA (fetch morto) também cai no cache', async () => {
    await readThrough('k', async () => ({ data: [{ id: 1 }], error: null }));
    setOnline(false);
    const result = await readThrough('k', async () => {
      throw new Error('Failed to fetch');
    });
    expect(result.data).toEqual([{ id: 1 }]);
    expect(result.fromCache).toBe(true);
  });

  it('cada chave guarda a sua cópia', async () => {
    await readThrough('a', async () => ({ data: ['a'], error: null }));
    await readThrough('b', async () => ({ data: ['b'], error: null }));
    setOnline(false);
    const result = await readThrough('b', async () => ({
      data: null,
      error: netFail,
    }));
    expect(result.data).toEqual(['b']);
  });
});

describe('cacheNotice', () => {
  it('diz quando a cópia foi feita', () => {
    const text = cacheNotice('2026-08-19T15:30:00.000Z');
    expect(text).toContain('Sem conexão');
    expect(text).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it('sem data, ainda avisa que é cópia local', () => {
    expect(cacheNotice(null)).toContain('salvos neste aparelho');
  });
});
