import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    'fx-sheen bg-neutral-900 text-white shadow-sm hover:bg-neutral-800 disabled:bg-neutral-400 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white dark:disabled:bg-neutral-600 dark:disabled:text-neutral-400',
  secondary:
    'bg-white text-neutral-700 border border-neutral-300 shadow-sm hover:bg-neutral-50 hover:border-neutral-400 disabled:opacity-50 dark:bg-slate-800 dark:text-neutral-200 dark:border-neutral-700 dark:hover:bg-slate-700 dark:hover:border-neutral-600',
  danger:
    'fx-sheen bg-red-600 text-white shadow-sm hover:bg-red-700 disabled:bg-red-300',
  ghost:
    'bg-transparent text-neutral-600 hover:bg-neutral-100 disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-neutral-800',
};

const sizes: Record<Size, string> = {
  sm: 'min-h-[36px] px-3 py-1.5 text-sm',
  md: 'min-h-[44px] px-4 py-2.5 text-sm',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`fx-press inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-800/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed dark:focus-visible:ring-neutral-200/40 dark:focus-visible:ring-offset-slate-900 ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
