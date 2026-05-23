import { describe, it, expect } from 'vitest';
import { validateCsvRows } from './productsCsv';

describe('validateCsvRows', () => {
  it('aceita uma linha completa', () => {
    const res = validateCsvRows([
      {
        nome: 'Molho',
        categoria: 'Molhos',
        condicao_padrao: 'refrigerado',
        validade_refrigerado: '5',
        unidade_refrigerado: 'dias',
        ativo: 'sim',
      },
    ]);
    expect(res.errors).toEqual([]);
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0].shelf).toEqual([
      { condition: 'refrigerado', value: 5, unit: 'days' },
    ]);
  });

  it('reporta erro quando nome está vazio', () => {
    const res = validateCsvRows([{ nome: ' ', condicao_padrao: 'ambiente' }]);
    expect(res.rows).toHaveLength(0);
    expect(res.errors[0]).toMatchObject({
      line: 2,
      message: expect.stringContaining('nome'),
    });
  });

  it('reporta erro quando condicao_padrao é inválida', () => {
    const res = validateCsvRows([{ nome: 'X', condicao_padrao: 'morno' }]);
    expect(res.errors[0].message).toContain('condicao_padrao');
  });

  it('reporta erro quando validade é zero ou negativa', () => {
    const res = validateCsvRows([
      {
        nome: 'X',
        condicao_padrao: 'ambiente',
        validade_ambiente: '0',
        unidade_ambiente: 'dias',
      },
    ]);
    expect(res.errors[0].message).toContain('maior que zero');
  });

  it('aceita ausência de regras de validade', () => {
    const res = validateCsvRows([{ nome: 'X', condicao_padrao: 'ambiente' }]);
    expect(res.errors).toEqual([]);
    expect(res.rows[0].shelf).toEqual([]);
  });

  it('mapeia "horas" para hours', () => {
    const res = validateCsvRows([
      {
        nome: 'X',
        condicao_padrao: 'ambiente',
        validade_ambiente: '4',
        unidade_ambiente: 'horas',
      },
    ]);
    expect(res.rows[0].shelf[0].unit).toBe('hours');
  });
});
