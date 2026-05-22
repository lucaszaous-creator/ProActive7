// Alergenicos de declaracao obrigatoria — RDC 26/2015 e suas atualizacoes.
// Chaves estaveis em portugues; rotulo amigavel para UI e etiquetas.

export const ALLERGENS = [
  { key: 'gluten', label: 'Glúten (trigo, centeio, cevada, aveia)' },
  { key: 'crustaceos', label: 'Crustáceos' },
  { key: 'peixes', label: 'Peixes' },
  { key: 'ovos', label: 'Ovos' },
  { key: 'leite', label: 'Leite' },
  { key: 'amendoim', label: 'Amendoim' },
  { key: 'soja', label: 'Soja' },
  { key: 'amendoas', label: 'Amêndoas' },
  { key: 'avelas', label: 'Avelãs' },
  { key: 'castanha_caju', label: 'Castanha-de-caju' },
  { key: 'castanha_para', label: 'Castanha-do-Pará' },
  { key: 'macadamias', label: 'Macadâmias' },
  { key: 'nozes', label: 'Nozes' },
  { key: 'pecas', label: 'Pecãs' },
  { key: 'pistaches', label: 'Pistaches' },
  { key: 'pinhoes', label: 'Pinhões' },
  { key: 'sulfitos', label: 'Sulfitos' },
  { key: 'latex', label: 'Látex natural' },
] as const;

export type AllergenKey = (typeof ALLERGENS)[number]['key'];

const LABEL_BY_KEY: Record<string, string> = Object.fromEntries(
  ALLERGENS.map((a) => [a.key, a.label]),
);

/** Versao curta para a etiqueta impressa. */
const SHORT_LABEL: Record<string, string> = {
  gluten: 'Glúten',
  crustaceos: 'Crustáceos',
  peixes: 'Peixes',
  ovos: 'Ovos',
  leite: 'Leite',
  amendoim: 'Amendoim',
  soja: 'Soja',
  amendoas: 'Amêndoas',
  avelas: 'Avelãs',
  castanha_caju: 'Castanha-caju',
  castanha_para: 'Castanha-Pará',
  macadamias: 'Macadâmias',
  nozes: 'Nozes',
  pecas: 'Pecãs',
  pistaches: 'Pistaches',
  pinhoes: 'Pinhões',
  sulfitos: 'Sulfitos',
  latex: 'Látex',
};

export function allergenLabel(key: string): string {
  return LABEL_BY_KEY[key] ?? key;
}

export function allergenShortLabel(key: string): string {
  return SHORT_LABEL[key] ?? key;
}

export function formatAllergenList(keys: string[]): string {
  if (keys.length === 0) return '';
  return keys.map(allergenShortLabel).join(', ');
}
