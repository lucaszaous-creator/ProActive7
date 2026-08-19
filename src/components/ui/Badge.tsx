import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

export type BadgeVariant =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

const variants: Record<BadgeVariant, string> = {
  neutral: 'bg-neutral-100 text-neutral-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
};

interface BadgeProps {
  variant?: BadgeVariant;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}

/**
 * Badge de status do design system — substitui os <span> coloridos
 * copiados página a página (status de auditoria, NC, validade, etc.).
 * Mapeamento semântico: success=ok, warning=atenção, danger=crítico,
 * info=agendado/informativo, neutral=concluído/inativo.
 */
export function Badge({
  variant = 'neutral',
  icon: Icon,
  children,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}
    >
      {Icon ? <Icon size={12} className="shrink-0" /> : null}
      {children}
    </span>
  );
}
