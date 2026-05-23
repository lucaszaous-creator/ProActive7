import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Printer,
  Images,
  Building2,
  Users,
  LogOut,
  Menu,
  Tag,
  Thermometer,
  ClipboardCheck,
  BarChart3,
  ChefHat,
  FileText,
  ShieldCheck,
  AlertOctagon,
  HardHat,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { PwaInstallButton } from './PwaInstallButton';
import { PushToggle } from './PushToggle';
import { ThemeToggle } from './ThemeToggle';
import { LangToggle } from './LangToggle';

interface NavItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  masterOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/produtos', labelKey: 'nav.products', icon: Package },
  { to: '/imprimir', labelKey: 'nav.printLabel', icon: Printer },
  { to: '/fotos', labelKey: 'nav.photos', icon: Images },
  { to: '/temperatura', labelKey: 'nav.temperature', icon: Thermometer },
  { to: '/checklists', labelKey: 'nav.checklists', icon: ClipboardCheck },
  { to: '/fichas-tecnicas', labelKey: 'nav.recipes', icon: ChefHat },
  { to: '/documentos', labelKey: 'nav.documents', icon: FileText },
  { to: '/visitas', labelKey: 'nav.audits', icon: ShieldCheck },
  {
    to: '/nao-conformidades',
    labelKey: 'nav.nonConformities',
    icon: AlertOctagon,
  },
  { to: '/manipuladores', labelKey: 'nav.manipulators', icon: HardHat },
  { to: '/relatorios', labelKey: 'nav.reports', icon: BarChart3 },
  {
    to: '/admin/empresas',
    labelKey: 'nav.companies',
    icon: Building2,
    masterOnly: true,
  },
  {
    to: '/admin/usuarios',
    labelKey: 'nav.users',
    icon: Users,
    masterOnly: true,
  },
];

export function Layout() {
  const { profile, isMaster, signOut } = useAuth();
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = NAV_ITEMS.filter((i) => !i.masterOnly || isMaster);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
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
        <div className="flex items-center gap-2 border-b border-neutral-200 px-5 py-4 dark:border-neutral-800">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Tag size={18} />
          </span>
          <span className="text-base font-semibold text-neutral-800 dark:text-neutral-100">
            Etiqueta
          </span>
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
              {isMaster ? t('layout.master') : t('layout.property')}
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

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-slate-900 lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label={t('layout.openMenu')}
            className="rounded-lg p-1.5 text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            <Menu size={22} />
          </button>
          <span className="text-base font-semibold text-neutral-800 dark:text-neutral-100">
            Etiqueta
          </span>
        </header>

        <main className="flex-1 overflow-x-clip p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
