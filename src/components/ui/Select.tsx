import type { SelectHTMLAttributes, ReactNode } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  children: ReactNode;
}

export function Select({
  label,
  className = '',
  id,
  children,
  ...rest
}: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-neutral-700">
          {label}
        </label>
      )}
      <select
        id={id}
        className={`min-h-[44px] w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-base text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.03)] outline-none transition focus:border-neutral-800 focus:ring-2 focus:ring-neutral-800/20 disabled:bg-neutral-100 sm:text-sm ${className}`}
        {...rest}
      >
        {children}
      </select>
    </div>
  );
}
