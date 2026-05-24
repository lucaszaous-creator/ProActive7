export type GreetingPeriod = 'morning' | 'afternoon' | 'evening';

/**
 * Retorna o periodo do dia a partir da hora local (0-23):
 * - 5..11  -> morning  ("Bom dia")
 * - 12..17 -> afternoon ("Boa tarde")
 * - else   -> evening  ("Boa noite")
 */
export function greetingPeriodForHour(hour: number): GreetingPeriod {
  if (hour >= 5 && hour <= 11) return 'morning';
  if (hour >= 12 && hour <= 17) return 'afternoon';
  return 'evening';
}

const LABELS_PT: Record<GreetingPeriod, string> = {
  morning: 'Bom dia',
  afternoon: 'Boa tarde',
  evening: 'Boa noite',
};

export function greetingForHour(hour: number): string {
  return LABELS_PT[greetingPeriodForHour(hour)];
}

/** Atalho que usa a hora atual local. */
export function currentGreeting(): string {
  return greetingForHour(new Date().getHours());
}

/** "João Silva" -> "João"; null/empty -> ''. */
export function firstName(fullName: string | null | undefined): string {
  if (!fullName) return '';
  const trimmed = fullName.trim();
  if (!trimmed) return '';
  return trimmed.split(/\s+/)[0];
}
