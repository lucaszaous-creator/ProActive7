import { useEffect, useRef } from 'react';

const SCRIPT_SRC = 'https://elfsightcdn.com/platform.js';
const SCRIPT_ID = 'elfsight-platform-script';

/**
 * Carrega o platform.js do Elfsight uma única vez. O Elfsight é
 * idempotente — se rodar de novo, ele só "re-escaneia" o DOM atrás de
 * divs com a classe `elfsight-app-<uuid>` e renderiza as que ainda não
 * foram inicializadas. Como o site é SPA, é seguro chamar a cada
 * navegação que monta um novo widget.
 */
function ensureElfsightScript(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  const existing = document.getElementById(
    SCRIPT_ID,
  ) as HTMLScriptElement | null;
  if (existing) {
    // Já presente: se o widget global existir, força reinicialização para
    // pegar os divs recém-montados pelo React.
    type ElfsightWindow = Window & {
      eapps?: { initWidgetsFromBuffer?: () => void };
    };
    const w = window as ElfsightWindow;
    w.eapps?.initWidgetsFromBuffer?.();
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.id = SCRIPT_ID;
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => resolve();
    document.head.appendChild(s);
  });
}

interface ElfsightWidgetProps {
  /** UUID do widget criado no painel do Elfsight (ex.: "a1b2c3d4-..."). */
  appId: string | undefined | null;
  /** Texto curto exibido se o widget não estiver configurado. */
  fallback?: React.ReactNode;
  /** Classes extras para o container do widget. */
  className?: string;
}

/**
 * Renderiza um widget Elfsight (ex.: feed do Instagram, depoimentos,
 * formulário, etc.). O `appId` é o UUID que aparece no painel do
 * Elfsight. Configure via env: VITE_ELFSIGHT_INSTAGRAM_APP_ID.
 *
 * Privacidade: o script é carregado pela CDN do Elfsight; o widget
 * monta um iframe que se comunica com servidores deles. Quando o
 * conteúdo for relevante para LGPD, mencione no aviso de privacidade.
 */
export function ElfsightWidget({
  appId,
  fallback = null,
  className = '',
}: ElfsightWidgetProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!appId) return;
    void ensureElfsightScript();
  }, [appId]);

  if (!appId) {
    return <>{fallback}</>;
  }

  return (
    <div
      ref={ref}
      className={`elfsight-app-${appId} ${className}`}
      // Otimização recomendada pelo Elfsight: carrega o widget só quando
      // ele entra no viewport (reduz views do plano free).
      data-elfsight-app-lazy
    />
  );
}
