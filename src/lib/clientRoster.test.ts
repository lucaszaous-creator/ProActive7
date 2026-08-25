import { describe, it, expect } from 'vitest';
import {
  CLIENT_ROSTER,
  groupsFromRows,
  staticLogoForSlug,
  totalsOf,
} from './clientRoster';

/** Resolve como o site: caminho absoluto passa direto, o resto vira null. */
const resolve = (p: string | null) => (p && p.startsWith('/') ? p : null);

describe('staticLogoForSlug', () => {
  it('encontra a arte de um slug da carta', () => {
    expect(staticLogoForSlug('colegio-angular')).toBe(
      '/clientes/colegio-angular.webp',
    );
  });

  it('ignora slug desconhecido ou vazio', () => {
    expect(staticLogoForSlug('cliente-que-a-nutri-criou')).toBeNull();
    expect(staticLogoForSlug(null)).toBeNull();
    expect(staticLogoForSlug(undefined)).toBeNull();
  });
});

describe('groupsFromRows', () => {
  const linha = (over: Record<string, unknown> = {}) => ({
    id: 'id-1',
    name: 'Colégio Angular',
    logo_path: null as string | null,
    segment: 'Creches e escolas',
    slug: 'colegio-angular',
    ...over,
  });

  /* O caso que motivou o fallback: a arte entra no deploy antes de alguém
     rodar a migration que aponta o logo_path para ela. */
  it('cai na arte estática quando a linha do banco não tem logo', () => {
    const [g] = groupsFromRows([linha()], resolve);
    expect(g.clients[0].logo).toBe('/clientes/colegio-angular.webp');
  });

  it('o logo do banco tem precedência sobre a arte estática', () => {
    const [g] = groupsFromRows(
      [linha({ logo_path: '/clientes/enviado-pela-nutri.webp' })],
      resolve,
    );
    expect(g.clients[0].logo).toBe('/clientes/enviado-pela-nutri.webp');
  });

  it('cliente sem slug e sem logo fica sem arte', () => {
    const [g] = groupsFromRows([linha({ slug: null })], resolve);
    expect(g.clients[0].logo).toBeNull();
  });

  it('agrupa por segmento e joga os sem segmento para o fim', () => {
    const groups = groupsFromRows(
      [
        linha({ id: 'a', segment: null, name: 'Sem segmento' }),
        linha({ id: 'b', segment: 'Fábricas', name: 'Uma fábrica' }),
      ],
      resolve,
    );
    expect(groups.map((g) => g.label)).toEqual(['Fábricas', null]);
  });
});

describe('totalsOf', () => {
  it('conta unidades, não marcas, onde a marca tem várias lojas', () => {
    const groups = groupsFromRows(
      [
        linhaComUnidades('panini', ['Riviera', 'Cavaleiros', 'Centro']),
        linhaComUnidades('machado', []),
      ],
      resolve,
    );
    const t = totalsOf(groups);
    expect(t.brands).toBe(2);
    expect(t.units).toBe(4); // 3 do Panini + 1 do Machado
  });

  function linhaComUnidades(slug: string, units: string[]) {
    return {
      id: slug,
      name: slug,
      logo_path: null,
      segment: 'Mercados',
      slug,
      units,
    };
  }
});

describe('carta da apresentação', () => {
  it('todo cliente tem slug único', () => {
    const slugs = CLIENT_ROSTER.flatMap((s) => s.clients).map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
