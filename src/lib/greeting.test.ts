import { describe, it, expect } from 'vitest';
import { firstName, greetingForHour, greetingPeriodForHour } from './greeting';

describe('greetingPeriodForHour', () => {
  it('amanhecer 5-11 = morning', () => {
    expect(greetingPeriodForHour(5)).toBe('morning');
    expect(greetingPeriodForHour(8)).toBe('morning');
    expect(greetingPeriodForHour(11)).toBe('morning');
  });

  it('tarde 12-17 = afternoon', () => {
    expect(greetingPeriodForHour(12)).toBe('afternoon');
    expect(greetingPeriodForHour(15)).toBe('afternoon');
    expect(greetingPeriodForHour(17)).toBe('afternoon');
  });

  it('noite 18-4 = evening', () => {
    expect(greetingPeriodForHour(18)).toBe('evening');
    expect(greetingPeriodForHour(22)).toBe('evening');
    expect(greetingPeriodForHour(0)).toBe('evening');
    expect(greetingPeriodForHour(4)).toBe('evening');
  });
});

describe('greetingForHour', () => {
  it('retorna o rotulo em PT-BR', () => {
    expect(greetingForHour(8)).toBe('Bom dia');
    expect(greetingForHour(14)).toBe('Boa tarde');
    expect(greetingForHour(20)).toBe('Boa noite');
  });
});

describe('firstName', () => {
  it('extrai o primeiro nome', () => {
    expect(firstName('João Silva')).toBe('João');
    expect(firstName('Ariane Madureira Souza')).toBe('Ariane');
  });
  it('lida com vazio/nulo', () => {
    expect(firstName(null)).toBe('');
    expect(firstName(undefined)).toBe('');
    expect(firstName('   ')).toBe('');
  });
});
