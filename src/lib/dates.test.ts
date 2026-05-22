import { describe, it, expect } from 'vitest';
import { computeExpiry, toLocalInputValue } from './dates';

describe('computeExpiry', () => {
  it('soma horas quando a unidade for "hours"', () => {
    const base = new Date('2026-05-22T10:00:00Z');
    const result = computeExpiry(base, 6, 'hours');
    expect(result.toISOString()).toBe('2026-05-22T16:00:00.000Z');
  });

  it('soma dias quando a unidade for "days"', () => {
    const base = new Date('2026-05-22T10:00:00Z');
    const result = computeExpiry(base, 3, 'days');
    expect(result.toISOString()).toBe('2026-05-25T10:00:00.000Z');
  });

  it('respeita a virada de mes', () => {
    const base = new Date('2026-01-30T08:00:00Z');
    const result = computeExpiry(base, 5, 'days');
    expect(result.toISOString()).toBe('2026-02-04T08:00:00.000Z');
  });
});

describe('toLocalInputValue', () => {
  it('formata como yyyy-MM-ddTHH:mm em horario local', () => {
    const d = new Date(2026, 4, 22, 9, 5); // 22/05/2026 09:05 local
    expect(toLocalInputValue(d)).toBe('2026-05-22T09:05');
  });

  it('aplica zero a esquerda em mes, dia, hora e minuto', () => {
    const d = new Date(2026, 0, 1, 3, 7);
    expect(toLocalInputValue(d)).toBe('2026-01-01T03:07');
  });
});
