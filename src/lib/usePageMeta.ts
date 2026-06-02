import { useEffect } from 'react';
import seoConfig from './seo.config.json';
import { BRAND_NAME } from './usePageTitle';

/**
 * SEO por rota para o site público (CSR). Mantém o <head> em sincronia
 * com a página atual: title, description, canonical, Open Graph, Twitter,
 * robots e JSON-LD. As mesmas tags são geradas estaticamente no build
 * (scripts/prerender-seo.mjs) a partir deste mesmo seo.config.json — aqui
 * cobrimos a navegação client-side e o render por JS do Google.
 *
 * Fonte única de verdade: src/lib/seo.config.json.
 */

type FaqItem = { q: string; a: string };

type PageSeo = {
  title: string;
  description: string;
  keywords?: string[];
  noindex?: boolean;
  image?: string;
  crumb?: string;
  extraJsonLd?: unknown[];
  faq?: FaqItem[];
};

/** Monta o JSON-LD FAQPage a partir do array de perguntas da rota. */
export function buildFaqJsonLd(faq: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}

/** Trilha de navegação (Início › Página) para o rich result de breadcrumb. */
export function buildBreadcrumbJsonLd(
  siteUrl: string,
  path: string,
  crumb: string,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Início',
        item: `${siteUrl}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: crumb,
        item: `${siteUrl}${path}`,
      },
    ],
  };
}

const SITE_URL: string = seoConfig.siteUrl;
const DEFAULT_IMAGE: string = seoConfig.defaultImage;
const PAGES = seoConfig.pages as Record<string, PageSeo>;

/** Cria ou atualiza <meta name|property="..."> no <head>. */
function upsertMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`,
  );
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  );
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/**
 * Aplica o SEO da rota indicada (ex.: '/servicos'). Use o mesmo path
 * registrado em seo.config.json. Restaura title ao desmontar e remove
 * o JSON-LD injetado para não acumular entre navegações.
 */
export function usePageMeta(path: string): void {
  useEffect(() => {
    const page = PAGES[path];
    if (!page) return;

    const previousTitle = document.title;
    const fullTitle = `${page.title}`;
    const canonical = `${SITE_URL}${path === '/' ? '/' : path}`;
    const image = page.image ?? DEFAULT_IMAGE;

    document.title = fullTitle;
    upsertMeta('name', 'description', page.description);
    upsertMeta(
      'name',
      'robots',
      page.noindex
        ? 'noindex,nofollow'
        : 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
    );
    if (page.keywords?.length) {
      upsertMeta('name', 'keywords', page.keywords.join(', '));
    }
    upsertCanonical(canonical);

    // Open Graph
    upsertMeta('property', 'og:title', page.title);
    upsertMeta('property', 'og:description', page.description);
    upsertMeta('property', 'og:url', canonical);
    upsertMeta('property', 'og:image', image);
    upsertMeta('property', 'og:image:alt', page.title);
    upsertMeta('property', 'og:image:width', '1200');
    upsertMeta('property', 'og:image:height', '630');
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('property', 'og:site_name', BRAND_NAME);
    upsertMeta('property', 'og:locale', seoConfig.locale);

    // Twitter
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', page.title);
    upsertMeta('name', 'twitter:description', page.description);
    upsertMeta('name', 'twitter:image', image);
    upsertMeta('name', 'twitter:image:alt', page.title);

    // JSON-LD: organização (sitewide) + breadcrumb + FAQ + específicos.
    const blocks: unknown[] = [seoConfig.organizationJsonLd];
    if (page.crumb) {
      blocks.push(buildBreadcrumbJsonLd(SITE_URL, path, page.crumb));
    }
    if (page.faq?.length) blocks.push(buildFaqJsonLd(page.faq));
    if (page.extraJsonLd?.length) blocks.push(...page.extraJsonLd);
    const scripts = blocks.map((block) => {
      const s = document.createElement('script');
      s.type = 'application/ld+json';
      s.dataset.seoJsonld = 'true';
      s.textContent = JSON.stringify(block);
      document.head.appendChild(s);
      return s;
    });

    return () => {
      document.title = previousTitle;
      scripts.forEach((s) => s.remove());
    };
  }, [path]);
}
