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
      className={`rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-slate-900 sm:p-6 ${
        interactive ? 'fx-lift hover:border-neutral-300 dark:hover:border-neutral-700' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
