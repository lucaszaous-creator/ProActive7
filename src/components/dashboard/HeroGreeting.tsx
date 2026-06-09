import { currentGreeting, firstName } from '@/lib/greeting';

interface HeroGreetingProps {
  fullName: string | null | undefined;
  email: string | null | undefined;
  /** Nome da empresa em foco (destaque do hero). Default: oculta. */
  companyName?: string | null;
  /** Logo da empresa em foco (mostra como ícone no canto). */
  companyLogoUrl?: string | null;
  /** Frase resumo customizada por papel. */
  summary?: string;
  /** Cor de destaque do badge resumo (default emerald). */
  summaryAccent?: 'emerald' | 'teal' | 'amber' | 'red';
}

const ACCENT: Record<'emerald' | 'teal' | 'amber' | 'red', string> = {
  emerald:
    'bg-neutral-50 text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300',
  teal: 'bg-neutral-50 text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  red: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
};

export function HeroGreeting({
  fullName,
  email,
  companyName,
  companyLogoUrl,
  summary,
  summaryAccent = 'teal',
}: HeroGreetingProps) {
  const greeting = currentGreeting();
  const name = firstName(fullName) || (email?.split('@')[0] ?? '');

  // Quando há uma empresa em foco, o destaque vai para ELA — o usuário
  // continua nominalmente saudado, mas a tela é sobre a operação da
  // empresa. (Pedido da cliente: "tela sobre a empresa, não sobre o
  // sistema".)
  if (companyName) {
    return (
      <header className="mb-4 flex flex-col gap-3 sm:mb-5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 sm:text-xs">
          {greeting}, {name || 'bem-vindo'} ·{' '}
          <span className="text-neutral-400 dark:text-neutral-500">
            painel da empresa
          </span>
        </p>
        <div className="flex items-center gap-3">
          {companyLogoUrl ? (
            <img
              src={companyLogoUrl}
              alt={`Logo ${companyName}`}
              className="h-12 w-12 shrink-0 rounded-lg border border-neutral-200 object-contain p-1 dark:border-neutral-800"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-neutral-50 text-base font-semibold text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300">
              {companyName
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((p) => p[0])
                .join('')
                .toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-semibold text-neutral-800 dark:text-neutral-100 sm:text-2xl">
              {companyName}
            </h1>
            {summary ? (
              <span
                className={`mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium sm:text-xs ${ACCENT[summaryAccent]}`}
              >
                {summary}
              </span>
            ) : null}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="mb-4 flex flex-col gap-2 sm:mb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 sm:text-xs">
          {greeting}
        </p>
        <h1 className="truncate text-lg font-semibold text-neutral-800 dark:text-neutral-100 sm:text-2xl">
          {name || 'Bem-vindo'}
        </h1>
      </div>
      {summary ? (
        <span
          className={`inline-flex items-center self-start rounded-full px-2.5 py-1 text-[11px] font-medium sm:self-end sm:px-3 sm:py-1.5 sm:text-xs ${ACCENT[summaryAccent]}`}
        >
          {summary}
        </span>
      ) : null}
    </header>
  );
}
