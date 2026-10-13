import { describe, expect, it, vi } from 'vitest';
import { drainLegacyWrites, type LegacyWrite } from './legacyOfflineMigration';

const entry = (
  id: string,
  userId: string | undefined = 'owner',
  attempts = 0,
): LegacyWrite => ({
  id,
  userId,
  attempts,
  table: 'audits',
  op: 'update',
  payload: { notes: id },
  match: { id: 'audit-1' },
  queuedAt: `2026-10-13T08:00:0${id}Z`,
});

describe('transição dos registros offline', () => {
  it('envia na ordem original e só remove depois da confirmação do servidor', async () => {
    const order: string[] = [];
    const remaining = await drainLegacyWrites(
      [entry('2'), entry('1')],
      'owner',
      async (e) => {
        order.push(`send:${e.id}`);
        return true;
      },
      async (id) => {
        order.push(`remove:${id}`);
      },
    );
    expect(order).toEqual(['send:1', 'remove:1', 'send:2', 'remove:2']);
    expect(remaining).toBe(0);
  });

  it('não envia registros de outra conta nem registros sem autoria', async () => {
    const execute = vi.fn().mockResolvedValue(true);
    const remove = vi.fn().mockResolvedValue(undefined);
    const unknown = { ...entry('3'), userId: undefined };
    expect(
      await drainLegacyWrites(
        [entry('1', 'other'), entry('2'), unknown],
        'owner',
        execute,
        remove,
      ),
    ).toBe(2);
    expect(execute).toHaveBeenCalledExactlyOnceWith(entry('2'));
    expect(remove).toHaveBeenCalledExactlyOnceWith('2');
  });

  it('preserva toda a sequência quando o servidor rejeita ou filtra a primeira escrita', async () => {
    const execute = vi.fn().mockResolvedValue(false);
    const remove = vi.fn();
    expect(
      await drainLegacyWrites(
        [entry('1'), entry('2')],
        'owner',
        execute,
        remove,
      ),
    ).toBe(2);
    expect(execute).toHaveBeenCalledOnce();
    expect(remove).not.toHaveBeenCalled();
  });

  it('mantém registros que já esgotaram as tentativas para recuperação manual', async () => {
    const execute = vi.fn();
    const remove = vi.fn();
    expect(
      await drainLegacyWrites(
        [entry('1', 'owner', 5), entry('2')],
        'owner',
        execute,
        remove,
      ),
    ).toBe(2);
    expect(execute).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });
});
