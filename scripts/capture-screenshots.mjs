// Captura screenshots REAIS do sistema para o manual (PDF).
//
// Loga como nutricionista e como cozinha (property), visita cada rota
// listada em src/content/help-content.json e salva os PNGs em
// dist/screenshots/<screenshot>.png. Depois, rode `npm run manual:pdf`
// e o gerador embute as capturas no lugar dos mockups.
//
// USO MAIS SIMPLES (com as contas demo já criadas no banco):
//
//   1) Instale o browser (uma vez):
//        npx playwright install chromium
//   2) Rode a captura:
//        npm run manual:screenshots
//   3) Gere o PDF:
//        npm run manual:pdf
//
// As contas demo embutidas neste script existem na organização "Demo
// (manual PDF)" do banco de produção, isoladas dos clientes reais.
// Para apagar a demo depois, rode o script de cleanup em:
//   supabase/migrations/cleanup-demo-accounts.sql (executar manualmente).
//
// CUSTOMIZAÇÃO (opcional)
//   BASE_URL           default https://pro-active7.vercel.app
//   NUTRI_EMAIL / NUTRI_PASSWORD
//   PROPERTY_EMAIL / PROPERTY_PASSWORD

import { chromium } from 'playwright';
import { mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'dist', 'screenshots');
const CONTENT = JSON.parse(
  readFileSync(join(ROOT, 'src/content/help-content.json'), 'utf8'),
);

const BASE_URL = (
  process.env.BASE_URL || 'https://pro-active7.vercel.app'
).replace(/\/$/, '');
const VIEWPORT = { width: 1440, height: 760 };

// Contas demo criadas no banco para gerar o manual.
const CREDS = {
  nutri: {
    email: process.env.NUTRI_EMAIL || 'nutri-demo@proactive7.com.br',
    password: process.env.NUTRI_PASSWORD || 'Demo2026!',
  },
  property: {
    email: process.env.PROPERTY_EMAIL || 'cozinha-demo@proactive7.com.br',
    password: process.env.PROPERTY_PASSWORD || 'Demo2026!',
  },
};

async function login(page, email, password) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await Promise.all([
    page.waitForLoadState('networkidle'),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(2500);
}

async function capture(page, route, name) {
  const url = `${BASE_URL}${route}`;
  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    // Dá tempo para queries Supabase carregarem.
    await page.waitForTimeout(2500);
    const file = join(OUT_DIR, `${name}.png`);
    await page.screenshot({ path: file });
    console.log(`  OK  ${name}  (${route})`);
  } catch (e) {
    console.warn(`  --  ${name}  falhou: ${e.message}`);
  }
}

async function runRole(browser, roleKey) {
  const creds = CREDS[roleKey];
  if (!creds?.email || !creds?.password) {
    console.log(`\n[${roleKey}] sem credenciais — pulando.`);
    return;
  }
  console.log(`\n[${roleKey}] login como ${creds.email}`);
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const page = await ctx.newPage();
  try {
    await login(page, creds.email, creds.password);
    const role = CONTENT.roles.find((r) => r.key === roleKey);
    for (const f of role.features) {
      await capture(page, f.route, f.screenshot);
    }
  } catch (e) {
    console.error(`[${roleKey}] erro: ${e.message}`);
  } finally {
    await ctx.close();
  }
}

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  console.log(
    `Capturando de ${BASE_URL} (viewport ${VIEWPORT.width}x${VIEWPORT.height})`,
  );
  const browser = await chromium.launch();
  try {
    await runRole(browser, 'nutri');
    await runRole(browser, 'property');
  } finally {
    await browser.close();
  }
  console.log('\nPronto. Agora gere o PDF: npm run manual:pdf');
}

main();
