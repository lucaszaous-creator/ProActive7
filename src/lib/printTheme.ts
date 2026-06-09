// Design system de IMPRESSÃO do ProActive7.
//
// Tokens unificados usados por todas as superfícies impressas:
//   - PDFs (jsPDF): visita técnica  → cores como tupla RGB
//   - HTML/CSS print: dossiê, etiqueta → cores como hex
//
// Marca: emerald (primária), slate (tinta/neutros), tiers de conformidade.

export const BRAND = {
  name: 'ProActive7',
  tagline: 'Boa alimentação, bem-estar e saúde',
} as const;

/** Paleta em HEX (CSS) — espelha as tuplas RGB abaixo. */
export const PRINT_HEX = {
  brand: '#262626', // neutral-800
  brandDark: '#171717', // neutral-900
  brandDeep: '#0a0a0a', // neutral-950
  brandSoft: '#f5f5f5', // neutral-100
  ink: '#171717', // neutral-900
  body: '#404040', // neutral-700
  muted: '#737373', // neutral-500
  faint: '#a3a3a3', // neutral-400
  hair: '#e5e5e5', // neutral-200
  paper: '#ffffff',
  green: '#404040',
  greenSoft: '#f5f5f5',
  amber: '#d97706',
  amberSoft: '#fffbeb',
  red: '#dc2626',
  redSoft: '#fef2f2',
} as const;

/** Mesma paleta em tupla [r,g,b] — para `doc.setFillColor(...c)` no jsPDF. */
export const PRINT_RGB = {
  brand: [38, 38, 38],
  brandDark: [23, 23, 23],
  brandDeep: [10, 10, 10],
  brandSoft: [245, 245, 245],
  ink: [23, 23, 23],
  body: [64, 64, 64],
  muted: [115, 115, 115],
  faint: [163, 163, 163],
  hair: [229, 229, 229],
  white: [255, 255, 255],
  green: [64, 64, 64],
  amber: [217, 119, 6],
  red: [220, 38, 38],
} as const satisfies Record<string, readonly [number, number, number]>;

export type Tier = 'green' | 'amber' | 'red';

export function scoreTier(score: number | null | undefined): Tier {
  if (score == null) return 'red';
  if (score >= 85) return 'green';
  if (score >= 70) return 'amber';
  return 'red';
}

export function tierLabel(t: Tier): string {
  return t === 'green' ? 'CONFORME' : t === 'amber' ? 'ATENÇÃO' : 'CRÍTICO';
}

export function tierHex(t: Tier): { fg: string; bg: string } {
  if (t === 'green') return { fg: PRINT_HEX.green, bg: PRINT_HEX.greenSoft };
  if (t === 'amber') return { fg: PRINT_HEX.amber, bg: PRINT_HEX.amberSoft };
  return { fg: PRINT_HEX.red, bg: PRINT_HEX.redSoft };
}

export function tierRgb(t: Tier): readonly [number, number, number] {
  if (t === 'green') return PRINT_RGB.green;
  if (t === 'amber') return PRINT_RGB.amber;
  return PRINT_RGB.red;
}
