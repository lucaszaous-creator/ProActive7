import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Ação opcional (botão/link) renderizada abaixo do texto. */
  action?: ReactNode;
}

/**
 * Estado vazio ilustrado em mono — ícone num halo de anéis concêntricos
 * + título + descrição + ação opcional. Substitui o "Nenhum X cadastrado"
 * seco por algo acolhedor e com call-to-action. Custo zero.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-14 text-center">
      <span className="relative flex h-16 w-16 items-center justify-center">
        {/* anéis concêntricos que pulsam suavemente */}
        <span className="absolute inset-0 rounded-full bg-neutral-100" />
        <span className="absolute inset-2 rounded-full bg-neutral-200" />
        <Icon
          className="fx-float relative h-7 w-7 text-neutral-500"
          strokeWidth={1.75}
        />
      </span>
      <h3 className="mt-5 text-sm font-semibold text-neutral-800">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm text-neutral-500">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
