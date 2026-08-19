import { describe, it, expect } from 'vitest';
import {
  answerTypeOf,
  checklistItemChecked,
  formatAnswer,
  hasRange,
  isAnswered,
  isNonConforming,
  rangeLabel,
  resultForMeasure,
  scaleMaxOf,
  scoreWeights,
} from './auditAnswers';
import type { AuditItem } from './types';

const base = { id: 'i', category: 'X', text: 'pergunta', weight: 2 };
const conformity: AuditItem = { ...base };
const text: AuditItem = { ...base, answer_type: 'text' };
const scale: AuditItem = { ...base, answer_type: 'scale', scale_max: 10 };
const freezer: AuditItem = {
  ...base,
  answer_type: 'measure',
  unit: '°C',
  min: -18,
  max: -12,
};
const semFaixa: AuditItem = { ...base, answer_type: 'measure', unit: 'kg' };

describe('answerTypeOf', () => {
  it('modelo antigo sem answer_type continua sendo conformidade', () => {
    expect(answerTypeOf(conformity)).toBe('conformity');
  });
});

describe('scaleMaxOf', () => {
  it('usa o máximo do modelo', () => expect(scaleMaxOf(scale)).toBe(10));
  it('cai no padrão 5 quando ausente', () =>
    expect(scaleMaxOf({} as AuditItem)).toBe(5));
  it('protege contra escala zero (divisão por zero)', () =>
    expect(scaleMaxOf({ scale_max: 0 } as AuditItem)).toBe(5));
});

describe('resultForMeasure', () => {
  it('dentro da faixa é conforme', () =>
    expect(resultForMeasure(freezer, -15)).toBe('C'));
  it('abaixo do mínimo é NC', () =>
    expect(resultForMeasure(freezer, -25)).toBe('NC'));
  it('acima do máximo é NC', () =>
    expect(resultForMeasure(freezer, -5)).toBe('NC'));
  it('limite da faixa é conforme (inclusivo)', () => {
    expect(resultForMeasure(freezer, -18)).toBe('C');
    expect(resultForMeasure(freezer, -12)).toBe('C');
  });
  it('sem faixa não inventa veredito', () =>
    expect(resultForMeasure(semFaixa, 42)).toBeUndefined());
  it('sem valor não inventa veredito', () =>
    expect(resultForMeasure(freezer, undefined)).toBeUndefined());
  it('faixa só com mínimo', () => {
    const item = { min: 60 };
    expect(resultForMeasure(item, 80)).toBe('C');
    expect(resultForMeasure(item, 50)).toBe('NC');
  });
});

describe('hasRange / rangeLabel', () => {
  it('reconhece faixa dos dois lados', () => {
    expect(hasRange(freezer)).toBe(true);
    expect(rangeLabel(freezer)).toBe('entre -18 e -12 °C');
  });
  it('reconhece ausência de faixa', () => {
    expect(hasRange(semFaixa)).toBe(false);
    expect(rangeLabel(semFaixa)).toBe('');
  });
  it('faixa aberta de um lado só', () => {
    expect(rangeLabel({ min: 60, unit: '°C' })).toBe('mínimo 60 °C');
    expect(rangeLabel({ max: 5, unit: '°C' })).toBe('máximo 5 °C');
  });
});

describe('scoreWeights', () => {
  it('N-A fica fora do cálculo em qualquer tipo', () => {
    expect(scoreWeights(conformity, { itemId: 'i', result: 'NA' })).toBeNull();
    expect(
      scoreWeights(scale, { itemId: 'i', result: 'NA', value: 10 }),
    ).toBeNull();
  });

  it('texto nunca pontua', () => {
    expect(scoreWeights(text, { itemId: 'i', text: 'relato' })).toBeNull();
  });

  it('conformidade sem resposta conta como NC', () => {
    expect(scoreWeights(conformity, undefined)).toEqual({ num: 0, den: 2 });
  });

  it('escala pontua proporcional à nota', () => {
    expect(scoreWeights(scale, { itemId: 'i', value: 10 })).toEqual({
      num: 2,
      den: 2,
    });
    expect(scoreWeights(scale, { itemId: 'i', value: 5 })).toEqual({
      num: 1,
      den: 2,
    });
  });

  it('escala fora dos limites não vira crédito extra nem negativo', () => {
    expect(scoreWeights(scale, { itemId: 'i', value: 99 })).toEqual({
      num: 2,
      den: 2,
    });
    expect(scoreWeights(scale, { itemId: 'i', value: -3 })).toEqual({
      num: 0,
      den: 2,
    });
  });

  it('valor medido pontua pela faixa, não pelo clique da RT', () => {
    expect(scoreWeights(freezer, { itemId: 'i', value: -15 })).toEqual({
      num: 2,
      den: 2,
    });
    expect(scoreWeights(freezer, { itemId: 'i', value: 4 })).toEqual({
      num: 0,
      den: 2,
    });
  });

  it('valor medido sem faixa é documental e não pontua', () => {
    expect(scoreWeights(semFaixa, { itemId: 'i', value: 12 })).toBeNull();
  });
});

describe('isNonConforming', () => {
  it('valor fora da faixa vira NC sem a RT clicar', () => {
    expect(isNonConforming(freezer, { itemId: 'i', value: 4 })).toBe(true);
  });
  it('valor dentro da faixa não abre NC', () => {
    expect(isNonConforming(freezer, { itemId: 'i', value: -15 })).toBe(false);
  });
  it('N-A nunca abre NC', () => {
    expect(
      isNonConforming(freezer, { itemId: 'i', result: 'NA', value: 4 }),
    ).toBe(false);
  });
  it('conformidade segue o veredito da RT', () => {
    expect(isNonConforming(conformity, { itemId: 'i', result: 'NC' })).toBe(
      true,
    );
    expect(isNonConforming(conformity, { itemId: 'i', result: 'C' })).toBe(
      false,
    );
  });
});

describe('isAnswered', () => {
  it('texto em branco não conta como respondido', () => {
    expect(isAnswered(text, { itemId: 'i', text: '   ' })).toBe(false);
    expect(isAnswered(text, { itemId: 'i', text: 'ok' })).toBe(true);
  });
  it('medida precisa de número', () => {
    expect(isAnswered(freezer, { itemId: 'i' })).toBe(false);
    expect(isAnswered(freezer, { itemId: 'i', value: 0 })).toBe(true);
  });
  it('observação sem veredito não conta como respondido', () => {
    expect(isAnswered(conformity, { itemId: 'i', note: 'vi isso' })).toBe(
      false,
    );
  });
});

describe('formatAnswer', () => {
  it('conformidade em texto legível', () => {
    expect(formatAnswer(conformity, { itemId: 'i', result: 'C' })).toBe(
      'Conforme',
    );
    expect(formatAnswer(conformity, undefined)).toBe('—');
  });
  it('escala mostra a nota sobre o máximo', () => {
    expect(formatAnswer(scale, { itemId: 'i', value: 7 })).toBe('7 / 10');
  });
  it('medida mostra unidade e veredito derivado', () => {
    expect(formatAnswer(freezer, { itemId: 'i', value: -15 })).toBe(
      '-15 °C (Conforme)',
    );
    expect(formatAnswer(freezer, { itemId: 'i', value: 4 })).toBe(
      '4 °C (Não conforme)',
    );
  });
  it('medida sem faixa mostra só o valor', () => {
    expect(formatAnswer(semFaixa, { itemId: 'i', value: 12 })).toBe('12 kg');
  });
  it('texto mostra a resposta escrita', () => {
    expect(formatAnswer(text, { itemId: 'i', text: 'relato' })).toBe('relato');
  });
});

describe('checklistItemChecked (rotina)', () => {
  it('conformidade segue a caixa marcada', () => {
    expect(checklistItemChecked({}, { checked: true })).toBe(true);
    expect(checklistItemChecked({}, { checked: false })).toBe(false);
    expect(checklistItemChecked({}, undefined)).toBe(false);
  });

  it('valor medido com faixa é derivado, não marcado à mão', () => {
    const camara = { answer_type: 'measure' as const, min: -18, max: -12 };
    expect(checklistItemChecked(camara, { value: -15 })).toBe(true);
    // Fora da faixa não conta como ok nem se a pessoa marcar a caixa:
    // o número é que manda.
    expect(checklistItemChecked(camara, { value: 2, checked: true })).toBe(
      false,
    );
  });

  it('valor medido sem faixa conta como registrado', () => {
    const peso = { answer_type: 'measure' as const, unit: 'kg' };
    expect(checklistItemChecked(peso, { value: 12 })).toBe(true);
    expect(checklistItemChecked(peso, {})).toBe(false);
  });

  it('nota e texto contam quando respondidos', () => {
    expect(checklistItemChecked({ answer_type: 'scale' }, { value: 0 })).toBe(
      true,
    );
    expect(checklistItemChecked({ answer_type: 'scale' }, {})).toBe(false);
    expect(checklistItemChecked({ answer_type: 'text' }, { text: ' ' })).toBe(
      false,
    );
    expect(checklistItemChecked({ answer_type: 'text' }, { text: 'ok' })).toBe(
      true,
    );
  });
});
