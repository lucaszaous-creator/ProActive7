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
    /* pt na área segura: o modal sobe do rodapé e, com lista longa,
       encostava no topo da tela — o começo da lista sumia embaixo do
       relógio do iPhone. O padding aqui limita a altura disponível, e o
       painel usa max-h-full em vez de uma fração da viewport. */
    <div
      className="fx-overlay-in fixed inset-0 z-50 flex items-end justify-center bg-black/40 pt-[env(safe-area-inset-top)] backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className={`fx-modal-in flex max-h-full w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[92vh] sm:rounded-2xl ${
          wide ? 'max-w-3xl' : 'max-w-lg'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3 sm:px-6">
          <h2 className="min-w-0 flex-1 truncate text-base font-semibold text-neutral-800 sm:text-lg">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="shrink-0 rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-4 sm:px-6">{children}</div>
        {footer ? (
          <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-200 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-3">
            {footer}
          </div>
        ) : (
          /* Sem rodapé o conteúdo encosta na borda de baixo: a barra de
             gestos do iPhone cobriria o último item da lista. */
          <div className="pb-[env(safe-area-inset-bottom)] sm:pb-0" />
        )}
      </div>
    </div>
  );
}
