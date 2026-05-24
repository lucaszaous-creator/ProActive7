// Renderiza o og-image.png (1200x630) a partir de um template SVG.
// Rodar uma unica vez: `node scripts/build-og-image.mjs`.
// Use o resultado em <meta property="og:image">.
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#ecfdf5"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="0" width="1200" height="8" fill="#059669"/>

  <!-- Badge P7 -->
  <rect x="80" y="80" width="100" height="100" rx="20" fill="#059669"/>
  <text x="130" y="148" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        font-size="48" font-weight="800" fill="white" text-anchor="middle">P7</text>

  <!-- Brand block -->
  <text x="80" y="320" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        font-size="96" font-weight="800" fill="#0f172a">ProActive7</text>
  <text x="80" y="380" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        font-size="36" font-weight="600" fill="#059669">
    Consultoria Nutricional e Segurança Alimentar
  </text>
  <text x="80" y="430" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        font-size="22" font-weight="400" fill="#64748b">
    ANVISA RDC 216 · POPs · Etiquetas · Visitas técnicas · Manipuladores
  </text>

  <!-- Accent footer -->
  <rect x="80" y="540" width="120" height="6" rx="3" fill="#059669"/>
  <text x="80" y="582" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        font-size="18" font-weight="500" fill="#64748b" letter-spacing="2">
    PRO-ACTIVE7.VERCEL.APP
  </text>
</svg>
`;

const png = await sharp(Buffer.from(svg)).png().toBuffer();
writeFileSync('public/og-image.png', png);
console.log('Wrote public/og-image.png', png.length, 'bytes');
