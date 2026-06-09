// Gera as imagens de compartilhamento (Open Graph, 1200×630) por página,
// renderizando um SVG de marca para PNG via sharp. Lê src/lib/seo.config.json:
// para cada página com campo `image`, grava public/og/<slug>.png usando o
// nome do arquivo da própria URL como slug.
//
// Rode manualmente quando mudar títulos/imagens:  node scripts/generate-og.mjs
// (Não roda no build — os PNGs ficam versionados em public/og/.)

import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(
  readFileSync(join(root, 'src/lib/seo.config.json'), 'utf8'),
);
const outDir = join(root, 'public/og');
mkdirSync(outDir, { recursive: true });

const FONT = 'DejaVu Sans';
const SUBTITLE = 'Consultoria Nutricional e Segurança Alimentar · Macaé/RJ';

function escapeXml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Headline a partir do título: tira o sufixo de marca depois do "|". */
function headlineFromTitle(title) {
  return title.split('|')[0].trim();
}

/** Quebra o texto em no máx. `maxLines` linhas de ~`maxChars` caracteres. */
function wrap(text, maxChars = 24, maxLines = 3) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (candidate.length > maxChars && line) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines - 1) break;
    } else {
      line = candidate;
    }
  }
  const used = words.join(' ').split(' ');
  const remaining = used.slice(
    lines.join(' ').split(' ').filter(Boolean).length,
  );
  if (remaining.length) lines.push(remaining.join(' '));
  return lines.slice(0, maxLines);
}

function svgFor(headline) {
  const lines = wrap(headline);
  const lineHeight = 78;
  const blockTop = 300 - ((lines.length - 1) * lineHeight) / 2;
  const tspans = lines
    .map(
      (l, i) =>
        `<tspan x="80" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(l)}</tspan>`,
    )
    .join('');

  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#262626"/>
      <stop offset="1" stop-color="#171717"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1090" cy="110" r="230" fill="#737373" opacity="0.13"/>
  <circle cx="1150" cy="560" r="150" fill="#737373" opacity="0.10"/>
  <g>
    <circle cx="96" cy="92" r="15" fill="#737373"/>
    <text x="124" y="102" font-family="${FONT}" font-size="32" font-weight="bold" fill="#e5e5e5" letter-spacing="1">ProActive7</text>
  </g>
  <text y="${blockTop}" font-family="${FONT}" font-size="64" font-weight="bold" fill="#FFFFFF">${tspans}</text>
  <text x="80" y="566" font-family="${FONT}" font-size="27" fill="#c9c9c9">${escapeXml(SUBTITLE)}</text>
</svg>`;
}

const jobs = Object.entries(config.pages).filter(([, p]) => p.image);
for (const [path, page] of jobs) {
  const slug = basename(page.image).replace(/\.png$/, '');
  const svg = svgFor(headlineFromTitle(page.title));
  const outPath = join(outDir, `${slug}.png`);
  await sharp(Buffer.from(svg)).png().toFile(outPath);
  console.log(`[generate-og] ${path} -> public/og/${slug}.png`);
}
// Imagem default (og-image.png na raiz) — usada pela home e fallback global.
const homeTitle = config.pages?.['/']?.title || config.brand;
await sharp(Buffer.from(svgFor(headlineFromTitle(homeTitle))))
  .png()
  .toFile(join(root, 'public/og-image.png'));
console.log('[generate-og] / -> public/og-image.png');

console.log(`[generate-og] ${jobs.length + 1} imagens geradas.`);
