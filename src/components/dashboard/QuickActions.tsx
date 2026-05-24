import { Link } from 'react-router-dom';
import {
  Printer,
  ClipboardCheck,
  Thermometer,
  AlertOctagon,
  CalendarPlus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface ActionProps {
  to: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  accent?: 'teal' | 'emerald' | 'amber' | 'red' | 'blue';
}

const ACCENT_BG: Record<NonNullable<ActionProps['accent']>, string> = {
  teal: 'bg-teal-50 text-teal-700 group-hover:bg-teal-100 dark:bg-teal-950 dark:text-teal-300 dark:group-hover:bg-teal-900',
  emerald:
    'bg-emerald-50 text-emerald-700 group-hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 dark:group-hover:bg-emerald-900',
  amber:
    'bg-amber-50 text-amber-700 group-hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300 dark:group-hover:bg-amber-900',
  red: 'bg-red-50 text-red-600 group-hover:bg-red-100 dark:bg-red-950 dark:text-red-300 dark:group-hover:bg-red-900',
  blue: 'bg-blue-50 text-blue-700 group-hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:group-hover:bg-blue-900',
};

function ActionTile({
  to,
  icon: Icon,
  title,
  subtitle,
  accent = 'teal',
}: ActionProps) {
  return (
    <Link
      to={to}
      className="group flex min-h-[88px] flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-3 transition hover:border-teal-300 hover:shadow-sm dark:border-neutral-800 dark:bg-slate-900 dark:hover:border-teal-700 sm:p-4"
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition ${ACCENT_BG[accent]}`}
      >
        <Icon size={20} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-neutral-800 dark:text-neutral-100">
          {title}
        </p>
        <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
          {subtitle}
        </p>
      </div>
    </Link>
  );
}

interface QuickActionsProps {
  isMaster: boolean;
}

export function QuickActions({ isMaster }: QuickActionsProps) {
  return (
    <section className="mb-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ActionTile
          to="/imprimir"
          icon={Printer}
          title="Imprimir etiqueta"
          subtitle="Validade do alimento"
          accent="teal"
        />
        <ActionTile
          to="/checklists"
          icon={ClipboardCheck}
          title="Fazer checklist"
          subtitle="Boas práticas"
          accent="emerald"
        />
        <ActionTile
          to="/temperatura"
          icon={Thermometer}
          title="Registrar temperatura"
          subtitle="Equipamentos"
          accent="blue"
        />
        <ActionTile
          to="/nao-conformidades"
          icon={AlertOctagon}
          title="Nova NC"
          subtitle="Plano de ação"
          accent="amber"
        />
      </div>
      {isMaster ? (
        <div className="mt-3 flex justify-end">
          <Link
            to="/visitas"
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:border-teal-300 dark:border-neutral-800 dark:bg-slate-900 dark:text-neutral-300 dark:hover:border-teal-700"
          >
            <CalendarPlus size={14} />
            Agendar visita técnica
          </Link>
        </div>
      ) : null}
    </section>
  );
}
