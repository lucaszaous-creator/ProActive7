/**
 * Calendar helpers — puros para serem testaveis sem montar React.
 * Trabalha em UTC para evitar drift de fuso ao renderizar grade.
 */

export interface CalendarDay {
  /** YYYY-MM-DD */
  iso: string;
  date: Date;
  day: number; // 1-31
  inMonth: boolean;
  isToday: boolean;
}

/** Constroi a grade do mes (6 linhas x 7 colunas = 42 dias). */
export function monthGrid(
  year: number,
  month: number /* 0-11 */,
  today: Date = new Date(),
): CalendarDay[] {
  const firstOfMonth = new Date(year, month, 1);
  const dayOfWeek = firstOfMonth.getDay(); // 0 = domingo
  const start = new Date(year, month, 1 - dayOfWeek);
  const todayIso = isoDate(today);

  const days: CalendarDay[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate() + i,
    );
    const iso = isoDate(d);
    days.push({
      iso,
      date: d,
      day: d.getDate(),
      inMonth: d.getMonth() === month,
      isToday: iso === todayIso,
    });
  }
  return days;
}

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addMonths(d: Date, months: number): Date {
  const r = new Date(d.getFullYear(), d.getMonth() + months, d.getDate());
  // Lida com "31 jan + 1 mes" -> "28 fev" (Date ja faz, mas garante hora).
  r.setHours(d.getHours(), d.getMinutes(), 0, 0);
  return r;
}

export const MONTH_NAMES_PT = [
  'Janeiro',
  'Fevereiro',
  'Marco',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export const WEEKDAY_NAMES_PT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
export const WEEKDAY_NAMES_PT_LONG = [
  'Dom',
  'Seg',
  'Ter',
  'Qua',
  'Qui',
  'Sex',
  'Sab',
];
