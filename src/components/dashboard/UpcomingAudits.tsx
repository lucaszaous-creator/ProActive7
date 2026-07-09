import { Link } from 'react-router-dom';
import { CalendarCheck, CalendarPlus } from 'lucide-react';
import { formatDateTime } from '@/lib/dates';
import type { UpcomingAudit } from '@/lib/dashboardQueries';
import { Card } from '@/components/ui/Card';
import { Skeleton } from './Skeleton';

interface UpcomingAuditsProps {
  loading: boolean;
  items: UpcomingAudit[];
}

export function UpcomingAudits({ loading, items }: UpcomingAuditsProps) {
  return (
    <Card>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
        <CalendarCheck
          size={16}
          className="text-neutral-600 dark:text-neutral-400"
        />
        Próximas visitas
      </h2>
      {loading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Nenhuma visita agendada nos próximos 14 dias.
          </p>
          <Link
            to="/visitas"
            className="inline-flex items-center gap-1 text-xs font-medium text-neutral-700 hover:underline dark:text-neutral-400"
          >
            <CalendarPlus size={12} />
            Agendar visita
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
          {items.map((ev) => (
            <li key={ev.id}>
              <Link
                to={`/visitas/${ev.id}`}
                className="flex items-center justify-between gap-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
              >
                <span className="min-w-0 flex-1 truncate font-medium text-neutral-800 dark:text-neutral-200">
                  {ev.company?.name ?? '—'}
                </span>
                <span className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
                  {formatDateTime(ev.scheduled_at)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
