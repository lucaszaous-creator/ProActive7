import type { ReactNode } from 'react';

export function Card({
  children,
  className = '',
  interactive = false,
}: {
  children: ReactNode;
  className?: string;
  /** Quando true, o cartão sobe e ganha sombra no hover (fx-lift).
   *  Use em cartões clicáveis (KPIs, atalhos) — não em cartões de form. */
  interactive?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-neutral-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/10 dark:bg-neutral-900 dark:shadow-none sm:p-6 ${
        interactive
          ? 'fx-lift hover:border-neutral-300 dark:hover:border-white/20'
          : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
