import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({
  label,
  error,
  className = '',
  id,
  ...rest
}: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={id}
          className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className={`min-h-[44px] w-full min-w-0 rounded-lg border bg-white px-3 py-2.5 text-base text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.03)] outline-none transition placeholder:text-neutral-400 focus:border-neutral-800 focus:ring-2 focus:ring-neutral-800/20 disabled:bg-neutral-100 sm:text-sm dark:bg-neutral-800 dark:text-neutral-100 dark:shadow-none dark:placeholder:text-neutral-500 dark:focus:border-neutral-300 dark:focus:ring-neutral-200/20 dark:disabled:bg-neutral-900 ${
          error
            ? 'border-red-400'
            : 'border-neutral-300 dark:border-neutral-700'
        } ${className}`}
        {...rest}
      />
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
