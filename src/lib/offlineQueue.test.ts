import { describe, it, expect } from 'vitest';
import {
  collapse,
  flushQueue,
  memoryStorage,
  newWrite,
  stuckEntries,
  MAX_AUTO_ATTEMPTS,
  type QueuedWrite,
} from './offlineQueue';
import { isNetworkError } from './offlineSync';

function write(over: Partial<QueuedWrite> = {}): QueuedWrite {
  return {
    ...newWrite({
      table: 'audits',
      op: 'update',
      match: { id: 'a1' },
      payload: { responses: [] },
      label: 'Vistoria',
    }),
    ...over,
  };
}

const ok = async () => ({ error: null });
const fail = (message: string) => async () => ({ error: { message } });

describe('flushQueue', () => {
  it('sobe tudo e esvazia a fila', async () => {
    const storage = memoryStorage([
      write({ id: '1', queuedAt: '2026-01-01T10:00:00Z' }),
      write({ id: '2', match: { id: 'a2' }, queuedAt: '2026-01-01T11:00:00Z' }),
    ]);
    const result = await flushQueue(storage, ok);
    expect(result).toEqual({ sent: 2, failed: 0, remaining: 0 });
  });

  it('respeita a ordem de enfileiramento', async () => {
    const seen: string[] = [];
    const storage = memoryStorage([
      write({ id: 'novo', queuedAt: '2026-01-01T12:00:00Z' }),
      write({ id: 'antigo', queuedAt: '2026-01-01T09:00:00Z' }),
    ]);
    await flushQueue(storage, async (e) => {
      seen.push(e.id);
      return { error: null };
    });
    expect(seen).toEqual(['antigo', 'novo']);
  });

  it('para na primeira falha para não reordenar a fila', async () => {
    const seen: string[] = [];
    const storage = memoryStorage([
      write({ id: '1', queuedAt: '2026-01-01T09:00:00Z' }),
      write({ id: '2', match: { id: 'a2' }, queuedAt: '2026-01-01T10:00:00Z' }),
    ]);
    const result = await flushQueue(storage, async (e) => {
      seen.push(e.id);
      return { error: { message: 'sem rede' } };
    });
    expect(seen).toEqual(['1']);
    expect(result.sent).toBe(0);
    expect(result.remaining).toBe(2);
  });

  it('guarda o erro e conta a tentativa', async () => {
    const storage = memoryStorage([write({ id: '1' })]);
    await flushQueue(storage, fail('timeout'));
    const [entry] = await storage.all();
    expect(entry.attempts).toBe(1);
    expect(entry.lastError).toBe('timeout');
  });

  it('desiste sozinha depois do limite e não some com o dado', async () => {
    const storage = memoryStorage([
      write({ id: '1', attempts: MAX_AUTO_ATTEMPTS }),
    ]);
    let called = 0;
    const result = await flushQueue(storage, async () => {
      called += 1;
      return { error: null };
    });
    expect(called).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.remaining).toBe(1);
    expect(stuckEntries(await storage.all())).toHaveLength(1);
  });
});

describe('collapse', () => {
  it('update novo substitui o pendente da mesma linha', () => {
    const first = write({ id: '1', payload: { notes: 'a' } });
    const second = write({ id: '2', payload: { notes: 'b' } });
    const out = collapse([first], second);
    expect(out).toHaveLength(1);
    expect(out[0].payload).toEqual({ notes: 'b' });
  });

  it('não mistura linhas diferentes', () => {
    const a = write({ id: '1', match: { id: 'a1' } });
    const b = write({ id: '2', match: { id: 'a2' } });
    expect(collapse([a], b)).toHaveLength(2);
  });

  it('não mistura tabelas diferentes', () => {
    const a = write({ id: '1', table: 'audits' });
    const b = write({ id: '2', table: 'checklist_runs' });
    expect(collapse([a], b)).toHaveLength(2);
  });

  it('insert nunca é colapsado (dois registros são dois registros)', () => {
    const a = write({ id: '1', op: 'insert', match: {} });
    const b = write({ id: '2', op: 'insert', match: {} });
    expect(collapse([a], b)).toHaveLength(2);
  });

  it('não descarta entrada que já tentou subir', () => {
    // Se já foi tentada, pode ter chegado ao servidor: descartar aqui
    // apagaria um envio possivelmente parcial sem ninguém saber.
    const tried = write({ id: '1', attempts: 2 });
    const fresh = write({ id: '2' });
    expect(collapse([tried], fresh)).toHaveLength(2);
  });
});

describe('isNetworkError', () => {
  it('reconhece as falhas de rede dos navegadores', () => {
    expect(isNetworkError({ message: 'Failed to fetch' })).toBe(true);
    expect(isNetworkError({ message: 'NetworkError when attempting' })).toBe(true);
    expect(isNetworkError({ message: 'Load failed' })).toBe(true);
    expect(isNetworkError({ message: 'signal timeout' })).toBe(true);
  });

  it('não confunde erro do banco com queda de sinal', () => {
    // Erro de RLS não pode ir para a fila: tentar de novo daria o mesmo
    // resultado para sempre e esconderia o problema real da pessoa.
    expect(
      isNetworkError({ message: 'new row violates row-level security policy' }),
    ).toBe(false);
    expect(isNetworkError(null)).toBe(false);
    expect(isNetworkError({})).toBe(false);
  });
});
