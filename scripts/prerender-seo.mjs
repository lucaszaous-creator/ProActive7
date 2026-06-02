// Prerender de SEO: depois do `vite build`, gera um HTML estático por rota
// pública com <head> correto (title, description, canonical, Open Graph,
// Twitter, robots e JSON-LD) injetado a partir de src/lib/seo.config.json.
//
// O corpo continua sendo o mount da SPA (<div id="root">), então os
// crawlers que NÃO executam JS (WhatsApp, Facebook, LinkedIn) leem as meta
// tags corretas por página, e o Google indexa cada rota sem depender só do
// render por JS. Custo zero, sem SSR e sem puppeteer.
//
// Também (re)gera dist/sitemap.xml a partir do mesmo config.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(root, 'dist');
const config = JSON.parse(
  readFileSync(join(root, 'src/lib/seo.config.json'), 'utf8'),
);

const { siteUrl, brand, locale, defaultImage } = config;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Remove as tags de SEO que vamos reescrever, preservando charset,
 *  viewport, theme-color, ícones e apple-* tags. */
function stripManagedTags(html) {
  return html
    .replace(/\s*<title>[\s\S]*?<\/title>/i, '')
    .replace(/\s*<meta\s+name=["']description["'][\s\S]*?>/i, '')
    .replace(/\s*<meta\s+name=["']keywords["'][\s\S]*?>/i, '')
    .replace(/\s*<meta\s+name=["']robots["'][\s\S]*?>/i, '')
    .replace(/\s*<link\s+rel=["']canonical["'][\s\S]*?>/i, '')
    .replace(/\s*<meta\s+property=["']og:[^"']*["'][\s\S]*?>/gi, '')
    .replace(/\s*<meta\s+name=["']twitter:[^"']*["'][\s\S]*?>/gi, '')
    .replace(
      /\s*<script\s+type=["']application\/ld\+json["'][\s\S]*?<\/script>/gi,
      '',
    );
}

function buildFaqJsonLd(faq) {
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

function buildHead(path, page) {
  const canonical = `${siteUrl}${path === '/' ? '/' : path}`;
  const robots = page.noindex ? 'noindex,nofollow' : 'index,follow';
  const image = page.image ?? defaultImage;
  const t = escapeHtml(page.title);
  const d = escapeHtml(page.description);
  const lines = [
    `<title>${t}</title>`,
    `<meta name="description" content="${d}" />`,
    `<meta name="robots" content="${robots}" />`,
  ];
  if (page.keywords?.length) {
    lines.push(
      `<meta name="keywords" content="${escapeHtml(page.keywords.join(', '))}" />`,
    );
  }
  lines.push(
    `<link rel="canonical" href="${canonical}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${escapeHtml(brand)}" />`,
    `<meta property="og:title" content="${t}" />`,
    `<meta property="og:description" content="${d}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:locale" content="${locale}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${t}" />`,
    `<meta name="twitter:description" content="${d}" />`,
    `<meta name="twitter:image" content="${image}" />`,
  );

  const blocks = [
    config.organizationJsonLd,
    ...(page.faq?.length ? [buildFaqJsonLd(page.faq)] : []),
    ...(page.extraJsonLd ?? []),
  ];
  for (const block of blocks) {
    lines.push(
      `<script type="application/ld+json">${JSON.stringify(block)}</script>`,
    );
  }
  return lines.map((l) => `    ${l}`).join('\n');
}

function renderPage(template, path, page) {
  const stripped = stripManagedTags(template);
  const head = buildHead(path, page);
  return stripped.replace(/<\/head>/i, `${head}\n  </head>`);
}

function writeRoute(path, html) {
  const outPath =
    path === '/'
      ? join(distDir, 'index.html')
      : join(distDir, path.replace(/^\//, ''), 'index.html');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, html, 'utf8');
  return outPath.replace(distDir, 'dist');
}

function buildSitemap() {
  const today = new Date().toISOString().slice(0, 10);
  const urls = Object.entries(config.pages)
    .filter(([, page]) => !page.noindex)
    .map(([path, page]) => {
      const loc = `${siteUrl}${path === '/' ? '/' : path}`;
      return [
        '  <url>',
        `    <loc>${loc}</loc>`,
        `    <lastmod>${today}</lastmod>`,
        `    <changefreq>${page.changefreq ?? 'monthly'}</changefreq>`,
        `    <priority>${page.priority ?? '0.5'}</priority>`,
        '  </url>',
      ].join('\n');
    });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

const template = readFileSync(join(distDir, 'index.html'), 'utf8');

const written = [];
for (const [path, page] of Object.entries(config.pages)) {
  written.push(writeRoute(path, renderPage(template, path, page)));
}

writeFileSync(join(distDir, 'sitemap.xml'), buildSitemap(), 'utf8');

console.log(`[prerender-seo] ${written.length} páginas geradas:`);
written.forEach((p) => console.log(`  • ${p}`));
console.log('[prerender-seo] dist/sitemap.xml atualizado.');
