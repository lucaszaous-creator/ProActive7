import { describe, it, expect } from 'vitest';
import { addMonths, isoDate, monthGrid } from './calendar';

describe('monthGrid', () => {
  it('retorna 42 dias (6 semanas)', () => {
    const grid = monthGrid(2026, 4, new Date('2026-05-23'));
    expect(grid).toHaveLength(42);
  });

  it('comeca no domingo da semana que contem dia 1', () => {
    // Maio 2026: dia 1 eh sexta-feira -> grade comeca em domingo 26-abr
    const grid = monthGrid(2026, 4, new Date('2026-05-23'));
    expect(grid[0].iso).toBe('2026-04-26');
    expect(grid[0].inMonth).toBe(false);
  });

  it('marca dias do mes corrente', () => {
    const grid = monthGrid(2026, 4, new Date('2026-05-23'));
    const inMonth = grid.filter((d) => d.inMonth);
    expect(inMonth).toHaveLength(31);
    expect(inMonth[0].day).toBe(1);
    expect(inMonth[30].day).toBe(31);
  });

  it('marca hoje quando esta na grade', () => {
    const grid = monthGrid(2026, 4, new Date('2026-05-23'));
    const today = grid.find((d) => d.isToday);
    expect(today?.iso).toBe('2026-05-23');
  });

  it('mes sem dia hoje nao marca nenhum', () => {
    const grid = monthGrid(2026, 0, new Date('2026-05-23'));
    expect(grid.filter((d) => d.isToday)).toHaveLength(0);
  });
});

describe('isoDate', () => {
  it('formata data local em YYYY-MM-DD', () => {
    expect(isoDate(new Date(2026, 4, 23))).toBe('2026-05-23');
    expect(isoDate(new Date(2026, 0, 1))).toBe('2026-01-01');
    expect(isoDate(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

describe('addMonths', () => {
  it('avanca N meses', () => {
    expect(isoDate(addMonths(new Date(2026, 4, 23), 1))).toBe('2026-06-23');
    expect(isoDate(addMonths(new Date(2026, 4, 23), 6))).toBe('2026-11-23');
  });

  it('lida com fim de mes', () => {
    // 31 jan + 1 mes -> Date interpreta como 31 fev = 3 marco em ano comum
    const r = addMonths(new Date(2026, 0, 31), 1);
    expect(r.getMonth()).toBeGreaterThanOrEqual(1);
  });
});
