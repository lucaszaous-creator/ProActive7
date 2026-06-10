import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  GraduationCap,
  Crosshair,
  Package,
  Printer,
  Images,
  Activity,
  Building2,
  Trash2,
  Users,
  LogOut,
  Menu,
  X,
  Thermometer,
  ClipboardCheck,
  BarChart3,
  ChefHat,
  FileText,
  Newspaper,
  ShieldCheck,
  AlertOctagon,
  HardHat,
  CalendarRange,
  Bug,
  Network,
  LineChart,
  Megaphone,
  BookOpen,
  PackagePlus,
  Truck,
  Boxes,
  CalendarClock,
  ShieldAlert,
  Tag,
  ChevronRight,
  Briefcase,
  Stethoscope,
  Settings,
  Gauge,
  CreditCard,
  LifeBuoy,
  LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { moduleForPath } from '@/lib/modules';
import { SubscriptionGate } from './SubscriptionGate';
import { RouteFade } from './RouteFade';
import { AnnouncementBanner } from './AnnouncementBanner';
import { PwaInstallButton } from './PwaInstallButton';
import { PushToggle } from './PushToggle';
import { ThemeToggle } from './ThemeToggle';
import { LangToggle } from './LangToggle';

type NavItemDef = {
  kind: 'item';
  to: string;
  labelKey: string;
  icon: LucideIcon;
};

type NavGroupDef = {
  kind: 'group';
  labelKey: string;
  icon: LucideIcon;
  defaultOpen?: boolean;
  children: NavItemDef[];
};

type NavNode = NavItemDef | NavGroupDef;

const ITEM = {
  inicio: {
    kind: 'item',
    to: '/painel',
    labelKey: 'nav.start',
    icon: LayoutDashboard,
  } as NavItemDef,
  carteira: {
    kind: 'item',
    to: '/painel',
    labelKey: 'nav.carteira',
    icon: Briefcase,
  } as NavItemDef,
  imprimir: {
    kind: 'item',
    to: '/imprimir/novo',
    labelKey: 'nav.printLabel',
    icon: Printer,
  } as NavItemDef,
  validades: {
    kind: 'item',
    to: '/validades',
    labelKey: 'nav.validades',
    icon: CalendarClock,
  } as NavItemDef,
  producao: {
    kind: 'item',
    to: '/producao',
    labelKey: 'nav.producao',
    icon: ChefHat,
  } as NavItemDef,
  contagem: {
    kind: 'item',
    to: '/contagem',
    labelKey: 'nav.contagem',
    icon: BarChart3,
  } as NavItemDef,
  controlados: {
    kind: 'item',
    to: '/controlados',
    labelKey: 'nav.controlados',
    icon: ShieldAlert,
  } as NavItemDef,
  recebimentos: {
    kind: 'item',
    to: '/recebimentos',
    labelKey: 'nav.receivings',
    icon: PackagePlus,
  } as NavItemDef,
  rastreabilidade: {
    kind: 'item',
    to: '/rastreabilidade',
    labelKey: 'nav.traceability',
    icon: Crosshair,
  } as NavItemDef,
  dossie: {
    kind: 'item',
    to: '/dossie',
    labelKey: 'nav.dossier',
    icon: FileText,
  } as NavItemDef,
  estoque: {
    kind: 'item',
    to: '/estoque',
    labelKey: 'nav.stock',
    icon: Boxes,
  } as NavItemDef,
  relatorios: {
    kind: 'item',
    to: '/relatorios',
    labelKey: 'nav.reports',
    icon: BarChart3,
  } as NavItemDef,
  // Alias visual: o mesmo /relatorios é exibido como "Identificação de
  // alimentos" no menu da nutri (sob Cadastros), porque o conteúdo é o
  // resumo das etiquetas (produto/categoria/condição) — informação que
  // a RT usa pra checar consistência do cadastro de produtos.
  identificacao: {
    kind: 'item',
    to: '/relatorios',
    labelKey: 'nav.foodIdentification',
    icon: Tag,
  } as NavItemDef,
  produtos: {
    kind: 'item',
    to: '/produtos',
    labelKey: 'nav.products',
    icon: Package,
  } as NavItemDef,
  grupos: {
    kind: 'item',
    to: '/cadastros/grupos',
    labelKey: 'nav.groups',
    icon: Tag,
  } as NavItemDef,
  funcionarios: {
    kind: 'item',
    to: '/manipuladores',
    labelKey: 'nav.funcionarios',
    icon: HardHat,
  } as NavItemDef,
  manipuladores: {
    kind: 'item',
    to: '/manipuladores',
    labelKey: 'nav.manipulators',
    icon: HardHat,
  } as NavItemDef,
  fornecedores: {
    kind: 'item',
    to: '/fornecedores',
    labelKey: 'nav.suppliers',
    icon: Truck,
  } as NavItemDef,
  visitas: {
    kind: 'item',
    to: '/visitas',
    labelKey: 'nav.audits',
    icon: ShieldCheck,
  } as NavItemDef,
  ncs: {
    kind: 'item',
    to: '/nao-conformidades',
    labelKey: 'nav.nonConformities',
    icon: AlertOctagon,
  } as NavItemDef,
  checklists: {
    kind: 'item',
    to: '/checklists',
    labelKey: 'nav.checklists',
    icon: ClipboardCheck,
  } as NavItemDef,
  temperatura: {
    kind: 'item',
    to: '/temperatura',
    labelKey: 'nav.temperature',
    icon: Thermometer,
  } as NavItemDef,
  pragas: {
    kind: 'item',
    to: '/controle-pragas',
    labelKey: 'nav.pestControl',
    icon: Bug,
  } as NavItemDef,
  documentos: {
    kind: 'item',
    to: '/documentos',
    labelKey: 'nav.documents',
    icon: FileText,
  } as NavItemDef,
  fotos: {
    kind: 'item',
    to: '/fotos',
    labelKey: 'nav.photos',
    icon: Images,
  } as NavItemDef,
  agenda: {
    kind: 'item',
    to: '/agenda',
    labelKey: 'nav.agenda',
    icon: CalendarRange,
  } as NavItemDef,
  empresas: {
    kind: 'item',
    to: '/admin/empresas',
    labelKey: 'nav.companies',
    icon: Building2,
  } as NavItemDef,
  usuarios: {
    kind: 'item',
    to: '/admin/usuarios',
    labelKey: 'nav.users',
    icon: Users,
  } as NavItemDef,
  hardware: {
    kind: 'item',
    to: '/admin/hardware',
    labelKey: 'nav.hardware',
    icon: Printer,
  } as NavItemDef,
  impressoras: {
    kind: 'item',
    to: '/admin/impressoras',
    labelKey: 'nav.printers',
    icon: Printer,
  } as NavItemDef,
  trilha: {
    kind: 'item',
    to: '/admin/trilha',
    labelKey: 'nav.auditLog',
    icon: Activity,
  } as NavItemDef,
  lixeira: {
    kind: 'item',
    to: '/admin/lixeira',
    labelKey: 'nav.trash',
    icon: Trash2,
  } as NavItemDef,
  platformControl: {
    kind: 'item',
    to: '/platform/centro',
    labelKey: 'nav.platformControl',
    icon: Gauge,
  } as NavItemDef,
  platformDash: {
    kind: 'item',
    to: '/platform/dashboard',
    labelKey: 'nav.platformDashboard',
    icon: LineChart,
  } as NavItemDef,
  orgs: {
    kind: 'item',
    to: '/platform/organizacoes',
    labelKey: 'nav.organizations',
    icon: Network,
  } as NavItemDef,
  biblioteca: {
    kind: 'item',
    to: '/platform/biblioteca',
    labelKey: 'nav.library',
    icon: BookOpen,
  } as NavItemDef,
  comunicados: {
    kind: 'item',
    to: '/platform/comunicados',
    labelKey: 'nav.announcements',
    icon: Megaphone,
  } as NavItemDef,
  planos: {
    kind: 'item',
    to: '/platform/planos',
    labelKey: 'nav.plans',
    icon: CreditCard,
  } as NavItemDef,
  siteCursos: {
    kind: 'item',
    to: '/platform/cursos',
    labelKey: 'nav.siteCourses',
    icon: GraduationCap,
  } as NavItemDef,
  siteClientes: {
    kind: 'item',
    to: '/platform/clientes',
    labelKey: 'nav.siteClients',
    icon: Building2,
  } as NavItemDef,
  assinatura: {
    kind: 'item',
    to: '/admin/assinatura',
    labelKey: 'nav.subscription',
    icon: CreditCard,
  } as NavItemDef,
  artigos: {
    kind: 'item',
    to: '/admin/novidades',
    labelKey: 'nav.siteArticles',
    icon: Newspaper,
  } as NavItemDef,
  ajuda: {
    kind: 'item',
    to: '/ajuda',
    labelKey: 'nav.help',
    icon: LifeBuoy,
  } as NavItemDef,
};

// Reorganização por fluxo de trabalho (mantendo as regras de
// visibilidade da Ariane): Início no topo, grupos por etapa da operação,
// Ajuda no fim. Cozinha NÃO vê Funcionários (cadastro é da RT) nem Agenda.
const NAV_PROPERTY: NavNode[] = [
  ITEM.inicio,
  {
    kind: 'group',
    labelKey: 'nav.gEtiquetas',
    icon: Printer,
    defaultOpen: true,
    children: [
      ITEM.imprimir,
      ITEM.validades,
      ITEM.producao,
      ITEM.contagem,
      ITEM.relatorios,
    ],
  },
  {
    kind: 'group',
    labelKey: 'nav.gEstoque',
    icon: Boxes,
    defaultOpen: false,
    children: [
      ITEM.recebimentos,
      ITEM.controlados,
      ITEM.estoque,
      ITEM.rastreabilidade,
    ],
  },
  {
    kind: 'group',
    labelKey: 'nav.cadastros',
    icon: Package,
    defaultOpen: false,
    // Property NÃO vê "Funcionários/Manipuladores" aqui — esse cadastro é
    // de responsabilidade da nutri (RT), que mantém ASO/treinamento.
    children: [
      ITEM.produtos,
      ITEM.grupos,
      ITEM.fornecedores,
      ITEM.impressoras,
    ],
  },
  {
    kind: 'group',
    labelKey: 'nav.conformidade',
    icon: ShieldCheck,
    defaultOpen: false,
    // Sem ITEM.agenda — agenda é da nutri (planejamento de visitas).
    children: [
      ITEM.visitas,
      ITEM.ncs,
      ITEM.checklists,
      ITEM.temperatura,
      ITEM.pragas,
      ITEM.documentos,
      ITEM.fotos,
      ITEM.dossie,
    ],
  },
  ITEM.ajuda,
];

// Gerente da empresa: o mesmo menu da cozinha + cadastro de
// "Funcionários" (manipuladores) e gestão de usuários da empresa.
// NÃO vê empresas/organizações nem rotinas técnicas da nutri (visitas
// de avaliação ficam com a RT).
const NAV_PROPERTY_MANAGER: NavNode[] = [
  ITEM.inicio,
  {
    kind: 'group',
    labelKey: 'nav.gEtiquetas',
    icon: Printer,
    defaultOpen: true,
    children: [
      ITEM.imprimir,
      ITEM.validades,
      ITEM.producao,
      ITEM.contagem,
      ITEM.relatorios,
    ],
  },
  {
    kind: 'group',
    labelKey: 'nav.gEstoque',
    icon: Boxes,
    defaultOpen: false,
    children: [
      ITEM.recebimentos,
      ITEM.controlados,
      ITEM.estoque,
      ITEM.rastreabilidade,
    ],
  },
  {
    kind: 'group',
    labelKey: 'nav.cadastros',
    icon: Package,
    defaultOpen: false,
    children: [
      ITEM.produtos,
      ITEM.grupos,
      ITEM.funcionarios,
      ITEM.fornecedores,
      ITEM.impressoras,
    ],
  },
  {
    kind: 'group',
    labelKey: 'nav.conformidade',
    icon: ShieldCheck,
    defaultOpen: false,
    children: [
      ITEM.visitas,
      ITEM.ncs,
      ITEM.checklists,
      ITEM.temperatura,
      ITEM.pragas,
      ITEM.documentos,
      ITEM.fotos,
      ITEM.dossie,
    ],
  },
  {
    kind: 'group',
    labelKey: 'nav.administracao',
    icon: Settings,
    defaultOpen: false,
    children: [ITEM.usuarios],
  },
  ITEM.ajuda,
];

const NAV_NUTRITIONIST: NavNode[] = [
  ITEM.carteira,
  {
    kind: 'group',
    labelKey: 'nav.avaliacao',
    icon: Stethoscope,
    defaultOpen: true,
    children: [ITEM.visitas, ITEM.ncs, ITEM.checklists, ITEM.manipuladores],
  },
  {
    kind: 'group',
    labelKey: 'nav.acompanhamento',
    icon: ClipboardCheck,
    defaultOpen: false,
    // Saiu "Relatórios" daqui — virou "Identificação de alimentos" sob
    // Cadastros (pedido da cliente). Fotos foi incluído aqui a pedido da
    // RT — ela precisa ver/baixar fotos das visitas.
    children: [
      ITEM.temperatura,
      ITEM.pragas,
      ITEM.documentos,
      ITEM.fotos,
      ITEM.agenda,
    ],
  },
  {
    kind: 'group',
    labelKey: 'nav.cadastros',
    icon: Package,
    defaultOpen: true,
    children: [
      ITEM.produtos,
      ITEM.grupos,
      ITEM.fornecedores,
      ITEM.identificacao,
    ],
  },
  {
    kind: 'group',
    labelKey: 'nav.administracao',
    icon: Settings,
    defaultOpen: false,
    // "Artigos do site" só para platform_admin (decisão de produto).
    children: [
      ITEM.empresas,
      ITEM.usuarios,
      ITEM.assinatura,
      ITEM.impressoras,
      ITEM.hardware,
    ],
  },
  ITEM.ajuda,
];

const NAV_PLATFORM_ADMIN: NavNode[] = [
  {
    kind: 'group',
    labelKey: 'nav.plataforma',
    icon: Network,
    defaultOpen: true,
    children: [
      ITEM.platformControl,
      ITEM.platformDash,
      ITEM.orgs,
      ITEM.planos,
    ],
  },
  {
    kind: 'group',
    labelKey: 'nav.gConteudoSite',
    icon: Newspaper,
    defaultOpen: false,
    children: [
      ITEM.siteCursos,
      ITEM.siteClientes,
      ITEM.artigos,
      ITEM.biblioteca,
      ITEM.comunicados,
    ],
  },
  {
    kind: 'group',
    labelKey: 'nav.operacao',
    icon: Briefcase,
    defaultOpen: false,
    children: [
      ITEM.inicio,
      ITEM.imprimir,
      ITEM.validades,
      ITEM.producao,
      ITEM.contagem,
      ITEM.controlados,
      ITEM.recebimentos,
      ITEM.rastreabilidade,
      ITEM.estoque,
      ITEM.relatorios,
    ],
  },
  {
    kind: 'group',
    labelKey: 'nav.conformidade',
    icon: ShieldCheck,
    defaultOpen: false,
    children: [
      ITEM.visitas,
      ITEM.ncs,
      ITEM.checklists,
      ITEM.temperatura,
      ITEM.pragas,
      ITEM.documentos,
      ITEM.fotos,
      ITEM.agenda,
      ITEM.dossie,
    ],
  },
  {
    kind: 'group',
    labelKey: 'nav.cadastros',
    icon: Package,
    defaultOpen: true,
    children: [
      ITEM.produtos,
      ITEM.grupos,
      ITEM.manipuladores,
      ITEM.fornecedores,
    ],
  },
  {
    kind: 'group',
    labelKey: 'nav.administracao',
    icon: Settings,
    defaultOpen: false,
    children: [ITEM.empresas, ITEM.usuarios, ITEM.impressoras, ITEM.hardware],
  },
  {
    kind: 'group',
    labelKey: 'nav.gSistema',
    icon: Activity,
    defaultOpen: false,
    children: [ITEM.trilha, ITEM.lixeira],
  },
  ITEM.ajuda,
];

function NavItem({ item, onClick }: { item: NavItemDef; onClick: () => void }) {
  const { t } = useTranslation();
  const { to, labelKey, icon: Icon } = item;
  return (
    <NavLink
      to={to}
      onClick={onClick}
      end={to === '/'}
      className={({ isActive }) =>
        `fx-accent fx-press flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-neutral-900 text-white shadow-sm dark:bg-neutral-100 dark:text-neutral-900'
            : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'
        }`
      }
    >
      <Icon size={18} />
      {t(labelKey)}
    </NavLink>
  );
}

function NavGroup({
  group,
  onItemClick,
  forceOpen,
}: {
  group: NavGroupDef;
  onItemClick: () => void;
  forceOpen: boolean;
}) {
  const { t } = useTranslation();
  const storageKey = `nav.${group.labelKey}.open`;
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return group.defaultOpen ?? false;
    const stored = window.localStorage.getItem(storageKey);
    if (stored === '1') return true;
    if (stored === '0') return false;
    return group.defaultOpen ?? false;
  });

  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);

  function toggle() {
    const next = !open;
    setOpen(next);
    try {
      window.localStorage.setItem(storageKey, next ? '1' : '0');
    } catch {
      /* noop */
    }
  }

  const Icon = group.icon;
  return (
    <div>
      <button
        onClick={toggle}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
        aria-expanded={open}
      >
        <Icon size={18} />
        <span className="flex-1 text-left">{t(group.labelKey)}</span>
        <ChevronRight
          size={14}
          className={`transition-transform ${open ? 'rotate-90' : ''}`}
        />
      </button>
      {open && (
        <div className="ml-4 mt-1 border-l border-neutral-200 pl-2 dark:border-neutral-800">
          {group.children.map((child) => (
            <NavItem
              key={child.to + child.labelKey}
              item={child}
              onClick={onItemClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Remove do menu os itens cujo módulo não está liberado no plano da org.
// (hasModule já devolve true para platform_admin, então é no-op pra ele.)
function filterTreeByModules(
  tree: NavNode[],
  hasModule: (key: string) => boolean,
): NavNode[] {
  const keep = (item: NavItemDef) => {
    const mod = moduleForPath(item.to);
    return !mod || hasModule(mod);
  };
  return tree
    .map((node) =>
      node.kind === 'item'
        ? node
        : { ...node, children: node.children.filter(keep) },
    )
    .filter((node) =>
      node.kind === 'item' ? keep(node) : node.children.length > 0,
    );
}

function useActiveTree(): NavNode[] {
  const { isPlatformAdmin, isNutritionist, isPropertyManager, hasModule } =
    useAuth();
  const base = isPlatformAdmin
    ? NAV_PLATFORM_ADMIN
    : isNutritionist
      ? NAV_NUTRITIONIST
      : isPropertyManager
        ? NAV_PROPERTY_MANAGER
        : NAV_PROPERTY;
  return filterTreeByModules(base, hasModule);
}

export function Layout() {
  const {
    profile,
    isPlatformAdmin,
    isNutritionist,
    isPropertyManager,
    signOut,
  } = useAuth();
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const tree = useActiveTree();
  const location = useLocation();

  function closeMobile() {
    setMobileOpen(false);
  }

  return (
    <div className="relative flex min-h-screen w-full overflow-x-hidden bg-slate-50 dark:bg-neutral-950">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={closeMobile}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 transform flex-col border-r border-neutral-200 bg-white transition-transform dark:border-white/10 dark:bg-neutral-950 lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="group relative flex items-center justify-center border-b border-neutral-200 bg-white px-4 py-4 dark:border-white/10 dark:bg-neutral-950">
          {/* No dark, o logo (colorido) vive numa pílula branca compacta em
              vez de uma faixa branca inteira gritando no tema escuro. */}
          <span className="rounded-xl bg-white px-3 py-1.5 transition-transform duration-300 group-hover:scale-105">
            <img
              src="/proactive7-logo.svg"
              alt="ProActive7 — Boa alimentação, bem-estar e saúde!"
              className="h-12 w-auto max-w-full"
            />
          </span>
          <button
            onClick={closeMobile}
            aria-label="Fechar menu"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2.5 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 lg:hidden"
          >
            <X size={22} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {tree.map((node, idx) => {
            if (node.kind === 'item') {
              return <NavItem key={idx} item={node} onClick={closeMobile} />;
            }
            const groupHasActive = node.children.some(
              (c) => c.to === location.pathname,
            );
            return (
              <NavGroup
                key={idx}
                group={node}
                onItemClick={closeMobile}
                forceOpen={groupHasActive}
              />
            );
          })}
        </nav>

        <div className="border-t border-neutral-200 p-3 dark:border-neutral-800">
          <div className="mb-2 flex items-center gap-2.5 rounded-lg bg-neutral-50 px-2.5 py-2 dark:bg-neutral-800/60">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold uppercase text-white dark:bg-neutral-100 dark:text-neutral-900">
              {(profile?.full_name ?? profile?.email ?? '?')
                .trim()
                .charAt(0)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-200">
                {profile?.full_name ?? profile?.email}
              </p>
              <p className="truncate text-xs text-neutral-500 dark:text-neutral-500">
                {isPlatformAdmin
                  ? t('layout.master')
                  : isNutritionist
                    ? 'Nutricionista'
                    : isPropertyManager
                      ? t('layout.propertyManager')
                      : t('layout.property')}
              </p>
            </div>
          </div>
          <div className="space-y-1">
            <ThemeToggle />
            <LangToggle />
            <PushToggle />
            <PwaInstallButton />
            <button
              onClick={signOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            >
              <LogOut size={18} />
              {t('layout.signOut')}
            </button>
          </div>
        </div>
      </aside>

      <div className="relative flex min-w-0 w-full flex-1 flex-col">
        {/* Dark v2: halo de luz no topo do conteúdo — profundidade sutil
            no preto chapado, só no tema escuro. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 hidden h-72 bg-[radial-gradient(640px_220px_at_50%_-60px,rgba(255,255,255,0.07),transparent_70%)] dark:block"
        />
        <header className="sticky top-0 z-20 flex w-full items-center gap-3 border-b border-neutral-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-neutral-950/90 lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label={t('layout.openMenu')}
            className="rounded-lg p-2.5 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            <Menu size={22} />
          </button>
          <img
            src="/proactive7-logo.svg"
            alt="ProActive7"
            className="h-7 w-auto"
          />
        </header>

        <AnnouncementBanner />
        {/* A impressao agora e' feita pelo relay PowerShell instalado no PC
            (modo invisivel). O navegador so enfileira em print_jobs. */}

        <main className="w-full min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6">
          <div className="mx-auto w-full max-w-7xl">
            <SubscriptionGate>
              <RouteFade>
                <Outlet />
              </RouteFade>
            </SubscriptionGate>
          </div>
        </main>
      </div>
    </div>
  );
}
