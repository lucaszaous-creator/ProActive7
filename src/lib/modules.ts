// Catálogo de módulos gateáveis por plano de assinatura.
// Módulos NÃO listados aqui (etiquetas, produtos, grupos, manipuladores,
// fornecedores, painel, administração da org) são CORE — sempre liberados,
// pois sem eles o produto não funciona.

export interface ModuleDef {
  key: string;
  label: string;
  description: string;
}

export const MODULES: ModuleDef[] = [
  {
    key: 'temperatura',
    label: 'Controle de temperatura',
    description: 'Registro de temperatura de equipamentos.',
  },
  {
    key: 'checklists',
    label: 'Checklists',
    description: 'Listas de verificação de boas práticas.',
  },
  {
    key: 'nao_conformidades',
    label: 'Não-conformidades',
    description: 'Abertura e tratamento de NCs.',
  },
  {
    key: 'documentos',
    label: 'Documentos',
    description: 'Repositório de documentos do estabelecimento.',
  },
  {
    key: 'auditorias',
    label: 'Auditorias & dossiê',
    description: 'Visitas técnicas, auditorias e dossiê ANVISA.',
  },
  {
    key: 'pragas',
    label: 'Controle de pragas',
    description: 'Registro de dedetização e MIP.',
  },
  {
    key: 'estoque',
    label: 'Estoque & recebimento',
    description: 'Recebimentos, estoque, produção, contagem e rastreabilidade.',
  },
  {
    key: 'relatorios',
    label: 'Relatórios',
    description: 'Relatórios gerenciais e de impressão.',
  },
  {
    key: 'fotos',
    label: 'Fotos',
    description: 'Galeria de evidências fotográficas.',
  },
  {
    key: 'agenda',
    label: 'Agenda',
    description: 'Agenda de visitas e tarefas.',
  },
  {
    key: 'impressao_direta',
    label: 'Impressão direta',
    description: 'Impressoras térmicas via relay (sem diálogo).',
  },
];

export const MODULE_LABEL: Record<string, string> = Object.fromEntries(
  MODULES.map((m) => [m.key, m.label]),
);

// Mapa rota → módulo. Rotas não listadas são CORE (sempre liberadas).
const ROUTE_MODULE: Record<string, string> = {
  '/temperatura': 'temperatura',
  '/checklists': 'checklists',
  '/nao-conformidades': 'nao_conformidades',
  '/documentos': 'documentos',
  '/visitas': 'auditorias',
  '/dossie': 'auditorias',
  '/agenda': 'agenda',
  '/controle-pragas': 'pragas',
  '/recebimentos': 'estoque',
  '/rastreabilidade': 'estoque',
  '/estoque': 'estoque',
  '/validades': 'estoque',
  '/producao': 'estoque',
  '/contagem': 'estoque',
  '/controlados': 'estoque',
  '/relatorios': 'relatorios',
  '/fotos': 'fotos',
  '/admin/impressoras': 'impressao_direta',
  '/admin/hardware': 'impressao_direta',
};

// Resolve o módulo de um pathname, cobrindo sub-rotas (ex: /visitas/:id,
// /recebimentos/novo, /estoque/movimentacoes).
export function moduleForPath(pathname: string): string | null {
  if (ROUTE_MODULE[pathname]) return ROUTE_MODULE[pathname];
  for (const [route, mod] of Object.entries(ROUTE_MODULE)) {
    if (pathname === route || pathname.startsWith(route + '/')) return mod;
  }
  return null;
}
