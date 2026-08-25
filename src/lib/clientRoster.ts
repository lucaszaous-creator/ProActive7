/**
 * Carta de clientes da ProActive7.
 *
 * Fonte: apresentação institucional enviada pela Ariane
 * ("EMPRESAS QUE CONFIAM NO NOSSO TRABALHO", páginas 6–13). As marcas e a
 * divisão por segmento seguem exatamente o material — nada aqui é inferido.
 *
 * Este arquivo é a **semente**: a migration `0104` insere estas linhas em
 * `site_clients` (casando pelo `slug`), então quem manda no site é o banco
 * e a nutri edita/remove tudo por `/platform/clientes`. O roster continua
 * aqui como rede de segurança — se a consulta falhar ou o banco ainda não
 * tiver a migration aplicada, a página cai neste conteúdo em vez de ficar
 * vazia.
 *
 * Os logos são assets estáticos em `public/clientes/*.webp`, extraídos da
 * própria apresentação. Custo zero: sem Storage, sem CDN paga. O caminho
 * gravado no banco (`/clientes/<slug>.webp`) é resolvido por
 * `siteAssetUrl()`, que devolve caminhos absolutos como estão.
 */

export interface RosterClient {
  /** slug = nome do arquivo em /clientes/<slug>.webp */
  slug: string;
  name: string;
  /** false quando a apresentação não trouxe logo da marca */
  hasLogo?: boolean;
  /** unidades quando a mesma marca aparece em vários endereços */
  units?: string[];
}

export interface RosterSegment {
  key: string;
  label: string;
  clients: RosterClient[];
}

export const CLIENT_ROSTER: RosterSegment[] = [
  {
    key: 'hoteis',
    label: 'Apart hotel e hotéis',
    clients: [
      { slug: 'royal-macae', name: 'Hotel Royal Macaé' },
      { slug: 'royal-urban', name: 'Hotel Royal Urban' },
      { slug: 'royal-atlantica', name: 'Hotel Royal Atlântica' },
      { slug: 'royal-kingdom', name: 'Hotel Royal Kingdom' },
      { slug: 'wyndham', name: 'Hotel Wyndham' },
      { slug: 'hotel-dubai', name: 'Hotel Dubai' },
      { slug: 'brisa-tropical', name: 'Hotel Brisa Tropical' },
      { slug: 'office-loft', name: 'Apart Hotel Office Loft' },
    ],
  },
  {
    key: 'escolas',
    label: 'Creches e escolas',
    clients: [
      { slug: 'adoleta', name: 'Adoleta Creche e Escola' },
      { slug: 'colegio-angular', name: 'Colégio Angular' },
    ],
  },
  {
    key: 'fabricas',
    label: 'Fábricas',
    clients: [
      { slug: 'nutribom', name: 'Fábrica Nutribom' },
      { slug: 'minas-pao', name: 'Fábrica Minas Pão' },
    ],
  },
  {
    key: 'padarias',
    label: 'Padarias e hamburguerias',
    clients: [
      {
        slug: 'panini',
        name: 'Padaria Panini',
        units: ['Riviera', 'Cavaleiros', 'Centro'],
      },
      {
        slug: 'macahe-burguer',
        name: 'Macahé Burguer',
        units: ['Novo Horizonte', 'Glória', 'Centro', 'Rio das Ostras'],
      },
    ],
  },
  {
    key: 'pizzarias',
    label: 'Pizzarias e pastelaria',
    clients: [
      { slug: 'santa-lenha', name: 'Pizzaria Santa Lenha' },
      { slug: 'pizzaria-cristiano', name: 'Pizzaria do Cristiano' },
      { slug: 'vicoli', name: 'Vicoli' },
      { slug: 'vicolina', name: 'Vicolina' },
      { slug: 'pastel-da-paulista', name: 'Pastel da Paulista' },
    ],
  },
  {
    key: 'restaurantes',
    label: 'Restaurantes e café',
    clients: [
      { slug: 'blue-line', name: 'Blue Line' },
      { slug: 'finalmente-bistro', name: 'Finalmente Bistrô' },
      { slug: 'cafe-da-dri', name: 'Café da Dri' },
    ],
  },
  {
    key: 'mercados',
    label: 'Hortifrutis, minimercados e supermercado',
    clients: [
      {
        slug: 'folhas-frutos',
        name: 'Folhas & Frutos',
        units: [
          'Barreto',
          'São Marcos',
          'Aeroporto',
          'Cavaleiros',
          'Galpão Distribuição',
          'Galpão Rancho Off Shore',
        ],
      },
      { slug: 'machado', name: 'Supermercado Machado' },
    ],
  },
  {
    key: 'saudavel',
    label: 'Mercado saudável e especiarias naturais',
    clients: [
      { slug: 'la-quitanda', name: 'La Quitanda' },
      { slug: 'especiarias-naturais', name: 'Especiarias Naturais' },
    ],
  },
  {
    key: 'buffet',
    label: 'Buffet e eventos',
    clients: [{ slug: 'joeli', name: 'Joeli Buffet e Eventos' }],
  },
];

/** Caminho do logo estático, ou null quando a marca não tem arte. */
export function rosterLogoUrl(c: RosterClient): string | null {
  return c.hasLogo === false ? null : `/clientes/${c.slug}.webp`;
}

/* ===================================================================
 * Forma exibida na tela — a página não sabe se veio do banco ou da
 * semente, só recebe grupos prontos.
 * =================================================================== */

export interface DisplayClient {
  key: string;
  name: string;
  logo: string | null;
  units: string[];
  city?: string | null;
  websiteUrl?: string | null;
}

export interface DisplayGroup {
  /** Rótulo do segmento; null = clientes sem segmento definido. */
  label: string | null;
  clients: DisplayClient[];
}

export interface RosterTotals {
  brands: number;
  units: number;
  segments: number;
}

/** Grupos a partir da semente — usado como fallback. */
export function groupsFromRoster(): DisplayGroup[] {
  return CLIENT_ROSTER.map((s) => ({
    label: s.label,
    clients: s.clients.map((c) => ({
      key: c.slug,
      name: c.name,
      logo: rosterLogoUrl(c),
      units: c.units ?? [],
    })),
  }));
}

/**
 * Agrupa as linhas do banco por segmento. A ordem dos grupos é a da
 * primeira aparição (as linhas já vêm por `sort_order`), então a ordem da
 * apresentação se mantém sem precisar de uma tabela de segmentos.
 * Clientes sem segmento caem num grupo próprio, no fim.
 */
export function groupsFromRows(
  rows: {
    id: string;
    name: string;
    logo_path: string | null;
    segment: string | null;
    city?: string | null;
    website_url?: string | null;
    units?: string[] | null;
  }[],
  resolveLogo: (path: string | null) => string | null,
): DisplayGroup[] {
  const order: (string | null)[] = [];
  const byLabel = new Map<string | null, DisplayClient[]>();
  for (const r of rows) {
    const label = r.segment?.trim() || null;
    if (!byLabel.has(label)) {
      byLabel.set(label, []);
      order.push(label);
    }
    byLabel.get(label)!.push({
      key: r.id,
      name: r.name,
      logo: resolveLogo(r.logo_path),
      units: r.units ?? [],
      city: r.city,
      websiteUrl: r.website_url,
    });
  }
  // Sem segmento sempre por último, independente de onde apareceu.
  order.sort((a, b) => Number(a === null) - Number(b === null));
  return order.map((label) => ({ label, clients: byLabel.get(label)! }));
}

/** Marcas, unidades e segmentos de um conjunto de grupos já montado. */
export function totalsOf(groups: DisplayGroup[]): RosterTotals {
  let brands = 0;
  let units = 0;
  for (const g of groups) {
    brands += g.clients.length;
    for (const c of g.clients) units += Math.max(1, c.units.length);
  }
  return { brands, units, segments: groups.filter((g) => g.label).length };
}

/** Achata os grupos preservando a ordem — faixa de logos da home. */
export function flattenGroups(groups: DisplayGroup[]): DisplayClient[] {
  return groups.flatMap((g) => g.clients);
}

/** Totais da semente — usados enquanto o banco não respondeu. */
export const ROSTER_TOTALS: RosterTotals = totalsOf(groupsFromRoster());

/**
 * Quantos estabelecimentos a ProActive7 já atendeu.
 *
 * NÃO sai da contagem da carta: a carta lista quem é cliente HOJE (37
 * unidades), e em 12 anos passaram muito mais pela consultoria. O número
 * abaixo é o que a Ariane, como RT e dona da empresa, confirmou — ela é
 * quem tem esse histórico. Trocar só com a palavra dela.
 */
export const CLIENT_COUNT = '100+';
