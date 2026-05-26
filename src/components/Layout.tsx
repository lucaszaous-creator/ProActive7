import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
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
  LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
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
  inicio: { kind: 'item', to: '/painel', labelKey: 'nav.start', icon: LayoutDashboard } as NavItemDef,
  carteira: { kind: 'item', to: '/painel', labelKey: 'nav.carteira', icon: Briefcase } as NavItemDef,
  imprimir: { kind: 'item', to: '/imprimir', labelKey: 'nav.printLabel', icon: Printer } as NavItemDef,
  validades: { kind: 'item', to: '/validades', labelKey: 'nav.validades', icon: CalendarClock } as NavItemDef,
  producao: { kind: 'item', to: '/producao', labelKey: 'nav.producao', icon: ChefHat } as NavItemDef,
  contagem: { kind: 'item', to: '/contagem', labelKey: 'nav.contagem', icon: BarChart3 } as NavItemDef,
  controlados: { kind: 'item', to: '/controlados', labelKey: 'nav.controlados', icon: ShieldAlert } as NavItemDef,
  recebimentos: { kind: 'item', to: '/recebimentos', labelKey: 'nav.receivings', icon: PackagePlus } as NavItemDef,
  estoque: { kind: 'item', to: '/estoque', labelKey: 'nav.stock', icon: Boxes } as NavItemDef,
  relatorios: { kind: 'item', to: '/relatorios', labelKey: 'nav.reports', icon: BarChart3 } as NavItemDef,
  produtos: { kind: 'item', to: '/produtos', labelKey: 'nav.products', icon: Package } as NavItemDef,
  grupos: { kind: 'item', to: '/cadastros/grupos', labelKey: 'nav.groups', icon: Tag } as NavItemDef,
  funcionarios: { kind: 'item', to: '/manipuladores', labelKey: 'nav.funcionarios', icon: HardHat } as NavItemDef,
  manipuladores: { kind: 'item', to: '/manipuladores', labelKey: 'nav.manipulators', icon: HardHat } as NavItemDef,
  fornecedores: { kind: 'item', to: '/fornecedores', labelKey: 'nav.suppliers', icon: Truck } as NavItemDef,
  fichasTecnicas: { kind: 'item', to: '/fichas-tecnicas', labelKey: 'nav.recipes', icon: ChefHat } as NavItemDef,
  visitas: { kind: 'item', to: '/visitas', labelKey: 'nav.audits', icon: ShieldCheck } as NavItemDef,
  ncs: { kind: 'item', to: '/nao-conformidades', labelKey: 'nav.nonConformities', icon: AlertOctagon } as NavItemDef,
  checklists: { kind: 'item', to: '/checklists', labelKey: 'nav.checklists', icon: ClipboardCheck } as NavItemDef,
  temperatura: { kind: 'item', to: '/temperatura', labelKey: 'nav.temperature', icon: Thermometer } as NavItemDef,
  pragas: { kind: 'item', to: '/controle-pragas', labelKey: 'nav.pestControl', icon: Bug } as NavItemDef,
  documentos: { kind: 'item', to: '/documentos', labelKey: 'nav.documents', icon: FileText } as NavItemDef,
  fotos: { kind: 'item', to: '/fotos', labelKey: 'nav.photos', icon: Images } as NavItemDef,
  agenda: { kind: 'item', to: '/agenda', labelKey: 'nav.agenda', icon: CalendarRange } as NavItemDef,
  empresas: { kind: 'item', to: '/admin/empresas', labelKey: 'nav.companies', icon: Building2 } as NavItemDef,
  usuarios: { kind: 'item', to: '/admin/usuarios', labelKey: 'nav.users', icon: Users } as NavItemDef,
  hardware: { kind: 'item', to: '/admin/hardware', labelKey: 'nav.hardware', icon: Printer } as NavItemDef,
  trilha: { kind: 'item', to: '/admin/trilha', labelKey: 'nav.auditLog', icon: Activity } as NavItemDef,
  lixeira: { kind: 'item', to: '/admin/lixeira', labelKey: 'nav.trash', icon: Trash2 } as NavItemDef,
  platformDash: { kind: 'item', to: '/platform/dashboard', labelKey: 'nav.platformDashboard', icon: LineChart } as NavItemDef,
  orgs: { kind: 'item', to: '/platform/organizacoes', labelKey: 'nav.organizations', icon: Network } as NavItemDef,
  biblioteca: { kind: 'item', to: '/platform/biblioteca', labelKey: 'nav.library', icon: BookOpen } as NavItemDef,
  comunicados: { kind: 'item', to: '/platform/comunicados', labelKey: 'nav.announcements', icon: Megaphone } as NavItemDef,
};

const NAV_PROPERTY: NavNode[] = [
  ITEM.inicio,
  ITEM.imprimir,
  ITEM.validades,
  ITEM.producao,
  ITEM.contagem,
  ITEM.controlados,
  ITEM.recebimentos,
  ITEM.estoque,
  ITEM.relatorios,
  {
    kind: 'group',
    labelKey: 'nav.cadastros',
    icon: Package,
    defaultOpen: true,
    children: [ITEM.produtos, ITEM.grupos, ITEM.funcionarios, ITEM.fornecedores, ITEM.fichasTecnicas],
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
    ],
  },
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
    children: [
      ITEM.temperatura,
      ITEM.pragas,
      ITEM.documentos,
      ITEM.agenda,
      ITEM.relatorios,
    ],
  },
  {
    kind: 'group',
    labelKey: 'nav.cadastros',
    icon: Package,
    defaultOpen: false,
    children: [ITEM.produtos, ITEM.grupos, ITEM.fornecedores],
  },
  {
    kind: 'group',
    labelKey: 'nav.administracao',
    icon: Settings,
    defaultOpen: false,
    children: [ITEM.empresas, ITEM.usuarios, ITEM.hardware],
  },
];

const NAV_PLATFORM_ADMIN: NavNode[] = [
  {
    kind: 'group',
    labelKey: 'nav.plataforma',
    icon: Network,
    defaultOpen: true,
    children: [
      ITEM.platformDash,
      ITEM.orgs,
      ITEM.biblioteca,
      ITEM.comunicados,
      ITEM.trilha,
      ITEM.lixeira,
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
    ],
  },
  {
    kind: 'group',
    labelKey: 'nav.cadastros',
    icon: Package,
    defaultOpen: false,
    children: [ITEM.produtos, ITEM.grupos, ITEM.manipuladores, ITEM.fornecedores, ITEM.fichasTecnicas],
  },
  {
    kind: 'group',
    labelKey: 'nav.administracao',
    icon: Settings,
    defaultOpen: false,
    children: [ITEM.empresas, ITEM.usuarios, ITEM.hardware],
  },
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
        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          isActive
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
            : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
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
            <NavItem key={child.to + child.labelKey} item={child} onClick={onItemClick} />
          ))}
        </div>
      )}
    </div>
  );
}

function useActiveTree(): NavNode[] {
  const { isPlatformAdmin, isNutritionist } = useAuth();
  if (isPlatformAdmin) return NAV_PLATFORM_ADMIN;
  if (isNutritionist) return NAV_NUTRITIONIST;
  return NAV_PROPERTY;
}

export function Layout() {
  const { profile, isPlatformAdmin, isNutritionist, signOut } = useAuth();
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const tree = useActiveTree();
  const location = useLocation();

  function closeMobile() {
    setMobileOpen(false);
  }

  return (
    <div className="relative flex min-h-screen w-full overflow-x-hidden bg-slate-50 dark:bg-slate-950">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={closeMobile}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 transform flex-col border-r border-neutral-200 bg-white transition-transform dark:border-neutral-800 dark:bg-slate-900 lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="relative flex items-center justify-center border-b border-neutral-200 bg-white px-4 py-4 dark:border-neutral-800 dark:bg-white">
          <img
            src="/proactive7-logo.svg"
            alt="ProActive7 — Boa alimentação, bem-estar e saúde!"
            className="h-12 w-auto max-w-full"
          />
          <button
            onClick={closeMobile}
            aria-label="Fechar menu"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 lg:hidden"
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
          <div className="mb-2 px-2">
            <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-200">
              {profile?.full_name ?? profile?.email}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-500">
              {isPlatformAdmin
                ? t('layout.master')
                : isNutritionist
                  ? 'Nutricionista'
                  : t('layout.property')}
            </p>
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

      <div className="flex min-w-0 w-full flex-1 flex-col">
        <header className="flex w-full items-center gap-3 border-b border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-slate-900 lg:hidden">
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

        <main className="w-full min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
