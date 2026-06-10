import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  ClipboardCheck,
  CalendarClock,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { useAuth } from '@/context/AuthContext';
import { formatDate } from '@/lib/dates';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { PageHeader } from '@/components/ui/PageHeader';
import {
  isoDate,
  monthGrid,
  MONTH_NAMES_PT,
  WEEKDAY_NAMES_PT,
  WEEKDAY_NAMES_PT_LONG,
} from '@/lib/calendar';
import type { AuditStatus } from '@/lib/types';

interface AuditEvent {
  id: string;
  company_id: string;
  scheduled_at: string;
  completed_at: string | null;
  status: AuditStatus;
  company: { name: string } | null;
}

const STATUS_DOT: Record<AuditStatus, string> = {
  scheduled: 'bg-blue-500',
  in_progress: 'bg-amber-500',
  completed: 'bg-neutral-500',
  cancelled: 'bg-neutral-400',
};

const STATUS_LABEL_SHORT: Record<AuditStatus, string> = {
  scheduled: 'Agendada',
  in_progress: 'Em curso',
  completed: 'Concluida',
  cancelled: 'Cancelada',
};

export function AgendaPage() {
  usePageTitle('Agenda');
  const { isMaster } = useAuth();
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const end = new Date(cursor.getFullYear(), cursor.getMonth() + 2, 0);
    // Janela: do inicio do mes ate o fim do proximo (6 linhas da grade
    // podem cobrir ate ~5 dias do mes seguinte).
    supabase
      .from('audits')
      .select(
        'id, company_id, scheduled_at, completed_at, status, company:companies(name)',
      )
      .gte('scheduled_at', start.toISOString())
      .lte('scheduled_at', end.toISOString())
      .order('scheduled_at')
      .then(({ data, error }) => {
        setLoading(false);
        if (error) {
          toast.error('Erro ao carregar agenda: ' + error.message);
          return;
        }
        setEvents((data as unknown as AuditEvent[] | null) ?? []);
      });
  }, [cursor]);

  const grid = useMemo(
    () => monthGrid(cursor.getFullYear(), cursor.getMonth(), today),
    [cursor, today],
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, AuditEvent[]>();
    for (const e of events) {
      const iso = isoDate(new Date(e.scheduled_at));
      const arr = map.get(iso) ?? [];
      arr.push(e);
      map.set(iso, arr);
    }
    return map;
  }, [events]);

  const upcomingEvents = useMemo(() => {
    const todayIso = isoDate(today);
    return events
      .filter((e) => {
        const iso = isoDate(new Date(e.scheduled_at));
        return iso >= todayIso && e.status !== 'cancelled';
      })
      .slice(0, 20);
  }, [events, today]);

  function prevMonth() {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1));
  }
  function nextMonth() {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1));
  }
  function goToday() {
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Agenda"
        subtitle="Visitas tecnicas agendadas e historico."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={prevMonth}>
              <ChevronLeft size={16} />
            </Button>
            <Button variant="secondary" size="sm" onClick={goToday}>
              Hoje
            </Button>
            <Button variant="secondary" size="sm" onClick={nextMonth}>
              <ChevronRight size={16} />
            </Button>
          </>
        }
      />

      <Card className="mb-4">
        <h2 className="mb-3 text-base font-semibold text-neutral-700 dark:text-neutral-200">
          {MONTH_NAMES_PT[cursor.getMonth()]} {cursor.getFullYear()}
        </h2>

        {/* MOBILE: lista compacta. DESKTOP (md+): grade mensal. */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner className="h-8 w-8" />
          </div>
        ) : (
          <>
            <div className="md:hidden">
              {grid
                .filter(
                  (d) =>
                    d.inMonth && (eventsByDate.get(d.iso)?.length ?? 0) > 0,
                )
                .map((d) => {
                  const list = eventsByDate.get(d.iso) ?? [];
                  return (
                    <div
                      key={d.iso}
                      className="border-b border-neutral-100 py-2 last:border-0 dark:border-neutral-800"
                    >
                      <p
                        className={`mb-1 text-xs font-medium ${
                          d.isToday
                            ? 'text-neutral-600 dark:text-neutral-400'
                            : 'text-neutral-500 dark:text-neutral-400'
                        }`}
                      >
                        {WEEKDAY_NAMES_PT_LONG[d.date.getDay()]}, {d.day}
                        {d.isToday ? ' (hoje)' : ''}
                      </p>
                      <ul className="flex flex-col gap-1">
                        {list.map((ev) => (
                          <li key={ev.id}>
                            <Link
                              to={`/visitas/${ev.id}`}
                              className="flex items-center gap-2 rounded-lg bg-neutral-50 px-2 py-1.5 text-xs hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                            >
                              <span
                                className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[ev.status]}`}
                              />
                              <span className="min-w-0 flex-1 truncate text-neutral-800 dark:text-neutral-200">
                                {ev.company?.name ?? ''}
                              </span>
                              <span className="shrink-0 text-neutral-500 dark:text-neutral-400">
                                {new Date(ev.scheduled_at).toLocaleTimeString(
                                  'pt-BR',
                                  {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  },
                                )}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              {!grid.some(
                (d) => d.inMonth && (eventsByDate.get(d.iso)?.length ?? 0) > 0,
              ) ? (
                <p className="py-8 text-center text-sm text-neutral-500 dark:text-neutral-400">
                  Nenhuma visita agendada neste mes.
                </p>
              ) : null}
            </div>

            <div className="hidden md:block">
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-neutral-500 dark:text-neutral-400">
                {WEEKDAY_NAMES_PT.map((w, i) => (
                  <div key={`${w}-${i}`} className="py-1">
                    {w}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {grid.map((d) => {
                  const list = eventsByDate.get(d.iso) ?? [];
                  return (
                    <div
                      key={d.iso}
                      className={`flex min-h-[5.5rem] flex-col gap-1 rounded-lg border p-1 text-xs ${
                        d.inMonth
                          ? 'border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
                          : 'border-transparent bg-neutral-50 text-neutral-400 dark:bg-neutral-950 dark:text-neutral-600'
                      } ${d.isToday ? 'ring-2 ring-neutral-900 dark:ring-neutral-100' : ''}`}
                    >
                      <span
                        className={`text-right text-[10px] font-semibold ${
                          d.isToday
                            ? 'text-neutral-600 dark:text-neutral-400'
                            : ''
                        }`}
                      >
                        {d.day}
                      </span>
                      {list.slice(0, 3).map((ev) => (
                        <Link
                          key={ev.id}
                          to={`/visitas/${ev.id}`}
                          className="flex items-center gap-1 truncate rounded bg-neutral-100 px-1 py-0.5 text-[10px] text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                        >
                          <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[ev.status]}`}
                          />
                          <span className="truncate">
                            {ev.company?.name ?? ''}
                          </span>
                        </Link>
                      ))}
                      {list.length > 3 ? (
                        <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                          +{list.length - 3} mais
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </Card>

      {upcomingEvents.length > 0 ? (
        <Card>
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-neutral-700 dark:text-neutral-200">
            <CalendarClock size={18} />
            Proximas visitas {isMaster ? '(carteira completa)' : ''}
          </h2>
          <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
            {upcomingEvents.map((ev) => (
              <li key={ev.id}>
                <Link
                  to={`/visitas/${ev.id}`}
                  className="flex items-center gap-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[ev.status]}`}
                    aria-label={STATUS_LABEL_SHORT[ev.status]}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-neutral-800 dark:text-neutral-200">
                      {ev.company?.name ?? ''}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      <CalendarDays size={10} className="mr-1 inline" />
                      {formatDate(ev.scheduled_at)}{' '}
                      <ClipboardCheck size={10} className="ml-2 mr-1 inline" />
                      {STATUS_LABEL_SHORT[ev.status]}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
