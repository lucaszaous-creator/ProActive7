import { useRef, type ReactNode } from 'react';

interface SpotlightProps {
  children: ReactNode;
  className?: string;
}

/**
 * Envolve uma seção (tipicamente escura) e projeta um halo de luz que
 * acompanha o cursor — o brilho radial é desenhado em CSS (`.fx-spotlight`),
 * aqui só atualizamos as variáveis `--mx/--my` com a posição do ponteiro.
 * Custo zero, sem dependências. Em telas touch (sem hover) simplesmente
 * não dispara, e respeita prefers-reduced-motion via CSS.
 */
export function Spotlight({ children, className = '' }: SpotlightProps) {
  const ref = useRef<HTMLDivElement>(null);

  function move(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
    el.dataset.active = '1';
  }

  function leave() {
    if (ref.current) ref.current.dataset.active = '0';
  }

  return (
    <div
      ref={ref}
      onPointerMove={move}
      onPointerLeave={leave}
      className={`fx-spotlight ${className}`}
    >
      {children}
    </div>
  );
}
