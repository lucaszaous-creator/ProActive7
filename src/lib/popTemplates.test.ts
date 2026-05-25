import { describe, it, expect } from 'vitest';
import { fillPopPlaceholders } from './popTemplates';

describe('fillPopPlaceholders', () => {
  const template =
    '**Empresa:** {{empresa}}\n' +
    '**Responsavel Tecnico:** {{rt_nome}} - CRN {{rt_crn}}\n' +
    '**Data:** {{data}}';

  it('substitui todos os placeholders quando os valores estao presentes', () => {
    const out = fillPopPlaceholders(template, {
      empresa: 'Royal Macae Palace',
      rt_nome: 'Ariane Madureira',
      rt_crn: '12345',
      data: '24/05/2026',
    });
    expect(out).not.toContain('{{');
    expect(out).toContain('Royal Macae Palace');
    expect(out).toContain('Ariane Madureira');
    expect(out).toContain('12345');
    expect(out).toContain('24/05/2026');
  });

  it('usa underline quando o valor esta ausente ou em branco', () => {
    const out = fillPopPlaceholders(template, {
      empresa: 'X',
      rt_nome: '   ',
      rt_crn: null,
      data: undefined,
    });
    expect(out).toContain('**Empresa:** X');
    expect(out).toContain('**Responsavel Tecnico:** _____________');
    expect(out).toContain('CRN _____________');
    expect(out).toContain('**Data:** _____________');
  });

  it('substitui multiplas ocorrencias do mesmo placeholder', () => {
    const out = fillPopPlaceholders('{{empresa}} - {{empresa}}', {
      empresa: 'A',
    });
    expect(out).toBe('A - A');
  });

  it('preserva o resto do markdown intacto', () => {
    const out = fillPopPlaceholders('# Titulo\n## Sub\n- {{empresa}}', {
      empresa: 'Foo',
    });
    expect(out).toBe('# Titulo\n## Sub\n- Foo');
  });
});
