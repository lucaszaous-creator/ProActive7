import { useEffect } from 'react';
import { X, Download, ExternalLink } from 'lucide-react';

interface Props {
  /** URL assinada da foto (pode ser null para fechado). */
  url: string | null;
  /** Nome de arquivo sugerido para o download (sem caminho). */
  fileName?: string | null;
  onClose: () => void;
}

/**
 * Lightbox para foto anexada (NC, checklist, temperatura, etc.).
 * Imagem em tamanho real centralizada, fundo escuro, com botões de
 * fechar / abrir em nova aba / baixar. Fecha com ESC ou clique no
 * fundo. Render condicional baseado em `url`.
 */
export function PhotoLightbox({ url, fileName, onClose }: Props) {
  useEffect(() => {
    if (!url) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    // Evita scroll do body atrás do modal.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [url, onClose]);

  if (!url) return null;

  // Para o atributo `download`, removemos query string e usamos o nome
  // original quando disponível.
  const downloadName =
    fileName ?? url.split('/').pop()?.split('?')[0] ?? 'foto';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Visualizar foto"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] backdrop-blur"
    >
      {/* Controles flutuantes — não fecham ao clicar */}
      <div
        className="absolute right-4 top-4 z-10 flex gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <a
          href={url}
          download={downloadName}
          title="Baixar foto"
          aria-label="Baixar foto"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-neutral-800 shadow transition hover:bg-white"
        >
          <Download size={18} />
        </a>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          title="Abrir em nova aba"
          aria-label="Abrir em nova aba"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-neutral-800 shadow transition hover:bg-white"
        >
          <ExternalLink size={18} />
        </a>
        <button
          type="button"
          onClick={onClose}
          title="Fechar"
          aria-label="Fechar"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-neutral-800 shadow transition hover:bg-white"
        >
          <X size={20} />
        </button>
      </div>

      <img
        src={url}
        alt="Foto em tamanho real"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] max-w-[95vw] rounded-lg object-contain shadow-2xl"
      />
    </div>
  );
}
