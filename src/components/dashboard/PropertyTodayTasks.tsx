import { Link } from 'react-router-dom';
import {
  ClipboardCheck,
  Clock,
  Thermometer,
  HardHat,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from './Skeleton';
import { formatDateTime } from '@/lib/dates';
import type {
  PendingChecklist,
  PendingEquipment,
} from '@/lib/dashboardQueries';

interface ExpiringLabel {
  id: string;
  product_name_snapshot: string;
  expiry_at: string;
}

interface PropertyTodayTasksProps {
  loading: boolean;
  pendingChecklists: PendingChecklist[];
  pendingEquipment: PendingEquipment[];
  expiringLabels: ExpiringLabel[];
  asoAlertsCount: number;
}

export function PropertyTodayTasks({
  loading,
  pendingChecklists,
  pendingEquipment,
  expiringLabels,
  asoAlertsCount,
}: PropertyTodayTasksProps) {
  if (loading) {
    return (
      <section className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card>
          <Skeleton className="mb-3 h-4 w-1/3" />
          <Skeleton className="mb-2 h-8" />
          <Skeleton className="h-8" />
        </Card>
        <Card>
          <Skeleton className="mb-3 h-4 w-1/3" />
          <Skeleton className="mb-2 h-8" />
          <Skeleton className="h-8" />
        </Card>
      </section>
    );
  }

  const allDone =
    pendingChecklists.length === 0 &&
    pendingEquipment.length === 0 &&
    expiringLabels.length === 0;

  if (allDone) {
    return (
      <Card className="mb-5 border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950">
        <div className="flex items-center gap-3">
          <CheckCircle2
            size={28}
            className="shrink-0 text-emerald-600 dark:text-emerald-400"
          />
          <div className="min-w-0">
            <p className="font-medium text-emerald-800 dark:text-emerald-200">
              Tudo em dia por hoje!
            </p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              Sem checklists, temperaturas ou etiquetas pendentes no momento.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <section className="mb-5 grid grid-cols-1 gap-3 lg:grid-cols-2">
      <Card>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
          <ClipboardCheck
            size={16}
            className="text-emerald-600 dark:text-emerald-400"
          />
          Checklists pendentes hoje
        </h2>
        {pendingChecklists.length === 0 ? (
          <p className="py-3 text-center text-xs text-neutral-500 dark:text-neutral-400">
            Todos os checklists do dia foram executados ✓
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
            {pendingChecklists.slice(0, 5).map((t) => (
              <li key={t.id}>
                <Link
                  to="/checklists"
                  className="flex items-center justify-between gap-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-slate-800"
                >
                  <span className="min-w-0 flex-1 truncate text-neutral-800 dark:text-neutral-200">
                    {t.name}
                  </span>
                  <span className="shrink-0 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    Executar →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
          <Thermometer size={16} className="text-blue-600 dark:text-blue-400" />
          Equipamentos sem leitura hoje
        </h2>
        {pendingEquipment.length === 0 ? (
          <p className="py-3 text-center text-xs text-neutral-500 dark:text-neutral-400">
            Todas as temperaturas registradas ✓
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
            {pendingEquipment.slice(0, 5).map((e) => (
              <li key={e.id}>
                <Link
                  to="/temperatura"
                  className="flex items-center justify-between gap-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-slate-800"
                >
                  <span className="min-w-0 flex-1 truncate text-neutral-800 dark:text-neutral-200">
                    {e.name}
                  </span>
                  <span className="shrink-0 text-xs font-medium text-blue-700 dark:text-blue-400">
                    Registrar →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
          <Clock size={16} className="text-amber-600 dark:text-amber-400" />
          Etiquetas vencendo (24h)
        </h2>
        {expiringLabels.length === 0 ? (
          <p className="py-3 text-center text-xs text-neutral-500 dark:text-neutral-400">
            Nenhuma etiqueta vencendo nas próximas 24h.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
            {expiringLabels.slice(0, 5).map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <span className="min-w-0 flex-1 truncate text-neutral-800 dark:text-neutral-200">
                  {l.product_name_snapshot}
                </span>
                <span className="shrink-0 text-xs text-amber-700 dark:text-amber-400">
                  {formatDateTime(l.expiry_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
          <HardHat size={16} className="text-red-600 dark:text-red-400" />
          Avisos para a RT
        </h2>
        {asoAlertsCount === 0 ? (
          <p className="py-3 text-center text-xs text-neutral-500 dark:text-neutral-400">
            Nenhum ASO ou serviço vencendo essa semana.
          </p>
        ) : (
          <Link
            to="/manipuladores"
            className="block rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900"
          >
            {asoAlertsCount} manipulador{asoAlertsCount === 1 ? '' : 'es'} com
            ASO vencendo/vencido
          </Link>
        )}
      </Card>
    </section>
  );
}
