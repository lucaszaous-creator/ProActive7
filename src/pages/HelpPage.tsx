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
interface Metric {
  id: string;
  title: string;
  where: string;
  tagline: string;
  plain: string;
  calc?: string[];
  breakdown?: { label: string; points: number; desc: string }[];
  breakdownTitle?: string;
  breakdownUnit?: string;
  example?: { scenario: string; result: string };
  howToRead?: string[];
  whyMatters?: string;
}
interface Methodology {
  title: string;
  intro: string;
  metrics: Metric[];
}

const ROLES = (help.roles as Role[]) ?? [];
const METHODOLOGY = (help as { methodology?: Methodology }).methodology ?? null;

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

      {!q && METHODOLOGY ? <MethodologySection meth={METHODOLOGY} /> : null}
    </div>
  );
}

/**
 * Seção "Como medimos a saúde da cozinha" — mesma fonte do PDF.
 * Material de ensino/venda: a nutri pode abrir e explicar ao cliente
 * como cada score é calculado, sem jargão técnico.
 */
function MethodologySection({ meth }: { meth: Methodology }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section className="mt-10">
      <div className="mb-4 rounded-2xl bg-neutral-800 p-5 text-white dark:bg-neutral-900">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-100">
          <BarChart3 size={14} />
          Parte especial
        </div>
        <h2 className="mt-1 text-lg font-semibold sm:text-xl">{meth.title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-emerald-50">
          {meth.intro}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {meth.metrics.map((m) => {
          const isOpen = open === m.id;
          return (
            <Card key={m.id}>
              <button
                onClick={() => setOpen(isOpen ? null : m.id)}
                className="flex w-full items-start justify-between gap-3 text-left"
              >
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                    {m.title}
                  </h3>
                  <p className="text-xs italic text-emerald-700 dark:text-emerald-400">
                    {m.tagline}
                  </p>
                  <p className="mt-0.5 text-[11px] text-neutral-400">
                    Onde aparece: {m.where}
                  </p>
                </div>
                <ArrowRight
                  size={16}
                  className={`mt-1 shrink-0 text-neutral-400 transition-transform ${
                    isOpen ? 'rotate-90' : ''
                  }`}
                />
              </button>

              {isOpen ? (
                <div className="mt-3 space-y-3">
                  <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
                    {m.plain}
                  </p>

                  {m.calc?.length ? (
                    <div>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                        Como é calculado
                      </p>
                      <ul className="space-y-1.5">
                        {m.calc.map((c, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300"
                          >
                            <CheckCircle2
                              size={14}
                              className="mt-0.5 shrink-0 text-emerald-500"
                            />
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {m.breakdown?.length ? (
                    (() => {
                      const max = Math.max(...m.breakdown.map((p) => p.points));
                      const sum = m.breakdown.reduce((s, p) => s + p.points, 0);
                      const unit = m.breakdownUnit ?? (sum === 100 ? 'pts' : 'itens');
                      const defaultTitle =
                        sum === 100
                          ? 'As sete frentes (total 100 pontos)'
                          : 'Distribuição';
                      return (
                        <div>
                          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                            {m.breakdownTitle ?? defaultTitle}
                          </p>
                          <div className="space-y-1.5">
                            {m.breakdown.map((p) => (
                              <div
                                key={p.label}
                                className="flex items-center gap-2"
                              >
                                <span className="w-28 shrink-0 text-xs font-medium text-neutral-700 dark:text-neutral-300">
                                  {p.label}
                                </span>
                                <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                                  <div
                                    className="h-full rounded-full bg-emerald-500"
                                    style={{
                                      width: `${(p.points / max) * 100}%`,
                                    }}
                                  />
                                </div>
                                <span className="w-16 shrink-0 text-right text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                  {p.points} {unit}
                                </span>
                              </div>
                            ))}
                          </div>
                          <ul className="mt-2 space-y-0.5">
                            {m.breakdown.map((p) => (
                              <li
                                key={`d-${p.label}`}
                                className="text-[11px] leading-snug text-neutral-500 dark:text-neutral-400"
                              >
                                <span className="font-medium text-neutral-700 dark:text-neutral-300">
                                  {p.label}:
                                </span>{' '}
                                {p.desc}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })()
                  ) : null}

                  {m.example ? (
                    <div className="rounded-lg border-l-4 border-amber-400 bg-amber-50 p-3 dark:bg-amber-950/40">
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400">
                        Exemplo prático
                      </p>
                      <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
                        <span className="font-medium">Cenário:</span>{' '}
                        {m.example.scenario}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-amber-800 dark:text-amber-300">
                        Resultado: {m.example.result}
                      </p>
                    </div>
                  ) : null}

                  {m.howToRead?.length ? (
                    <div>
                      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                        Como ler o resultado
                      </p>
                      <ul className="space-y-1">
                        {m.howToRead.map((t, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300"
                          >
                            <span
                              className={`mt-1 h-3 w-3 shrink-0 rounded-sm ${
                                ['bg-emerald-500', 'bg-amber-500', 'bg-red-500'][
                                  i
                                ] ?? 'bg-neutral-400'
                              }`}
                            />
                            <span>{t}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {m.whyMatters ? (
                    <div className="flex items-start gap-2 rounded-lg border-l-4 border-emerald-500 bg-emerald-50 p-3 dark:bg-emerald-950/50">
                      <Lightbulb
                        size={15}
                        className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                      />
                      <p className="text-xs italic leading-relaxed text-neutral-700 dark:text-neutral-300">
                        <span className="font-semibold not-italic">
                          Por que isso importa:{' '}
                        </span>
                        {m.whyMatters}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>
    </section>
  );
}
