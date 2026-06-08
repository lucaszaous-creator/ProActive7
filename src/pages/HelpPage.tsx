import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  ArrowRight,
  Lightbulb,
  CheckCircle2,
  LifeBuoy,
  // ícones referenciados pelo conteúdo (help-content.json → feature.icon)
  Briefcase,
  ShieldCheck,
  AlertOctagon,
  ClipboardCheck,
  HardHat,
  Thermometer,
  Bug,
  FolderOpen,
  Images,
  CalendarRange,
  Building2,
  Users,
  LayoutDashboard,
  Printer,
  CalendarClock,
  ChefHat,
  BarChart3,
  ShieldAlert,
  PackagePlus,
  Crosshair,
  Boxes,
  Package,
  Gauge,
  LineChart,
  Network,
  CreditCard,
  BookOpen,
  Megaphone,
  Activity,
  Trash2,
  Newspaper,
  Truck,
  Tag,
  History,
  FileText,
  type LucideIcon,
} from 'lucide-react';
import { usePageTitle } from '@/lib/usePageTitle';
import { useAuth } from '@/context/AuthContext';
import { Card } from '@/components/ui/Card';
import help from '@/content/help-content.json';

const ICONS: Record<string, LucideIcon> = {
  Briefcase,
  ShieldCheck,
  AlertOctagon,
  ClipboardCheck,
  HardHat,
  Thermometer,
  Bug,
  FolderOpen,
  Images,
  CalendarRange,
  Building2,
  Users,
  LayoutDashboard,
  Printer,
  CalendarClock,
  ChefHat,
  BarChart3,
  ShieldAlert,
  PackagePlus,
  Crosshair,
  Boxes,
  Package,
  Gauge,
  LineChart,
  Network,
  CreditCard,
  BookOpen,
  Megaphone,
  Activity,
  Trash2,
  Newspaper,
  Truck,
  Tag,
  History,
  FileText,
};

interface Feature {
  icon: string;
  title: string;
  subtitle: string;
  route: string;
  what: string;
  how: string[];
  tip: string;
}
interface Role {
  key: string;
  title: string;
  subtitle: string;
  who: string;
  capabilities: string[];
  features: Feature[];
}

const ROLES = (help.roles as Role[]) ?? [];

export function HelpPage() {
  usePageTitle('Ajuda');
  const { isPlatformAdmin, isNutritionist, isPropertyManager } = useAuth();

  // Qual conjunto de conteúdo mostrar conforme o papel.
  // - platform_admin: vê tudo (próprio papel + nutri + cozinha)
  // - nutricionista: conteúdo da nutri
  // - gerente / cozinha: conteúdo da cozinha
  const visibleRoles = useMemo(() => {
    const roleKeys = isPlatformAdmin
      ? ['platform_admin', 'nutri', 'property']
      : isNutritionist
        ? ['nutri']
        : isPropertyManager
          ? ['property']
          : ['property'];
    return ROLES.filter((r) => roleKeys.includes(r.key));
  }, [isPlatformAdmin, isNutritionist, isPropertyManager]);

  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  const q = search.trim().toLowerCase();
  const matches = (f: Feature) =>
    !q ||
    f.title.toLowerCase().includes(q) ||
    f.subtitle.toLowerCase().includes(q) ||
    f.what.toLowerCase().includes(q) ||
    f.how.some((h) => h.toLowerCase().includes(q));

  return (
    <div className="mx-auto max-w-5xl">
      {/* Cabeçalho */}
      <div className="mb-5 flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
          <LifeBuoy size={22} />
        </span>
        <div>
          <h1 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100 sm:text-2xl">
            Ajuda
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            O que cada função do sistema faz e como usar no dia a dia.
          </p>
        </div>
      </div>

      {/* Busca */}
      <div className="mb-5 flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-slate-900">
        <Search size={16} className="shrink-0 text-neutral-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar função (ex.: etiqueta, ASO, temperatura)..."
          className="min-w-0 flex-1 bg-transparent text-sm text-neutral-800 outline-none placeholder:text-neutral-400 dark:text-neutral-100"
        />
      </div>

      {visibleRoles.map((role) => {
        const feats = role.features.filter(matches);
        if (feats.length === 0) return null;
        return (
          <section key={role.key} className="mb-8">
            {visibleRoles.length > 1 ? (
              <div className="mb-3 border-l-4 border-emerald-500 pl-3">
                <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">
                  {role.title}
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {role.subtitle}
                </p>
              </div>
            ) : null}

            {/* Índice de funções (chips) */}
            {!q ? (
              <div className="mb-4 flex flex-wrap gap-2">
                {feats.map((f) => {
                  const Icon = ICONS[f.icon] ?? LayoutDashboard;
                  const id = `${role.key}-${f.title}`;
                  return (
                    <button
                      key={id}
                      onClick={() =>
                        setActiveId((cur) => (cur === id ? null : id))
                      }
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        activeId === id
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'border-neutral-200 text-neutral-600 hover:border-emerald-300 dark:border-neutral-800 dark:text-neutral-300'
                      }`}
                    >
                      <Icon size={13} />
                      {f.title}
                    </button>
                  );
                })}
              </div>
            ) : null}

            <div className="flex flex-col gap-3">
              {feats.map((f) => {
                const Icon = ICONS[f.icon] ?? LayoutDashboard;
                const id = `${role.key}-${f.title}`;
                const open = q ? true : activeId === null || activeId === id;
                return (
                  <Card key={id}>
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                        <Icon size={18} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                              {f.title}
                            </h3>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                              {f.subtitle}
                            </p>
                          </div>
                          <Link
                            to={f.route}
                            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          >
                            Abrir
                            <ArrowRight size={12} />
                          </Link>
                        </div>

                        {open ? (
                          <div className="mt-3 space-y-3">
                            <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                              {f.what}
                            </p>

                            <div>
                              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                                Como usar
                              </p>
                              <ul className="space-y-1.5">
                                {f.how.map((step, i) => (
                                  <li
                                    key={i}
                                    className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300"
                                  >
                                    <CheckCircle2
                                      size={14}
                                      className="mt-0.5 shrink-0 text-emerald-500"
                                    />
                                    <span>{step}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div className="flex items-start gap-2 rounded-lg border-l-4 border-emerald-500 bg-emerald-50 p-3 dark:bg-emerald-950/50">
                              <Lightbulb
                                size={15}
                                className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                              />
                              <p className="text-xs italic leading-relaxed text-neutral-700 dark:text-neutral-300">
                                {f.tip}
                              </p>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </section>
        );
      })}

      {q &&
      visibleRoles.every((r) => r.features.filter(matches).length === 0) ? (
        <Card>
          <p className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
            Nenhuma função encontrada para "{search}".
          </p>
        </Card>
      ) : null}
    </div>
  );
}
