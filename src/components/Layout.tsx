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
  X,
  Thermometer,
  ClipboardCheck,
  ClipboardList,
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
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { moduleForPath } from '@/lib/modules';
import { takeLoginPortal } from '@/lib/portals';
import { SubscriptionGate } from './SubscriptionGate';
import { RouteFade } from './RouteFade';
import { AnnouncementBanner } from './AnnouncementBanner';
import { OfflineIndicator } from './OfflineIndicator';
import { BottomNav } from './BottomNav';
import { PwaInstallButton } from './PwaInstallButton';
import { PushToggle } from './PushToggle';
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
  fornecedores: {
    kind: 'item',
    to: '/fornecedores',
    labelKey: 'nav.suppliers',
    icon: Truck,
  } as NavItemDef,
  novaVistoria: {
    kind: 'item',
    to: '/vistorias/nova',
    labelKey: 'nav.newInspection',
    icon: ClipboardCheck,
  } as NavItemDef,
  fichas: {
    kind: 'item',
    to: '/fichas',
    labelKey: 'nav.recipes',
    icon: ChefHat,
  } as NavItemDef,
  visitas: {
    kind: 'item',
    to: '/visitas',
    labelKey: 'nav.audits',
    icon: ShieldCheck,
  } as NavItemDef,
  modelosVisita: {
    kind: 'item',
    to: '/visitas/modelos',
    labelKey: 'nav.auditTemplates',
    icon: ClipboardList,
  } as NavItemDef,
  ncs: {
    kind: 'item',
    to: '/nao-conformidades',
    labelKey: 'nav.nonConformities',
    icon: AlertOctagon,
  } as NavItemDef,
  modelosNc: {
    kind: 'item',
    to: '/nao-conformidades/modelos',
    labelKey: 'nav.ncTemplates',
    icon: ClipboardList,
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
    children: [ITEM.produtos, ITEM.grupos, ITEM.fornecedores, ITEM.impressoras],
  },
  // Sem grupo "Conformidade" (decisão da Ariane, split cliente ×
  // nutricionista): visitas, NCs, checklists, temperatura, pragas,
  // documentos, fotos e dossiê são o sistema da nutri. As rotas seguem
  // acessíveis por link direto se a operação precisar.
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
  // Sem grupo "Conformidade" aqui também — ver comentário no NAV_PROPERTY.
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
  // Agenda no topo, fora de grupo: é a primeira tela que a RT abre no dia.
  // Estava enterrada num grupo fechado junto com temperatura e pragas.
  ITEM.agenda,
  {
    kind: 'group',
    labelKey: 'nav.avaliacao',
    icon: Stethoscope,
    defaultOpen: true,
    // Só trabalho de campo, na ordem em que acontece: vou avaliar, vejo o
    // que já avaliei, trato o que reprovou. Os modelos saíram daqui — quem
    // está na cozinha não configura modelo, e a mistura fazia "Vistoria" e
    // "Modelos de vistoria" parecerem dois caminhos para a mesma coisa.
    children: [ITEM.novaVistoria, ITEM.visitas, ITEM.ncs],
  },
  {
    kind: 'group',
    labelKey: 'nav.acompanhamento',
    icon: ClipboardCheck,
    defaultOpen: false,
    // O que a RT acompanha entre uma visita e outra. Funcionários entra
    // aqui (e não em avaliação) porque o que ela acompanha é ASO e
    // treinamento vencendo. Fotos a pedido da RT: ela baixa as evidências.
    // Fichas técnicas saiu do menu (decisão da Ariane): a rota /fichas
    // segue acessível por link direto, como produtos e grupos depois do
    // split de portais. É lá que mora a tabela nutricional.
    children: [
      ITEM.funcionarios,
      ITEM.temperatura,
      ITEM.pragas,
      ITEM.documentos,
      ITEM.fotos,
    ],
  },
  {
    kind: 'group',
    labelKey: 'nav.gModelos',
    icon: ClipboardList,
    defaultOpen: false,
    // Tudo que é "montar antes" num lugar só. Antes os três modelos
    // estavam espalhados no meio da operação, e não havia resposta óbvia
    // para "onde eu configuro isso?".
    children: [ITEM.modelosVisita, ITEM.modelosNc, ITEM.checklists],
  },
  // Sem grupo "Cadastros" (decisão da Ariane, split cliente ×
  // nutricionista): produtos, grupos, fornecedores e identificação de
  // alimentos alimentam a etiqueta — são o sistema da empresa. As rotas
  // seguem acessíveis por link direto (a RLS ainda permite a RT editar
  // prazo de validade quando precisar).
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
    children: [ITEM.platformControl, ITEM.platformDash, ITEM.orgs, ITEM.planos],
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
      ITEM.modelosVisita,
      ITEM.ncs,
      ITEM.modelosNc,
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
      ITEM.funcionarios,
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
            ? 'bg-neutral-900 text-white shadow-sm'
            : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
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
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
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
        <div className="ml-4 mt-1 border-l border-neutral-200 pl-2">
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

  // Aviso de "portal trocado" do login (/login/cliente × /login/nutricionista):
  // o LoginPage desmonta antes do profile carregar, então quem compara o
  // portal escolhido com o role real é o Layout — que só monta logado.
  useEffect(() => {
    if (!profile) return;
    const portal = takeLoginPortal();
    if (!portal || isPlatformAdmin) return;
    if (portal === 'cliente' && isNutritionist) {
      toast.info(
        'Seu acesso é de nutricionista — abrindo o sistema da nutricionista.',
      );
    } else if (portal === 'nutricionista' && !isNutritionist) {
      toast.info('Seu acesso é da empresa — abrindo o programa de etiquetas.');
    }
  }, [profile, isNutritionist, isPlatformAdmin]);

  function closeMobile() {
    setMobileOpen(false);
  }

  return (
    <div className="relative flex min-h-screen w-full overflow-x-hidden bg-slate-50">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={closeMobile}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 transform flex-col border-r border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] transition-transform lg:static lg:translate-x-0 lg:pt-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="group relative flex items-center justify-center border-b border-neutral-200 bg-white px-4 py-4">
          {/* No dark, o logo (colorido) vive numa pílula branca compacta em
              vez de uma faixa branca inteira gritando no tema escuro. */}
          <span className="rounded-xl bg-white px-3 py-1.5 transition-transform duration-300 group-hover:scale-105">
            <img
              src="/proactive7-wordmark.png"
              alt="ProActive7 — Boa alimentação, bem-estar e saúde!"
              className="h-12 w-auto max-w-full"
            />
          </span>
          <button
            onClick={closeMobile}
            aria-label="Fechar menu"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2.5 text-neutral-500 hover:bg-neutral-100 lg:hidden"
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

        <div className="border-t border-neutral-200 p-3">
          <div className="mb-2 flex items-center gap-2.5 rounded-lg bg-neutral-50 px-2.5 py-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold uppercase text-white">
              {(profile?.full_name ?? profile?.email ?? '?').trim().charAt(0)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-neutral-800">
                {profile?.full_name ?? profile?.email}
              </p>
              <p className="truncate text-xs text-neutral-500">
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
            <LangToggle />
            <PushToggle />
            <PwaInstallButton />
            <button
              onClick={signOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
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
          className="pointer-events-none absolute inset-x-0 top-0 hidden h-72 bg-[radial-gradient(640px_220px_at_50%_-60px,rgba(255,255,255,0.07),transparent_70%)]"
        />
        {/* pt calculado em vez de py-3: no iPhone instalado o cabeçalho
            precisa somar a altura do notch, senão o botão do menu fica
            embaixo do relógio do sistema. */}
        {/* Só a marca. O hambúrguer saiu: o menu completo agora abre pelo
            "Mais" da barra inferior, e ter dois caminhos para a mesma
            gaveta era exatamente a complicação a menos que queríamos. */}
        <header className="sticky top-0 z-20 flex w-full items-center gap-3 border-b border-neutral-200 bg-white/90 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur lg:hidden">
          <img
            src="/proactive7-wordmark.png"
            alt="ProActive7"
            className="h-7 w-auto"
          />
        </header>

        <OfflineIndicator />
        <AnnouncementBanner />
        {/* A impressao agora e' feita pelo relay PowerShell instalado no PC
            (modo invisivel). O navegador so enfileira em print_jobs. */}

        {/* pb somado à barra de gestos do iPhone: sem isso o último botão
            da página fica atrás dela e não dá para clicar. */}
        {/* pb grande no celular: a barra inferior é fixa e cobriria o
            último botão da página. No desktop ela não existe. */}
        <main className="w-full min-w-0 flex-1 overflow-x-hidden px-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-6 lg:pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <div className="mx-auto w-full max-w-7xl">
            <SubscriptionGate>
              <RouteFade>
                <Outlet />
              </RouteFade>
            </SubscriptionGate>
          </div>
        </main>
      </div>

      <BottomNav onMore={() => setMobileOpen(true)} />
    </div>
  );
}
