import type { AgendaEvent, AgendaEventKind, AuditStatus } from './types';

/**
 * Agenda da consultoria: une as duas fontes que a RT enxerga no mesmo
 * calendário — visitas técnicas (tabela `audits`) e compromissos livres
 * (`agenda_events`, migration 0108).
 *
 * Visita não é copiada para `agenda_events`: seriam dois lugares para
 * cancelar a mesma visita. A união acontece só na leitura, aqui.
 */

export const KIND_LABEL: Record<AgendaEventKind, string> = {
  meeting: 'Reunião',
  training: 'Treinamento',
  deadline: 'Prazo',
  collection: 'Coleta de amostra',
  followup: 'Follow-up',
  other: 'Outro',
};

export const KINDS: AgendaEventKind[] = [
  'meeting',
  'training',
  'deadline',
  'collection',
  'followup',
  'other',
];

/** Cor do ponto no calendário, por tipo. Visita tem a cor do status. */
export const KIND_DOT: Record<AgendaEventKind, string> = {
  meeting: 'bg-indigo-500',
  training: 'bg-teal-500',
  deadline: 'bg-orange-500',
  collection: 'bg-purple-500',
  followup: 'bg-sky-500',
  other: 'bg-neutral-400',
};

export const VISIT_DOT: Record<AuditStatus, string> = {
  scheduled: 'bg-blue-500',
  in_progress: 'bg-amber-500',
  completed: 'bg-neutral-500',
  cancelled: 'bg-neutral-400',
};

export interface CalendarItem {
  key: string;
  source: 'visit' | 'event';
  title: string;
  /** Instante do compromisso, ISO. */
  at: string;
  allDay: boolean;
  dotClass: string;
  /** Rótulo secundário: empresa (visita) ou tipo (compromisso). */
  subtitle: string;
  /** Link interno, quando o item tem página própria. */
  href?: string;
  /** Riscado na lista: visita cancelada ou compromisso concluído. */
  muted: boolean;
}

export interface VisitLike {
  id: string;
  scheduled_at: string;
  status: AuditStatus;
  company: { name: string } | null;
}

export function visitToItem(v: VisitLike): CalendarItem {
  return {
    key: `visit:${v.id}`,
    source: 'visit',
    title: v.company?.name ?? 'Visita técnica',
    at: v.scheduled_at,
    allDay: false,
    dotClass: VISIT_DOT[v.status],
    subtitle: 'Visita técnica',
    href: `/visitas/${v.id}`,
    muted: v.status === 'cancelled',
  };
}

export function eventToItem(
  e: AgendaEvent,
  companyName?: string,
): CalendarItem {
  return {
    key: `event:${e.id}`,
    source: 'event',
    title: e.title,
    at: e.starts_at,
    allDay: e.all_day,
    dotClass: KIND_DOT[e.kind] ?? KIND_DOT.other,
    subtitle: companyName
      ? `${KIND_LABEL[e.kind]} · ${companyName}`
      : KIND_LABEL[e.kind],
    muted: Boolean(e.done_at),
  };
}

/** Ordena por instante; item de dia inteiro vem primeiro no seu dia. */
export function sortItems(items: CalendarItem[]): CalendarItem[] {
  return [...items].sort((a, b) => {
    if (a.at === b.at) return Number(b.allDay) - Number(a.allDay);
    return a.at < b.at ? -1 : 1;
  });
}

/**
 * Data em que o lembrete deve disparar (YYYY-MM-DD, fuso local).
 * Sem lembrete configurado, devolve null.
 */
export function reminderDate(
  event: Pick<AgendaEvent, 'starts_at' | 'remind_days_before'>,
): string | null {
  if (event.remind_days_before == null) return null;
  const d = new Date(event.starts_at);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() - event.remind_days_before);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const REMINDER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Sem lembrete' },
  { value: '0', label: 'No dia' },
  { value: '1', label: '1 dia antes' },
  { value: '3', label: '3 dias antes' },
  { value: '7', label: '1 semana antes' },
  { value: '30', label: '30 dias antes' },
];

/**
 * `datetime-local` <-> ISO. O input entrega hora local sem fuso; gravar a
 * string crua no timestamptz faria o Postgres assumir UTC e a visita das
 * 9h viraria 6h no calendário da RT.
 */
export function isoFromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function localInputFromIso(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}
