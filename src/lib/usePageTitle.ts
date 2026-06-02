import { useEffect } from 'react';

/**
 * Define document.title quando a pagina monta e restaura o anterior
 * quando desmonta. Mantem o sufixo da marca em todas as paginas
 * para reforcar o reconhecimento.
 *
 * Uso: `usePageTitle('Documentos')` -> "Documentos · ProActive7"
 */
export const BRAND_NAME = 'ProActive7';
export const BRAND_TAGLINE = 'Boa alimentação, bem-estar e saúde!';
export const BRAND_TAGLINE_LONG =
  'Consultoria Nutricional e Segurança Alimentar';
export const SITE_URL =
  import.meta.env.VITE_SITE_URL ?? 'https://www.proactive7.com.br';

export function usePageTitle(title: string | null | undefined): void {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = `${title} · ${BRAND_NAME}`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
