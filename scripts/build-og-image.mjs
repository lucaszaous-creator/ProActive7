// Gera todos os assets PNG da marca a partir de templates SVG.
// Roda manualmente sempre que mudar o logo ou a paleta:
//   node scripts/build-og-image.mjs
//
// Saidas em public/:
// - og-image.png (1200x630) — preview WhatsApp/LinkedIn/Twitter
// - pwa-192.png (192x192) — icone PWA
// - pwa-512.png (512x512) — icone PWA grande
// - pwa-512-maskable.png (512x512) — icone PWA com safe zone
// - apple-touch-icon.png (180x180) — iOS home screen

import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

const TEAL = '#171717';
const DARK = '#171717';
const BG = '#ffffff';
const FONT = 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif';

/** Logo ProActive7 inline (mesmo design de public/proactive7-logo.svg). */
function logoBlock(x, y, scale = 1) {
  const s = (n) => n * scale;
  return `
    <g transform="translate(${x},${y})">
      <text x="${s(32)}" y="${s(36)}" font-family="${FONT}" font-size="${s(34)}" font-weight="800" font-style="italic" fill="${TEAL}" letter-spacing="2">PRO</text>
      <text x="${s(16)}" y="${s(84)}" font-family="${FONT}" font-size="${s(52)}" font-weight="900" font-style="italic" fill="${DARK}" letter-spacing="1">ACTIVE</text>
      <text x="${s(206)}" y="${s(84)}" font-family="${FONT}" font-size="${s(64)}" font-weight="900" font-style="italic" fill="${TEAL}">7</text>
      <text x="${s(140)}" y="${s(110)}" font-family="${FONT}" font-size="${s(10)}" font-weight="700" fill="${DARK}" text-anchor="middle" letter-spacing="1.5">BOA ALIMENTAÇÃO, BEM-ESTAR E SAÚDE!</text>
    </g>
  `;
}

/** Badge quadrado "P7" para favicons/PWA. */
function badgeP7(size, padding = 0.0, rounded = 0.18) {
  const radius = size * rounded;
  const pad = size * padding;
  const inner = size - pad * 2;
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect x="${pad}" y="${pad}" width="${inner}" height="${inner}" rx="${radius}" fill="${TEAL}"/>
      <text
        x="${size / 2}"
        y="${size * 0.66}"
        font-family="${FONT}"
        font-size="${size * 0.52}"
        font-weight="900"
        font-style="italic"
        fill="white"
        text-anchor="middle"
      >P7</text>
    </svg>
  `;
}

/** OG image (1200x630). */
const ogSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="100%" stop-color="#f0fdfa"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)"/>
    <rect x="0" y="0" width="1200" height="10" fill="${TEAL}"/>

    ${logoBlock(310, 130, 2.2)}

    <rect x="80" y="540" width="120" height="6" rx="3" fill="${TEAL}"/>
    <text x="80" y="582" font-family="${FONT}" font-size="18" font-weight="500" fill="#64748b" letter-spacing="2">
      ANVISA RDC 216 · POPs · ETIQUETAS · VISITAS TÉCNICAS · MANIPULADORES
    </text>
    <text x="1120" y="582" font-family="${FONT}" font-size="16" font-weight="500" fill="#94a3b8" letter-spacing="1" text-anchor="end">
      pro-active7.vercel.app
    </text>
  </svg>
`;

async function renderSvg(svg, outPath) {
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  writeFileSync(outPath, png);
  console.log(`Wrote ${outPath} (${png.length} bytes)`);
}

// og-image.png é gerado por generate-og.mjs (paleta mono); não sobrescrever aqui.
void ogSvg;
await renderSvg(badgeP7(192), 'public/pwa-192.png');
await renderSvg(badgeP7(512), 'public/pwa-512.png');
// Maskable: 12% safe zone (= padding) para Android nao cortar conteudo.
await renderSvg(badgeP7(512, 0.12), 'public/pwa-512-maskable.png');
await renderSvg(badgeP7(180), 'public/apple-touch-icon.png');
