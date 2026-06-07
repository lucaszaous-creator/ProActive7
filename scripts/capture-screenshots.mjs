// Captura screenshots REAIS do sistema para o manual (PDF).
//
// Loga como nutricionista e como cozinha (property), visita cada rota
// listada em src/content/help-content.json e salva os PNGs em
// dist/screenshots/<screenshot>.png. Depois, rode `npm run manual:pdf`
// e o gerador embute as capturas no lugar dos mockups.
//
// PRÉ-REQUISITOS
//   1) App rodando (use a URL pública ou rode `npm run build && npm run
//      preview` e aponte BASE_URL para http://localhost:4173).
//   2) Playwright instalado (uma vez):
//        npm i -D playwright && npx playwright install chromium
//   3) Credenciais de teste de cada papel via variáveis de ambiente.
//
// VARIÁVEIS DE AMBIENTE
//   BASE_URL           (default: https://pro-active7.vercel.app)
//   NUTRI_EMAIL / NUTRI_PASSWORD
//   PROPERTY_EMAIL / PROPERTY_PASSWORD
//
// EXEMPLO
//   BASE_URL=http://localhost:4173 \
//   NUTRI_EMAIL=nutri@teste.com NUTRI_PASSWORD=... \
//   PROPERTY_EMAIL=cozinha@teste.com PROPERTY_PASSWORD=... \
//   node scripts/capture-screenshots.mjs
//
// Papéis sem credenciais são pulados (e o PDF mantém o mockup deles).

import { chromium } from 'playwright';
import { mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'dist', 'screenshots');
const CONTENT = JSON.parse(
  readFileSync(join(ROOT, 'src/content/help-content.json'), 'utf8'),
);

const BASE_URL = (process.env.BASE_URL || 'https://pro-active7.vercel.app').replace(/\/$/, '');
const VIEWPORT = { width: 1440, height: 760 };

const CREDS = {
  nutri: {
    email: process.env.NUTRI_EMAIL,
    password: process.env.NUTRI_PASSWORD,
  },
  property: {
    email: process.env.PROPERTY_EMAIL,
    password: process.env.PROPERTY_PASSWORD,
  },
};

async function login(page, email, password) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
  // Campos comuns: input[type=email] e input[type=password].
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await Promise.all([
    page.waitForLoadState('networkidle'),
    page.click('button[type="submit"]'),
  ]);
  // Espera sair da tela de login.
  await page.waitForTimeout(2500);
}

async function capture(page, route, name) {
  const url = `${BASE_URL}${route}`;
  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    // Dá tempo para dados carregarem (queries Supabase).
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
  console.log(`Capturando de ${BASE_URL} (viewport ${VIEWPORT.width}x${VIEWPORT.height})`);
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
