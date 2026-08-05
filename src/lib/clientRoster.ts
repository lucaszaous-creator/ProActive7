/**
 * Carta de clientes da ProActive7.
 *
 * Fonte: apresentação institucional enviada pela Ariane
 * ("EMPRESAS QUE CONFIAM NO NOSSO TRABALHO", páginas 6–13). As marcas e a
 * divisão por segmento seguem exatamente o material — nada aqui é inferido.
 *
 * Os logos são assets estáticos em `public/clientes/*.webp`, extraídos da
 * própria apresentação. Custo zero: sem storage, sem banco, sem CDN paga.
 * Clientes cadastrados pelo admin em `site_clients` (CMS) continuam
 * funcionando e são exibidos junto — ver `ClientesPublicPage`.
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
      { slug: 'colegio-angular', name: 'Colégio Angular', hasLogo: false },
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

/** Marcas atendidas (uma linha por marca, independente de nº de unidades). */
export const ROSTER_BRAND_COUNT = CLIENT_ROSTER.reduce(
  (n, s) => n + s.clients.length,
  0,
);

/** Unidades atendidas — marcas com várias lojas contam cada endereço. */
export const ROSTER_UNIT_COUNT = CLIENT_ROSTER.reduce(
  (n, s) =>
    n + s.clients.reduce((m, c) => m + Math.max(1, c.units?.length ?? 1), 0),
  0,
);

export const ROSTER_SEGMENT_COUNT = CLIENT_ROSTER.length;

/** Lista achatada, na ordem da apresentação — usada na faixa de logos da home. */
export const ROSTER_FLAT: RosterClient[] = CLIENT_ROSTER.flatMap(
  (s) => s.clients,
);
