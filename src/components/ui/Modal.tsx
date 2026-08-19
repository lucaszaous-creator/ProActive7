import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Largura extra para editores densos (ex.: modelo de visita modular). */
  wide?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide = false,
}: ModalProps) {
  if (!open) return null;
  return (
    <div
      className="fx-overlay-in fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-[2px] dark:bg-black/60 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className={`fx-modal-in flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl dark:bg-neutral-900 dark:ring-1 dark:ring-white/10 sm:rounded-2xl ${
          wide ? 'max-w-3xl' : 'max-w-lg'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800 sm:px-6">
          <h2 className="min-w-0 flex-1 truncate text-base font-semibold text-neutral-800 dark:text-neutral-100 sm:text-lg">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="shrink-0 rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
          >
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-4 sm:px-6">{children}</div>
        {footer && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-200 px-4 py-3 dark:border-neutral-800 sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
