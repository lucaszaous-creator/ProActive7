import { useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';

/**
 * Envolve o conteúdo de rota e o reanima (fade + slide via `.fx-page-in`)
 * a cada mudança de pathname — o `key` força o remount do wrapper. Custo
 * zero, sem libs de animação. Respeita prefers-reduced-motion no CSS.
 */
export function RouteFade({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} className="fx-page-in">
      {children}
    </div>
  );
}
