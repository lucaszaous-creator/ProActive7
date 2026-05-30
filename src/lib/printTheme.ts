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
  brand: '#059669', // emerald-600
  brandDark: '#047857', // emerald-700
  brandDeep: '#064e3b', // emerald-900
  brandSoft: '#ecfdf5', // emerald-50
  ink: '#0f172a', // slate-900
  body: '#334155', // slate-700
  muted: '#64748b', // slate-500
  faint: '#94a3b8', // slate-400
  hair: '#e2e8f0', // slate-200
  paper: '#ffffff',
  green: '#059669',
  greenSoft: '#ecfdf5',
  amber: '#d97706',
  amberSoft: '#fffbeb',
  red: '#dc2626',
  redSoft: '#fef2f2',
} as const;

/** Mesma paleta em tupla [r,g,b] — para `doc.setFillColor(...c)` no jsPDF. */
export const PRINT_RGB = {
  brand: [5, 150, 105],
  brandDark: [4, 120, 87],
  brandDeep: [6, 78, 59],
  brandSoft: [236, 253, 245],
  ink: [15, 23, 42],
  body: [51, 65, 85],
  muted: [100, 116, 139],
  faint: [148, 163, 184],
  hair: [226, 232, 240],
  white: [255, 255, 255],
  green: [5, 150, 105],
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
