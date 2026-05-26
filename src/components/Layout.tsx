import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
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
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { AnnouncementBanner } from './AnnouncementBanner';
import { PwaInstallButton } from './PwaInstallButton';
import { PushToggle } from './PushToggle';
import { ThemeToggle } from './ThemeToggle';
import { LangToggle } from './LangToggle';

interface NavItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  masterOnly?: boolean;
  nutritionistOrAdmin?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  // ---------- Operação diária ----------
  { to: '/painel', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/imprimir', labelKey: 'nav.printLabel', icon: Printer },
  { to: '/produtos', labelKey: 'nav.products', icon: Package },
  { to: '/manipuladores', labelKey: 'nav.manipulators', icon: HardHat },
  { to: '/fichas-tecnicas', labelKey: 'nav.recipes', icon: ChefHat },

  // ---------- Compliance / RDC ----------
  { to: '/visitas', labelKey: 'nav.audits', icon: ShieldCheck },
  {
    to: '/nao-conformidades',
    labelKey: 'nav.nonConformities',
    icon: AlertOctagon,
  },
  { to: '/checklists', labelKey: 'nav.checklists', icon: ClipboardCheck },
  { to: '/temperatura', labelKey: 'nav.temperature', icon: Thermometer },
  { to: '/controle-pragas', labelKey: 'nav.pestControl', icon: Bug },
  { to: '/documentos', labelKey: 'nav.documents', icon: FileText },
  { to: '/fotos', labelKey: 'nav.photos', icon: Images },
  { to: '/agenda', labelKey: 'nav.agenda', icon: CalendarRange },
  { to: '/relatorios', labelKey: 'nav.reports', icon: BarChart3 },

  // ---------- Admin da org (nutri + platform_admin) ----------
  {
    to: '/admin/empresas',
    labelKey: 'nav.companies',
    icon: Building2,
    nutritionistOrAdmin: true,
  },
  {
    to: '/admin/usuarios',
    labelKey: 'nav.users',
    icon: Users,
    nutritionistOrAdmin: true,
  },
  {
    to: '/admin/hardware',
    labelKey: 'nav.hardware',
    icon: Printer,
    nutritionistOrAdmin: true,
  },

  // ---------- Plataforma (apenas platform_admin) ----------
  {
    to: '/platform/dashboard',
    labelKey: 'nav.platformDashboard',
    icon: LineChart,
    masterOnly: true,
  },
  {
    to: '/platform/organizacoes',
    labelKey: 'nav.organizations',
    icon: Network,
    masterOnly: true,
  },
  {
    to: '/platform/biblioteca',
    labelKey: 'nav.library',
    icon: BookOpen,
    masterOnly: true,
  },
  {
    to: '/platform/comunicados',
    labelKey: 'nav.announcements',
    icon: Megaphone,
    masterOnly: true,
  },
  {
    to: '/admin/trilha',
    labelKey: 'nav.auditLog',
    icon: Activity,
    masterOnly: true,
  },
  {
    to: '/admin/lixeira',
    labelKey: 'nav.trash',
    icon: Trash2,
    masterOnly: true,
  },
];

export function Layout() {
  const { profile, isPlatformAdmin, isNutritionist, signOut } = useAuth();
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = NAV_ITEMS.filter(
    (i) =>
      (!i.masterOnly || isPlatformAdmin) &&
      (!i.nutritionistOrAdmin || isPlatformAdmin || isNutritionist),
  );

  return (
    <div className="relative flex min-h-screen w-full overflow-x-hidden bg-slate-50 dark:bg-slate-950">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
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
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 lg:hidden"
          >
            <X size={22} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map(({ to, labelKey, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setMobileOpen(false)}
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
          ))}
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
