import { currentGreeting, firstName } from '@/lib/greeting';

interface HeroGreetingProps {
  fullName: string | null | undefined;
  email: string | null | undefined;
  /** Frase resumo customizada por papel. */
  summary?: string;
  /** Cor de destaque do badge resumo (default emerald). */
  summaryAccent?: 'emerald' | 'teal' | 'amber' | 'red';
}

const ACCENT: Record<'emerald' | 'teal' | 'amber' | 'red', string> = {
  emerald:
    'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  teal: 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  red: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
};

export function HeroGreeting({
  fullName,
  email,
  summary,
  summaryAccent = 'teal',
}: HeroGreetingProps) {
  const greeting = currentGreeting();
  const name = firstName(fullName) || (email?.split('@')[0] ?? '');

  return (
    <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {greeting}
        </p>
        <h1 className="truncate text-xl font-semibold text-neutral-800 dark:text-neutral-100 sm:text-2xl">
          {name || 'Bem-vindo'}
        </h1>
      </div>
      {summary ? (
        <span
          className={`inline-flex items-center self-start rounded-full px-3 py-1.5 text-xs font-medium sm:self-end ${ACCENT[summaryAccent]}`}
        >
          {summary}
        </span>
      ) : null}
    </header>
  );
}
