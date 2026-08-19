import { describe, expect, it } from 'vitest';
import type { AuditItem } from './types';
import {
  findDuplicateSectionName,
  itemsToSections,
  moveInArray,
  sectionsToItems,
  type DraftSection,
} from './auditTemplateSections';

function item(id: string, category: string, text: string): AuditItem {
  return { id, category, text, weight: 2 };
}

function section(name: string, texts: string[]): DraftSection {
  return {
    key: crypto.randomUUID(),
    name,
    collapsed: false,
    items: texts.map((t, i) => ({
      id: `${name}-${i}`,
      text: t,
      weight: 1,
      legal_ref: '',
      ncTemplateId: '',
    })),
  };
}

describe('itemsToSections', () => {
  it('agrupa por categoria na ordem de primeira aparição', () => {
    const sections = itemsToSections([
      item('1', 'Manipuladores', 'Uniforme limpo'),
      item('2', 'Higienização', 'Bancadas limpas'),
      item('3', 'Manipuladores', 'Unhas curtas'),
    ]);
    expect(sections.map((s) => s.name)).toEqual([
      'Manipuladores',
      'Higienização',
    ]);
    expect(sections[0].items.map((i) => i.text)).toEqual([
      'Uniforme limpo',
      'Unhas curtas',
    ]);
  });

  it('devolve uma seção vazia quando não há itens', () => {
    const sections = itemsToSections([]);
    expect(sections).toHaveLength(1);
    expect(sections[0].items).toHaveLength(1);
    expect(sections[0].items[0].text).toBe('');
  });

  it('preserva peso, base legal e plano de ação vinculado', () => {
    const [s] = itemsToSections([
      {
        id: 'x',
        category: 'Água',
        text: 'Reservatório limpo',
        weight: 3,
        legal_ref: 'RDC 216 4.4.1',
        nc_template_id: 'nc-1',
      },
    ]);
    expect(s.items[0]).toMatchObject({
      weight: 3,
      legal_ref: 'RDC 216 4.4.1',
      ncTemplateId: 'nc-1',
    });
  });
});

describe('sectionsToItems', () => {
  it('achata seções em ordem, com a categoria da seção', () => {
    const items = sectionsToItems([
      section('Manipuladores', ['Uniforme', 'Unhas']),
      section('Higienização', ['Bancadas']),
    ]);
    expect(items.map((i) => [i.category, i.text])).toEqual([
      ['Manipuladores', 'Uniforme'],
      ['Manipuladores', 'Unhas'],
      ['Higienização', 'Bancadas'],
    ]);
  });

  it('descarta perguntas sem texto e seções vazias; nome vazio vira Geral', () => {
    const items = sectionsToItems([
      section('', ['Pergunta única']),
      section('Vazia', ['', '   ']),
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].category).toBe('Geral');
  });

  it('faz ida e volta sem perder estrutura', () => {
    const original = [
      item('1', 'A', 'p1'),
      item('2', 'A', 'p2'),
      item('3', 'B', 'p3'),
    ];
    expect(sectionsToItems(itemsToSections(original))).toEqual(original);
  });
});

describe('findDuplicateSectionName', () => {
  it('acusa nomes efetivos duplicados (inclui vazio → Geral)', () => {
    expect(
      findDuplicateSectionName([section('', ['a']), section(' ', ['b'])]),
    ).toBe('Geral');
    expect(
      findDuplicateSectionName([section('A', ['a']), section('A', ['b'])]),
    ).toBe('A');
  });

  it('ignora seções sem pergunta válida e nomes distintos', () => {
    expect(
      findDuplicateSectionName([section('A', ['a']), section('A', ['  '])]),
    ).toBeNull();
    expect(
      findDuplicateSectionName([section('A', ['a']), section('B', ['b'])]),
    ).toBeNull();
  });
});

describe('moveInArray', () => {
  it('move dentro dos limites e ignora fora deles', () => {
    expect(moveInArray([1, 2, 3], 0, 1)).toEqual([2, 1, 3]);
    expect(moveInArray([1, 2, 3], 2, 1)).toEqual([1, 3, 2]);
    expect(moveInArray([1, 2, 3], 0, -1)).toEqual([1, 2, 3]);
    expect(moveInArray([1, 2, 3], 2, 3)).toEqual([1, 2, 3]);
  });
});
