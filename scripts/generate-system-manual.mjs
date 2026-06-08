// Gera o "Manual do Sistema ProActive7" em PDF — explica cada função
// por papel (Nutricionista / Cozinha). O TEXTO vem de
// src/content/help-content.json (mesma fonte da aba Ajuda do sistema),
// então manual e app nunca ficam dessincronizados.
//
// Os "prints" são:
//  - capturas REAIS, se existir dist/screenshots/<screenshot>.png
//    (gere com: npm run manual:screenshots)
//  - senão, um mockup vetorial fiel ao design real.
//
// IMPORTANTE: jsPDF usa fontes padrão (WinAnsi). Só usar caracteres
// Latin-1 — nada de emoji, setas unicode (→), check (✓) etc., que viram
// "mojibake". Para esses, há helpers vetoriais (drawCheck, drawChevron).
//
// Uso: node scripts/generate-system-manual.mjs   (ou: npm run manual:pdf)

import { jsPDF } from 'jspdf';
import {
  writeFileSync,
  mkdirSync,
  existsSync,
  readFileSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'dist');
const OUT_FILE = join(OUT_DIR, 'manual-proactive7.pdf');
const SHOTS_DIR = join(ROOT, 'dist', 'screenshots');
const CONTENT = JSON.parse(
  readFileSync(join(ROOT, 'src/content/help-content.json'), 'utf8'),
);

// ----- Paleta (espelho de src/lib/printTheme.ts) -----
const C = {
  brand: [5, 150, 105],
  brandDark: [4, 120, 87],
  brandDeep: [6, 78, 59],
  brandSoft: [236, 253, 245],
  ink: [15, 23, 42],
  body: [51, 65, 85],
  muted: [100, 116, 139],
  faint: [148, 163, 184],
  hair: [226, 232, 240],
  paper: [250, 250, 247],
  white: [255, 255, 255],
  amber: [217, 119, 6],
  amberSoft: [255, 251, 235],
  red: [220, 38, 38],
  redSoft: [254, 242, 242],
  blue: [37, 99, 235],
  blueSoft: [239, 246, 255],
};

const PAGE_W = 210;
const PAGE_H = 297;
const M = 16;
const CONTENT_W = PAGE_W - M * 2;

// ============================================================
//  PRIMITIVAS
// ============================================================
const fill = (d, c) => d.setFillColor(...c);
const stroke = (d, c, w = 0.2) => {
  d.setDrawColor(...c);
  d.setLineWidth(w);
};
const ink = (d, c) => d.setTextColor(...c);
const font = (d, weight = 'normal', size = 10) => {
  d.setFont('helvetica', weight);
  d.setFontSize(size);
};
const rrect = (d, x, y, w, h, r, style = 'F') =>
  d.roundedRect(x, y, w, h, r, r, style);
const opacity = (d, o) => d.setGState(new d.GState({ opacity: o }));

function wrap(d, text, x, y, w, lh = 4.5) {
  const lines = d.splitTextToSize(String(text), w);
  d.text(lines, x, y);
  return y + lines.length * lh;
}

/** Check vetorial (sem unicode). */
function drawCheck(d, cx, cy, s, color) {
  stroke(d, color, s * 0.18);
  d.line(cx - s * 0.4, cy, cx - s * 0.1, cy + s * 0.35);
  d.line(cx - s * 0.1, cy + s * 0.35, cx + s * 0.45, cy - s * 0.35);
}

/** Triângulo direcional (chevron). dir: 'r','l','d'. */
function drawChevron(d, cx, cy, s, color, dir = 'r') {
  fill(d, color);
  let pts;
  if (dir === 'r') pts = [[cx - s, cy - s], [cx + s, cy], [cx - s, cy + s]];
  else if (dir === 'l') pts = [[cx + s, cy - s], [cx - s, cy], [cx + s, cy + s]];
  else pts = [[cx - s, cy - s], [cx + s, cy - s], [cx, cy + s]];
  d.triangle(...pts[0], ...pts[1], ...pts[2], 'F');
}

function card(d, x, y, w, h) {
  fill(d, C.white);
  rrect(d, x, y, w, h, 1.5, 'F');
  stroke(d, C.hair, 0.15);
  rrect(d, x, y, w, h, 1.5, 'S');
}
function pill(d, x, y, w, h, label, bg, fg) {
  fill(d, bg);
  rrect(d, x, y, w, h, h / 2, 'F');
  ink(d, fg);
  font(d, 'bold', 5);
  d.text(label, x + w / 2, y + h / 2 + 1.5, { align: 'center' });
}
function btn(d, x, y, w, h, label, primary = true) {
  fill(d, primary ? C.brand : C.white);
  rrect(d, x, y, w, h, h / 2, 'F');
  if (!primary) {
    stroke(d, C.hair, 0.3);
    rrect(d, x, y, w, h, h / 2, 'S');
  }
  ink(d, primary ? C.white : C.brandDark);
  font(d, 'bold', 5.5);
  d.text(label, x + w / 2, y + h / 2 + 1.7, { align: 'center' });
}
function input(d, x, y, w, h, placeholder) {
  fill(d, C.white);
  rrect(d, x, y, w, h, 0.8, 'F');
  stroke(d, C.hair, 0.2);
  rrect(d, x, y, w, h, 0.8, 'S');
  if (placeholder) {
    ink(d, C.faint);
    font(d, 'normal', 5);
    d.text(placeholder, x + 1.5, y + h / 2 + 1.5);
  }
}

function ensure(d, y, needed = 40) {
  if (y + needed > PAGE_H - 18) {
    drawFooter(d);
    d.addPage();
    return drawPageHeader(d);
  }
  return y;
}

// ============================================================
//  HEADER / FOOTER
// ============================================================
function drawPageHeader(d) {
  fill(d, C.brandSoft);
  d.rect(0, 0, PAGE_W, 14, 'F');
  fill(d, C.brand);
  d.rect(0, 13.5, PAGE_W, 0.5, 'F');
  ink(d, C.brandDeep);
  font(d, 'bold', 10);
  d.text('ProActive7', M, 9);
  font(d, 'normal', 7.5);
  ink(d, C.muted);
  d.text('MANUAL DO SISTEMA', PAGE_W - M, 9, { align: 'right' });
  return 22;
}
function drawFooter(d) {
  const total = d.internal.pages.length - 1;
  const current = d.getCurrentPageInfo().pageNumber;
  stroke(d, C.hair);
  d.line(M, PAGE_H - 12, PAGE_W - M, PAGE_H - 12);
  font(d, 'normal', 7.5);
  ink(d, C.muted);
  d.text('Manual do Sistema - proactive7.com.br', M, PAGE_H - 7);
  d.text(`${current} / ${total}`, PAGE_W - M, PAGE_H - 7, { align: 'right' });
}

// ============================================================
//  CAPA
// ============================================================
function drawCover(d) {
  for (let i = 0; i < 60; i++) {
    const t = i / 60;
    fill(d, [
      Math.round(15 + (6 - 15) * t),
      Math.round(23 + (78 - 23) * t),
      Math.round(42 + (59 - 42) * t),
    ]);
    d.rect(0, (PAGE_H / 60) * i, PAGE_W, PAGE_H / 60 + 0.5, 'F');
  }
  fill(d, C.white);
  opacity(d, 0.13);
  d.rect(20, 80, 130, 0.3, 'F');
  d.rect(60, 95, 90, 0.3, 'F');
  d.rect(40, 110, 110, 0.3, 'F');
  d.rect(80, 130, 80, 0.3, 'F');
  opacity(d, 1);

  fill(d, C.brand);
  rrect(d, M, 30, 34, 8, 1, 'F');
  ink(d, C.white);
  font(d, 'bold', 7);
  d.text('MANUAL v1', M + 3, 35.5);

  ink(d, C.white);
  font(d, 'bold', 38);
  d.text('Manual', M, 100);
  d.text('do Sistema', M, 117);
  font(d, 'normal', 12);
  ink(d, [200, 220, 210]);
  d.text('ProActive7', M, 129);
  font(d, 'normal', 9);
  ink(d, [180, 200, 190]);
  d.text('BOA ALIMENTACAO, BEM-ESTAR E SAUDE', M, 139, { charSpace: 1.2 });

  font(d, 'normal', 11);
  ink(d, [220, 230, 224]);
  d.text('Cada funcao do sistema explicada para nutricionistas', M, 180);
  d.text('e operadores de cozinha, com telas e dicas de uso.', M, 187);

  fill(d, C.brand);
  d.rect(0, PAGE_H - 30, PAGE_W, 30, 'F');
  ink(d, C.white);
  font(d, 'bold', 9);
  d.text('proactive7.com.br', M, PAGE_H - 18);
  font(d, 'normal', 8);
  ink(d, [200, 230, 215]);
  d.text('Macae - RJ - Desde 2013', M, PAGE_H - 12);
  d.text(new Date().toLocaleDateString('pt-BR'), PAGE_W - M, PAGE_H - 12, {
    align: 'right',
  });
}

// ============================================================
//  SUMÁRIO
// ============================================================
function drawToc(d, entries) {
  let y = drawPageHeader(d);
  ink(d, C.ink);
  font(d, 'bold', 22);
  d.text('Sumario', M, y + 8);
  y += 16;
  font(d, 'normal', 8.5);
  ink(d, C.muted);
  y = wrap(
    d,
    'Este manual cobre as funcoes do sistema agrupadas pelo papel que as utiliza. Cada secao tem a descricao, a tela e a dica de uso.',
    M,
    y,
    CONTENT_W,
    4.5,
  );
  y += 8;

  for (const e of entries) {
    y = ensure(d, y, 12);
    if (e.kind === 'role') {
      y += 3;
      stroke(d, C.hair);
      d.line(M, y, PAGE_W - M, y);
      y += 7;
      fill(d, C.brand);
      rrect(d, M, y - 4, 1.6, 5, 0.6, 'F');
      ink(d, C.brandDeep);
      font(d, 'bold', 11.5);
      d.text(e.title, M + 5, y);
      ink(d, C.faint);
      font(d, 'bold', 9);
      d.text(String(e.page), PAGE_W - M, y, { align: 'right' });
      y += 8;
    } else {
      ink(d, C.body);
      font(d, 'normal', 9.5);
      d.text(e.title, M + 8, y);
      const tw = d.getTextWidth(e.title);
      stroke(d, C.hair, 0.15);
      d.setLineDashPattern([0.6, 0.8], 0);
      d.line(M + 10 + tw, y - 0.8, PAGE_W - M - 8, y - 0.8);
      d.setLineDashPattern([], 0);
      ink(d, C.muted);
      d.text(String(e.page), PAGE_W - M, y, { align: 'right' });
      y += 6;
    }
  }
}

// ============================================================
//  DIVISOR DE PAPEL
// ============================================================
function drawRoleDivider(d, role) {
  fill(d, C.brandDark);
  d.rect(0, 0, PAGE_W, PAGE_H, 'F');
  ink(d, C.white);
  font(d, 'bold', 10);
  d.text('PAPEL', M, 30, { charSpace: 1.5 });
  font(d, 'bold', 38);
  d.text(role.title, M, 72);
  font(d, 'normal', 13);
  ink(d, [220, 235, 226]);
  d.text(role.subtitle, M, 86);

  fill(d, C.white);
  opacity(d, 0.1);
  rrect(d, M, 104, CONTENT_W, 30, 3, 'F');
  opacity(d, 1);
  ink(d, [200, 225, 212]);
  font(d, 'bold', 8);
  d.text('QUEM E', M + 6, 112, { charSpace: 1 });
  ink(d, C.white);
  font(d, 'normal', 10);
  wrap(d, role.who, M + 6, 118, CONTENT_W - 12, 4.5);

  ink(d, [200, 225, 212]);
  font(d, 'bold', 8);
  d.text('O QUE PODE FAZER', M, 152, { charSpace: 1 });
  let y = 159;
  for (const cap of role.capabilities) {
    drawCheck(d, M + 1.5, y - 1, 1.6, C.white);
    ink(d, C.white);
    font(d, 'normal', 10);
    y = wrap(d, cap, M + 6, y, CONTENT_W - 6, 5) + 1;
  }
  ink(d, [200, 225, 212]);
  font(d, 'normal', 8);
  d.text(
    'As proximas paginas descrevem cada tela disponivel para este papel.',
    M,
    PAGE_H - 22,
  );
  ink(d, C.white);
  font(d, 'bold', 8);
  d.text('ProActive7 - Manual do Sistema', M, PAGE_H - 15);
}

// ============================================================
//  APP SHELL (sidebar + área de conteúdo) — base dos mockups
// ============================================================
const MENU_BY_ROLE = {
  nutri: ['Carteira', 'Avaliacao', 'Acompanha.', 'Cadastros', 'Admin', 'Ajuda'],
  property: [
    'Inicio',
    'Etiquetas',
    'Validades',
    'Producao',
    'Estoque',
    'Cadastros',
    'Conformidade',
    'Ajuda',
  ],
  platform_admin: [
    'Plataforma',
    'Operacao',
    'Conformidade',
    'Cadastros',
    'Admin',
    'Ajuda',
  ],
};
const ROLE_LABEL = {
  nutri: 'Nutricionista',
  property: 'Cozinha',
  platform_admin: 'Platform Admin',
};

function appShell(d, x, y, w, h, role, activeMenu) {
  fill(d, [0, 0, 0]);
  opacity(d, 0.07);
  rrect(d, x + 0.8, y + 1, w, h, 2, 'F');
  opacity(d, 1);
  fill(d, C.paper);
  rrect(d, x, y, w, h, 2, 'F');
  stroke(d, C.hair, 0.2);
  rrect(d, x, y, w, h, 2, 'S');

  const sb = 33;
  fill(d, C.white);
  rrect(d, x, y, sb, h, 2, 'F');
  stroke(d, C.hair, 0.15);
  d.line(x + sb, y, x + sb, y + h);

  fill(d, [156, 163, 175]);
  rrect(d, x + 3, y + 3, sb - 6, 7, 0.8, 'F');
  ink(d, C.white);
  font(d, 'bold', 5.5);
  d.text('PROACTIVE7', x + sb / 2, y + 7.5, { align: 'center' });

  const items = MENU_BY_ROLE[role];
  let my = y + 15;
  for (const item of items) {
    const active = item === activeMenu;
    if (active) {
      fill(d, C.brandSoft);
      rrect(d, x + 1.5, my - 1.6, sb - 3, 4.6, 0.6, 'F');
    }
    fill(d, active ? C.brand : C.faint);
    d.circle(x + 4, my, 0.8, 'F');
    ink(d, active ? C.brandDark : C.body);
    font(d, active ? 'bold' : 'normal', 5.5);
    d.text(item, x + 6.5, my + 0.6);
    my += 5;
  }

  fill(d, C.hair);
  d.rect(x + 1.5, y + h - 11, sb - 3, 0.2, 'F');
  ink(d, C.body);
  font(d, 'bold', 5);
  d.text('Usuario Demo', x + 3, y + h - 7);
  ink(d, C.muted);
  font(d, 'normal', 4.5);
  d.text(ROLE_LABEL[role], x + 3, y + h - 4);

  return { cx: x + sb + 4, cy: y + 4, cw: w - sb - 8, ch: h - 8 };
}

function header(d, cx, cy, title, sub) {
  ink(d, C.ink);
  font(d, 'bold', 9);
  d.text(title, cx, cy + 2);
  if (sub) {
    ink(d, C.muted);
    font(d, 'normal', 5.5);
    d.text(sub, cx, cy + 5.5);
  }
  return cy + (sub ? 9 : 6);
}

// ============================================================
//  MOCKUPS ESPECÍFICOS (telas principais)
// ============================================================
function mockNutriPainel(d, x, y, w, h) {
  const { cx, cy, cw } = appShell(d, x, y, w, h, 'nutri', 'Carteira');
  let yy = cy + 1;
  ink(d, C.muted);
  font(d, 'normal', 5);
  d.text('BOM DIA', cx, yy + 2);
  ink(d, C.ink);
  font(d, 'bold', 8.5);
  d.text('Ariane Madureira', cx, yy + 6.5);
  pill(d, cx + 34, yy + 4, 20, 3.4, '3 criticas', C.amberSoft, C.amber);
  yy += 10;

  const kw = (cw - 6) / 4;
  const kpis = [
    ['SCORE MEDIO', '82%'],
    ['EMPRESAS', '7'],
    ['PROX. VISITAS', '4'],
    ['ALERTAS HOJE', '6'],
  ];
  kpis.forEach(([l, v], i) => {
    const kx = cx + i * (kw + 2);
    card(d, kx, yy, kw, 11);
    ink(d, C.muted);
    font(d, 'normal', 4.3);
    d.text(l, kx + 1.5, yy + 3);
    ink(d, C.ink);
    font(d, 'bold', 8);
    d.text(v, kx + 1.5, yy + 8.5);
  });
  yy += 14;

  ink(d, C.body);
  font(d, 'bold', 6);
  d.text('Afazeres - pendencias dos seus clientes', cx, yy);
  yy += 3;
  const aw = (cw - 4) / 2;
  const alerts = [
    ['Empresas sem visita 60d', C.amberSoft],
    ['ASOs vencendo em 30d', C.redSoft],
    ['NCs graves +14d', C.redSoft],
    ['Pragas vencido', C.redSoft],
  ];
  alerts.forEach(([l, tone], i) => {
    const ax = cx + (i % 2) * (aw + 2);
    const ay = yy + Math.floor(i / 2) * 12;
    card(d, ax, ay, aw, 10);
    fill(d, tone);
    rrect(d, ax + 1.5, ay + 1.5, 4, 4, 0.6, 'F');
    ink(d, C.body);
    font(d, 'bold', 5);
    d.text(l, ax + 7, ay + 3.2);
    ink(d, C.muted);
    font(d, 'normal', 4.5);
    d.text('3 itens', ax + 7, ay + 6);
  });
  yy += 26;

  ink(d, C.body);
  font(d, 'bold', 6);
  d.text('Carteira - 3 criticas', cx, yy);
  yy += 3;
  const comp = [
    ['Restaurante Mar Azul', '58%', C.redSoft, C.red],
    ['Padaria Imbetiba', '72%', C.amberSoft, C.amber],
    ['Cantina Escolar', '92%', C.brandSoft, C.brand],
  ];
  comp.forEach(([n, s, bg, fg]) => {
    fill(d, bg);
    rrect(d, cx, yy, cw, 7, 1, 'F');
    ink(d, C.ink);
    font(d, 'bold', 5.5);
    d.text(n, cx + 2, yy + 3.2);
    ink(d, C.muted);
    font(d, 'normal', 4.5);
    d.text('3 NCs - 4/5 ASOs - CIP em dia', cx + 2, yy + 5.7);
    ink(d, fg);
    font(d, 'bold', 7);
    d.text(s, cx + cw - 2, yy + 4.5, { align: 'right' });
    yy += 8;
  });
}

function mockPropertyPainel(d, x, y, w, h) {
  const { cx, cy, cw } = appShell(d, x, y, w, h, 'property', 'Inicio');
  let yy = cy + 1;
  fill(d, C.brandSoft);
  rrect(d, cx, yy, cw, 13, 1.5, 'F');
  fill(d, C.brand);
  rrect(d, cx + 2, yy + 2, 9, 9, 1, 'F');
  ink(d, C.white);
  font(d, 'bold', 5);
  d.text('MAR', cx + 6.5, yy + 7, { align: 'center' });
  ink(d, C.muted);
  font(d, 'normal', 4.3);
  d.text('BOM DIA, RAFAEL - PAINEL DA EMPRESA', cx + 13, yy + 4.5);
  ink(d, C.ink);
  font(d, 'bold', 7.5);
  d.text('Restaurante Mar Azul', cx + 13, yy + 9);
  pill(d, cx + 13, yy + 10.5, 24, 2.6, '3 tarefas hoje', C.amberSoft, C.amber);
  yy += 16;

  ['Imprimir etiqueta', 'Registrar temp.', 'Abrir checklist'].forEach((l, i) => {
    const bw = (cw - 6) / 3;
    btn(d, cx + i * (bw + 3), yy, bw, 8, l, i === 0);
  });
  yy += 11;

  ink(d, C.body);
  font(d, 'bold', 6);
  d.text('Para hoje', cx, yy);
  yy += 3;
  card(d, cx, yy, cw, 24);
  let ly = yy + 2;
  [
    ['Checklist diario de limpeza', 'Higiene - pendente'],
    ['Registrar temperatura (3)', 'Equipamentos - pendente'],
    ['Etiquetas vencendo em 24h (4)', 'Validades - atencao'],
  ].forEach(([t, sub]) => {
    fill(d, C.amberSoft);
    rrect(d, cx + 1.5, ly, 1.5, 5, 0.3, 'F');
    ink(d, C.ink);
    font(d, 'bold', 5);
    d.text(t, cx + 4, ly + 2);
    ink(d, C.muted);
    font(d, 'normal', 4.5);
    d.text(sub, cx + 4, ly + 4.5);
    ink(d, C.brand);
    font(d, 'bold', 4.5);
    d.text('Fazer', cx + cw - 8, ly + 3);
    drawChevron(d, cx + cw - 3, ly + 2.2, 1, C.brand, 'r');
    ly += 7;
  });
  yy += 26;

  ink(d, C.body);
  font(d, 'bold', 6);
  d.text('Etiquetas vencendo em 24h', cx, yy);
  yy += 3;
  ['Salada de frutas - vence em 4h', 'Molho branco - vence amanha'].forEach(
    (t) => {
      fill(d, C.redSoft);
      rrect(d, cx, yy, cw, 5, 0.8, 'F');
      ink(d, C.red);
      font(d, 'bold', 5);
      d.text(t, cx + 2, yy + 3.2);
      yy += 6;
    },
  );
}

function mockPrintWizard(d, x, y, w, h) {
  const { cx, cy, cw } = appShell(d, x, y, w, h, 'property', 'Etiquetas');
  let yy = header(d, cx, cy + 1, 'Imprimir etiqueta', 'Passo 4 de 5 - nada digitado');
  yy += 3;
  ['Manip.', 'Grupo', 'Produto', 'Info', 'Imprimir'].forEach((s, i) => {
    const sx = cx + i * (cw / 5);
    const done = i < 3;
    const act = i === 3;
    fill(d, act ? C.brand : done ? C.brandSoft : C.hair);
    d.circle(sx + cw / 10, yy, 2.2, 'F');
    if (done) drawCheck(d, sx + cw / 10, yy, 1.3, C.brand);
    else {
      ink(d, act ? C.white : C.muted);
      font(d, 'bold', 4);
      d.text(String(i + 1), sx + cw / 10, yy + 1, { align: 'center' });
    }
    if (i < 4) {
      fill(d, done ? C.brand : C.hair);
      d.rect(sx + cw / 10 + 3, yy - 0.2, cw / 5 - 6, 0.4, 'F');
    }
    ink(d, act ? C.brandDeep : C.muted);
    font(d, 'normal', 4.3);
    d.text(s, sx + cw / 10, yy + 6, { align: 'center' });
  });
  yy += 11;

  card(d, cx, yy, cw, 52);
  let iy = yy + 2;
  fill(d, C.brandSoft);
  rrect(d, cx + 2, iy, cw - 4, 6, 1, 'F');
  fill(d, C.brand);
  d.circle(cx + 4.5, iy + 3, 1.5, 'F');
  ink(d, C.ink);
  font(d, 'bold', 5.5);
  d.text('Salada de frutas', cx + 7, iy + 2.6);
  ink(d, C.brand);
  font(d, 'bold', 5);
  d.text('Vence 28/01 14:00', cx + 7, iy + 4.9);
  iy += 8.5;

  ink(d, C.body);
  font(d, 'bold', 5);
  d.text('Condicao de armazenamento', cx + 2, iy + 2);
  iy += 3;
  input(d, cx + 2, iy, cw - 4, 4.5, 'Refrigerado - 2 dias');
  iy += 6.5;

  ink(d, C.body);
  font(d, 'bold', 5);
  d.text('Data e hora da manipulacao', cx + 2, iy + 2);
  iy += 3;
  fill(d, [243, 244, 246]);
  rrect(d, cx + 2, iy, cw - 4, 4.5, 0.8, 'F');
  ink(d, C.muted);
  font(d, 'normal', 5);
  d.text('26/01/2026 14:32  (bloqueado)', cx + 4, iy + 3);
  iy += 5;
  ink(d, C.muted);
  font(d, 'italic', 4);
  d.text('Atualiza no exato momento da impressao.', cx + 2, iy + 2);
  iy += 4.5;

  ink(d, C.body);
  font(d, 'bold', 5);
  d.text('Quantidade (etiquetas)', cx + 2, iy + 2);
  iy += 3;
  input(d, cx + 2, iy, cw - 4, 4.5, '1');
  iy += 8;
  btn(d, cx, iy, 16, 5, 'Voltar', false);
  btn(d, cx + cw - 16, iy, 16, 5, 'Avancar', true);
}

function mockNcs(d, x, y, w, h) {
  const { cx, cy, cw } = appShell(d, x, y, w, h, 'nutri', 'Avaliacao');
  let yy = header(d, cx, cy + 1, 'Nao-conformidades', 'Plano de acao 5W2H');
  btn(d, cx + cw - 18, cy - 1, 18, 5, '+ Nova NC', true);
  yy += 2;
  ink(d, C.muted);
  font(d, 'bold', 4.5);
  d.text('POR CLIENTE', cx, yy);
  yy += 3;
  const cwid = (cw - 6) / 4;
  [
    ['Mar Azul', '5', true],
    ['Imbetiba', '3', false],
    ['Cantina', '2', false],
    ['Hotel Litoral', '1', false],
  ].forEach(([n, v, active], i) => {
    const bx = cx + i * (cwid + 2);
    fill(d, active ? C.brandSoft : C.white);
    stroke(d, active ? C.brand : C.hair, 0.2);
    rrect(d, bx, yy, cwid, 12, 1, 'FD');
    ink(d, C.muted);
    font(d, 'normal', 4);
    d.text(n, bx + 1.5, yy + 2.5);
    ink(d, C.ink);
    font(d, 'bold', 8);
    d.text(v, bx + 1.5, yy + 7);
    ink(d, C.muted);
    font(d, 'normal', 4);
    d.text('em aberto', bx + 6, yy + 7);
    if (active) pill(d, bx + 1.5, yy + 9, 8, 2.4, '2 crit', C.redSoft, C.red);
  });
  yy += 15;

  [
    ['Critica', 'Geladeira fora da faixa ha 3 dias', C.red, C.redSoft],
    ['Alta', 'Manipulador sem ASO em dia', C.amber, C.amberSoft],
    ['Media', 'POP de higienizacao nao assinado', C.blue, C.blueSoft],
  ].forEach(([sev, desc, fg, bg]) => {
    card(d, cx, yy, cw, 11);
    pill(d, cx + 2, yy + 2, 12, 3, sev, bg, fg);
    pill(d, cx + 15, yy + 2, 10, 3, 'Aberta', C.redSoft, C.red);
    ink(d, C.ink);
    font(d, 'bold', 5.5);
    d.text(desc, cx + 2, yy + 7);
    ink(d, C.muted);
    font(d, 'normal', 4.5);
    d.text('Prazo: 03/02/2026 (vencida)', cx + 2, yy + 9.5);
    yy += 12;
  });
}

function mockVisitas(d, x, y, w, h) {
  const { cx, cy, cw } = appShell(d, x, y, w, h, 'nutri', 'Avaliacao');
  let yy = cy + 1;
  ink(d, C.muted);
  font(d, 'normal', 5);
  d.text('Voltar', cx + 3, yy + 2);
  drawChevron(d, cx + 1, yy + 1.3, 1, C.muted, 'l');
  yy += 5;
  ink(d, C.ink);
  font(d, 'bold', 8);
  d.text('Restaurante Mar Azul', cx, yy + 3);
  ink(d, C.muted);
  font(d, 'normal', 5);
  d.text('Checklist RDC 216 - visita mensal', cx, yy + 7);
  pill(d, cx + cw - 24, yy + 1, 24, 6, 'Score 82%', C.amberSoft, C.amber);
  yy += 12;

  btn(d, cx, yy, 18, 5, 'Reagendar', false);
  btn(d, cx + 19, yy, 16, 5, 'Cancelar', false);
  btn(d, cx + 36, yy, 22, 5, 'Salvar rascunho', false);
  btn(d, cx + cw - 16, yy, 16, 5, 'Finalizar', true);
  yy += 8;

  card(d, cx, yy, cw, 15);
  ink(d, C.body);
  font(d, 'bold', 5.5);
  d.text('Score por categoria', cx + 2, yy + 3);
  ['Edificacao', 'Higiene', 'Manipul.', 'Temperatura'].forEach((cat, i) => {
    const bx = cx + 2 + i * ((cw - 4) / 4);
    const bw = (cw - 4) / 4 - 2;
    const val = [0.9, 0.7, 0.85, 0.6][i];
    fill(d, C.hair);
    rrect(d, bx, yy + 6, bw, 1.5, 0.5, 'F');
    fill(d, val >= 0.85 ? C.brand : val >= 0.7 ? C.amber : C.red);
    rrect(d, bx, yy + 6, bw * val, 1.5, 0.5, 'F');
    ink(d, C.muted);
    font(d, 'normal', 4);
    d.text(cat, bx, yy + 10);
  });
  yy += 18;

  card(d, cx, yy, cw, h - (yy - y) - 6);
  let iy = yy + 2;
  ink(d, C.muted);
  font(d, 'bold', 4.5);
  d.text('HIGIENE', cx + 2, iy + 2);
  iy += 4;
  ['Bancadas limpas', 'Pia higienizada', 'Lixo segregado'].forEach((it, i) => {
    fill(d, C.white);
    stroke(d, C.hair, 0.15);
    rrect(d, cx + 2, iy, cw - 4, 6, 0.8, 'FD');
    ink(d, C.body);
    font(d, 'normal', 5);
    d.text(it, cx + 4, iy + 3.7);
    ['C', 'NC', 'NA'].forEach((opt, j) => {
      const ox = cx + cw - 22 + j * 7;
      const sel = (i === 1 && opt === 'NC') || (i !== 1 && opt === 'C');
      const isNc = opt === 'NC';
      fill(d, sel ? (isNc ? C.redSoft : C.brandSoft) : C.white);
      stroke(d, sel ? (isNc ? C.red : C.brand) : C.hair, 0.2);
      rrect(d, ox, iy + 1, 6, 4, 0.8, 'FD');
      ink(d, sel ? (isNc ? C.red : C.brand) : C.muted);
      font(d, 'bold', 4.5);
      d.text(opt, ox + 3, iy + 3.6, { align: 'center' });
    });
    iy += 7;
  });
}

function mockTemperatura(d, x, y, w, h) {
  const { cx, cy, cw } = appShell(d, x, y, w, h, 'nutri', 'Acompanha.');
  let yy = header(d, cx, cy + 1, 'Temperatura', 'Equipamentos e leituras');
  btn(d, cx + cw - 18, cy - 1, 18, 5, '+ Equip.', true);
  yy += 2;
  const hw = (cw - 3) / 2;
  card(d, cx, yy, hw, 32);
  ink(d, C.body);
  font(d, 'bold', 5.5);
  d.text('Equipamentos', cx + 2, yy + 3);
  let ey = yy + 6;
  [
    ['Geladeira cozinha', '0 a 8 C'],
    ['Freezer estoque', '-22 a -15 C'],
    ['Estufa balcao', '60 a 90 C'],
  ].forEach(([n, sub]) => {
    ink(d, C.ink);
    font(d, 'bold', 5);
    d.text(n, cx + 2, ey + 2);
    ink(d, C.muted);
    font(d, 'normal', 4.5);
    d.text(sub, cx + 2, ey + 4.6);
    ey += 7;
  });

  card(d, cx + hw + 3, yy, hw, 32);
  ink(d, C.body);
  font(d, 'bold', 5.5);
  d.text('Registrar leitura', cx + hw + 5, yy + 3);
  let ry = yy + 6;
  input(d, cx + hw + 5, ry, hw - 6, 4, 'Geladeira cozinha');
  ry += 5.5;
  input(d, cx + hw + 5, ry, hw - 6, 4, 'Ex.: 4.5 C');
  ry += 5.5;
  fill(d, C.brandSoft);
  rrect(d, cx + hw + 5, ry, 20, 4.5, 0.8, 'F');
  fill(d, C.brand);
  rrect(d, cx + hw + 6.5, ry + 1, 2.5, 2.5, 0.4, 'F');
  ink(d, C.brandDeep);
  font(d, 'bold', 4.3);
  d.text('Anexar foto', cx + hw + 10, ry + 3);
  ry += 6;
  btn(d, cx + hw + 5, ry, hw - 6, 5, 'Registrar', true);
  yy += 35;

  card(d, cx, yy, cw, h - (yy - y) - 6);
  ink(d, C.body);
  font(d, 'bold', 5.5);
  d.text('Ultimas leituras', cx + 2, yy + 3);
  let ly = yy + 6;
  [
    ['Geladeira cozinha', '4.5 C', false],
    ['Freezer estoque', '-12 C', true],
  ].forEach(([n, t, out]) => {
    fill(d, out ? C.redSoft : C.brandSoft);
    rrect(d, cx + 2, ly, 4, 4, 0.8, 'F');
    ink(d, C.ink);
    font(d, 'bold', 5);
    d.text(`${n} - ${t}`, cx + 8, ly + 2);
    ink(d, C.muted);
    font(d, 'normal', 4.5);
    d.text('26/01 15:30 - Ariane', cx + 8, ly + 4.5);
    fill(d, C.hair);
    rrect(d, cx + cw - 7, ly, 4, 4, 0.5, 'F');
    ly += 6;
  });
}

function mockDocumentos(d, x, y, w, h) {
  const { cx, cy, cw } = appShell(d, x, y, w, h, 'property', 'Conformidade');
  let yy = header(d, cx, cy + 1, 'Documentos', 'Carregue os documentos da empresa');
  btn(d, cx + cw - 18, cy - 1, 18, 5, '+ Adicionar', true);
  yy += 2;
  card(d, cx, yy, cw, 11);
  ink(d, C.muted);
  font(d, 'normal', 4.5);
  d.text('Carregue cada documento na gaveta certa. PDF/imagem ate 20 MB.', cx + 2, yy + 3);
  ink(d, C.ink);
  font(d, 'bold', 7);
  d.text('14', cx + cw - 16, yy + 4.5);
  ink(d, C.muted);
  font(d, 'normal', 4);
  d.text('/ 22 entregues', cx + cw - 13, yy + 4.5);
  fill(d, C.hair);
  rrect(d, cx + 2, yy + 7.5, cw - 4, 1.6, 0.6, 'F');
  fill(d, C.brand);
  rrect(d, cx + 2, yy + 7.5, (cw - 4) * 0.64, 1.6, 0.6, 'F');
  yy += 14;

  const groups = [
    ['Funcionarios e saude', ['ASO', 'Exames de fezes']],
    ['Controles periodicos', ['Dedetizacao', 'Reservatorio agua']],
    ['Manuais e planilhas', ['Manual BP', 'Cronograma limpeza']],
  ];
  groups.forEach(([g, items]) => {
    card(d, cx, yy, cw, 14);
    ink(d, C.ink);
    font(d, 'bold', 5.5);
    d.text(g, cx + 2, yy + 3);
    const iw = (cw - 6) / 2;
    items.forEach((it, i) => {
      const ix = cx + 2 + i * (iw + 2);
      stroke(d, C.hair, 0.15);
      rrect(d, ix, yy + 5, iw, 7, 0.8, 'S');
      const done = i === 0;
      fill(d, done ? C.brandSoft : C.hair);
      d.circle(ix + 2, yy + 8.5, 1.3, 'F');
      if (done) drawCheck(d, ix + 2, yy + 8.5, 0.9, C.brand);
      ink(d, C.body);
      font(d, 'bold', 4.5);
      d.text(it, ix + 4.5, yy + 8);
      ink(d, C.muted);
      font(d, 'normal', 3.7);
      d.text(done ? '2 anexos' : 'Pendente', ix + 4.5, yy + 10.5);
    });
    yy += 16;
  });
}

function mockManipuladores(d, x, y, w, h) {
  const { cx, cy, cw } = appShell(d, x, y, w, h, 'nutri', 'Avaliacao');
  let yy = header(d, cx, cy + 1, 'Manipuladores', 'ASOs, treinamentos e historico');
  btn(d, cx + cw - 22, cy - 1, 22, 5, '+ Novo funcionario', true);
  yy += 2;
  const kw = (cw - 6) / 4;
  [
    ['18', 'Ativos'],
    ['3', 'ASO vencendo'],
    ['1', 'ASO vencido'],
    ['12', 'Treinamentos'],
  ].forEach(([n, l], i) => {
    const kx = cx + i * (kw + 2);
    card(d, kx, yy, kw, 11);
    ink(d, C.ink);
    font(d, 'bold', 8);
    d.text(n, kx + 1.5, yy + 6);
    ink(d, C.muted);
    font(d, 'normal', 4.3);
    d.text(l, kx + 1.5, yy + 9);
  });
  yy += 14;

  card(d, cx, yy, cw, h - (yy - y) - 6);
  let iy = yy + 2;
  fill(d, C.brandSoft);
  rrect(d, cx + 1, iy, cw - 2, 4, 0.5, 'F');
  ink(d, C.brandDeep);
  font(d, 'bold', 4.5);
  d.text('NOME', cx + 3, iy + 2.8);
  d.text('FUNCAO', cx + 48, iy + 2.8);
  d.text('ASO', cx + 90, iy + 2.8);
  d.text('TREINAM.', cx + 118, iy + 2.8);
  iy += 5;
  [
    ['Maria Silva Santos', 'Cozinheira', '12/2026', '3', C.brand, C.brandSoft],
    ['Joao Oliveira', 'Auxiliar', '03/2026', '2', C.amber, C.amberSoft],
    ['Ana Costa', 'Manipuladora', '08/2025', '4', C.red, C.redSoft],
    ['Pedro Souza', 'Chef', '11/2026', '5', C.brand, C.brandSoft],
    ['Carla Lima', 'Cozinheira', '02/2027', '3', C.brand, C.brandSoft],
  ].forEach(([name, role, aso, tr, fg, bg]) => {
    ink(d, C.ink);
    font(d, 'normal', 5);
    d.text(name, cx + 3, iy + 2.8);
    ink(d, C.body);
    font(d, 'normal', 4.5);
    d.text(role, cx + 48, iy + 2.8);
    pill(d, cx + 90, iy + 0.5, 16, 3, aso, bg, fg);
    ink(d, C.body);
    font(d, 'normal', 4.5);
    d.text(tr, cx + 118, iy + 2.8);
    stroke(d, C.hair, 0.1);
    d.line(cx + 2, iy + 4.5, cx + cw - 2, iy + 4.5);
    iy += 5;
  });
}

function mockProducao(d, x, y, w, h) {
  const { cx, cy, cw } = appShell(d, x, y, w, h, 'property', 'Producao');
  let yy = header(d, cx, cy + 1, 'Producao (etiquetas em uso)', 'Aguardando baixa');
  yy += 2;
  const sw = (cw - 6) / 3;
  [
    ['12', 'Itens ativos', C.brand],
    ['4', 'Vencendo', C.amber],
    ['2', 'Vencidos', C.red],
  ].forEach(([n, l, color], i) => {
    const kx = cx + i * (sw + 3);
    card(d, kx, yy, sw, 12);
    fill(d, color);
    opacity(d, 0.15);
    rrect(d, kx + 1.5, yy + 1.5, 4, 4, 0.8, 'F');
    opacity(d, 1);
    ink(d, C.ink);
    font(d, 'bold', 8);
    d.text(n, kx + 1.5, yy + 7);
    ink(d, C.muted);
    font(d, 'normal', 4.5);
    d.text(l, kx + 1.5, yy + 10);
  });
  yy += 15;

  const cwid = (cw - 6) / 3;
  const labels = [
    'Salada Caesar',
    'Risoto cogumelos',
    'Molho rose',
    'Sopa creme',
    'Frango assado',
    'Arroz integral',
  ];
  for (let r = 0; r < 2; r++) {
    for (let col = 0; col < 3; col++) {
      const bx = cx + col * (cwid + 3);
      const by = yy + r * 23;
      const exp = r === 1 && col === 0;
      const soon = r === 0 && col === 2;
      card(d, bx, by, cwid, 21);
      const bg = exp ? C.redSoft : soon ? C.amberSoft : C.brandSoft;
      const fg = exp ? C.red : soon ? C.amber : C.brand;
      fill(d, bg);
      rrect(d, bx + 1.5, by + 1.5, 4, 4, 0.8, 'F');
      pill(d, bx + cwid - 14, by + 1.5, 12, 3, exp ? 'Vencido' : soon ? 'Hoje' : 'Vence 3d', bg, fg);
      ink(d, C.ink);
      font(d, 'bold', 5);
      d.text(labels[r * 3 + col], bx + 2, by + 8);
      ink(d, C.muted);
      font(d, 'normal', 4);
      d.text('Lote: L-2026-01-A', bx + 2, by + 11);
      d.text('Manip.: 26/01 10:00', bx + 2, by + 13.5);
      d.text('Resp.: Maria S.', bx + 2, by + 16);
      btn(d, bx + 1.5, by + 17.5, cwid - 3, 3, 'Dar baixa', true);
    }
  }
}

function mockEstoqueRecebimento(d, x, y, w, h) {
  const { cx, cy, cw } = appShell(d, x, y, w, h, 'property', 'Estoque');
  let yy = header(d, cx, cy + 1, 'Recebimentos', 'Conferencia de notas e temperaturas');
  btn(d, cx + cw - 22, cy - 1, 22, 5, '+ Novo recebimento', true);
  yy += 2;
  [
    ['Distribuidora Alfa', 'NF 12345 - 26/01', 8, 0],
    ['Hortifruti Beta', 'NF 67890 - 25/01', 5, 1],
    ['Frigorifico Gama', 'NF 11122 - 24/01', 12, 0],
  ].forEach(([name, sub, items, rej]) => {
    card(d, cx, yy, cw, 14);
    ink(d, C.ink);
    font(d, 'bold', 6);
    d.text(name, cx + 2, yy + 4);
    ink(d, C.muted);
    font(d, 'normal', 4.5);
    d.text(sub, cx + 2, yy + 7);
    pill(d, cx + cw - 32, yy + 1.5, 16, 3.5, `${items} itens`, C.brandSoft, C.brandDeep);
    if (rej > 0)
      pill(d, cx + cw - 14, yy + 1.5, 12, 3.5, `${rej} rejeit`, C.redSoft, C.red);
    ink(d, C.muted);
    font(d, 'normal', 4);
    d.text('Conformes', cx + 2, yy + 11);
    fill(d, C.hair);
    rrect(d, cx + 20, yy + 9.5, cw - 24, 1.2, 0.4, 'F');
    fill(d, rej > 0 ? C.amber : C.brand);
    rrect(d, cx + 20, yy + 9.5, (cw - 24) * (1 - rej / items), 1.2, 0.4, 'F');
    ink(d, C.body);
    font(d, 'bold', 4);
    d.text(`${items - rej}/${items}`, cx + cw - 2, yy + 10.5, { align: 'right' });
    yy += 16;
  });
}

// Mockup GENÉRICO — usado para funções sem tela dedicada.
function mockGeneric(d, x, y, w, h, role, feature) {
  const menu = role === 'nutri' ? 'Acompanha.' : 'Cadastros';
  const { cx, cy, cw } = appShell(d, x, y, w, h, role, menu);
  let yy = header(d, cx, cy + 1, feature.title, feature.subtitle);
  btn(d, cx + cw - 16, cy - 1, 16, 5, '+ Novo', true);
  yy += 2;

  // KPI row
  const kw = (cw - 6) / 3;
  [
    ['REGISTROS', '24'],
    ['ESTE MES', '8'],
    ['PENDENTES', '2'],
  ].forEach(([l, v], i) => {
    const kx = cx + i * (kw + 3);
    card(d, kx, yy, kw, 11);
    ink(d, C.muted);
    font(d, 'normal', 4.3);
    d.text(l, kx + 1.5, yy + 3);
    ink(d, C.ink);
    font(d, 'bold', 8);
    d.text(v, kx + 1.5, yy + 8.5);
  });
  yy += 14;

  // Busca
  card(d, cx, yy, cw, 6);
  input(d, cx + 2, yy + 1.5, cw * 0.5, 3.5, 'Buscar...');
  pill(d, cx + cw * 0.5 + 4, yy + 1.5, 14, 3.5, 'Filtro', C.brandSoft, C.brandDeep);
  yy += 8;

  // Lista genérica
  card(d, cx, yy, cw, h - (yy - y) - 6);
  let iy = yy + 2;
  for (let i = 0; i < 5; i++) {
    fill(d, C.white);
    stroke(d, C.hair, 0.12);
    rrect(d, cx + 2, iy, cw - 4, 6.5, 0.8, 'FD');
    fill(d, C.brandSoft);
    rrect(d, cx + 3.5, iy + 1.2, 4, 4, 0.6, 'F');
    fill(d, C.brand);
    d.circle(cx + 5.5, iy + 3.2, 0.8, 'F');
    ink(d, C.ink);
    font(d, 'bold', 5);
    d.text(`${feature.title} ${String(i + 1).padStart(2, '0')}`, cx + 9.5, iy + 3);
    ink(d, C.muted);
    font(d, 'normal', 4);
    d.text('Atualizado 26/01/2026 - responsavel cadastrado', cx + 9.5, iy + 5.2);
    pill(
      d,
      cx + cw - 16,
      iy + 1.8,
      12,
      3,
      i === 2 ? 'Atencao' : 'Ativo',
      i === 2 ? C.amberSoft : C.brandSoft,
      i === 2 ? C.amber : C.brand,
    );
    iy += 7.5;
  }
}

// ====== Mockups do PLATFORM ADMIN ======

function mockAdminCentro(d, x, y, w, h) {
  const { cx, cy, cw } = appShell(d, x, y, w, h, 'platform_admin', 'Plataforma');
  let yy = header(d, cx, cy + 1, 'Centro de controle', 'Visao geral do SaaS');
  yy += 2;
  const kw = (cw - 9) / 4;
  [
    ['ORGS ATIVAS', '24'],
    ['EMPRESAS', '87'],
    ['USUARIOS', '142'],
    ['ETIQUETAS 30d', '12.4k'],
  ].forEach(([l, v], i) => {
    const kx = cx + i * (kw + 3);
    card(d, kx, yy, kw, 12);
    ink(d, C.muted);
    font(d, 'normal', 4.3);
    d.text(l, kx + 1.5, yy + 3);
    ink(d, C.ink);
    font(d, 'bold', 8.5);
    d.text(v, kx + 1.5, yy + 9);
  });
  yy += 15;
  card(d, cx, yy, cw, 24);
  ink(d, C.body);
  font(d, 'bold', 6);
  d.text('Alertas que exigem acao', cx + 2, yy + 3);
  let ay = yy + 6;
  [
    ['3 orgs em trial vencendo em 7d', C.amber],
    ['2 orgs sem login ha 30 dias', C.amber],
    ['1 hardware com erro recorrente', C.red],
  ].forEach(([t, color]) => {
    fill(d, color);
    opacity(d, 0.15);
    rrect(d, cx + 2, ay, cw - 4, 5, 0.5, 'F');
    opacity(d, 1);
    fill(d, color);
    rrect(d, cx + 2, ay, 1.2, 5, 0.3, 'F');
    ink(d, C.body);
    font(d, 'bold', 5);
    d.text(t, cx + 5, ay + 3.2);
    drawChevron(d, cx + cw - 4, ay + 2.4, 1, color, 'r');
    ay += 6;
  });
  yy += 27;
  card(d, cx, yy, cw, h - (yy - y) - 6);
  ink(d, C.body);
  font(d, 'bold', 6);
  d.text('Eventos recentes', cx + 2, yy + 3);
  let ey = yy + 6;
  [
    ['Nova empresa', 'Restaurante Mar Azul (Royal Nutri)', '2 min'],
    ['Trial criado', 'Cafe da Esquina', '15 min'],
    ['Plano alterado', 'AP Madureira -> Profissional', '1h'],
    ['Push enviado', 'Manutencao programada', '3h'],
  ].forEach(([action, target, when]) => {
    fill(d, C.brandSoft);
    d.circle(cx + 4, ey + 2, 1.4, 'F');
    ink(d, C.ink);
    font(d, 'bold', 5);
    d.text(action, cx + 7, ey + 1.5);
    ink(d, C.muted);
    font(d, 'normal', 4.5);
    d.text(target, cx + 7, ey + 3.8);
    ink(d, C.faint);
    font(d, 'normal', 4);
    d.text(when, cx + cw - 3, ey + 2.5, { align: 'right' });
    stroke(d, C.hair, 0.1);
    d.line(cx + 2, ey + 5.5, cx + cw - 2, ey + 5.5);
    ey += 6;
  });
}

function mockAdminDashboard(d, x, y, w, h) {
  const { cx, cy, cw } = appShell(d, x, y, w, h, 'platform_admin', 'Plataforma');
  let yy = header(d, cx, cy + 1, 'Dashboard SaaS', 'Saude e uso das organizacoes');
  yy += 2;
  // Tabs
  ['Saude das orgs', 'Uso de features', 'Crescimento'].forEach((t, i) => {
    const tx = cx + i * 32;
    fill(d, i === 0 ? C.brandSoft : C.white);
    stroke(d, i === 0 ? C.brand : C.hair, 0.2);
    rrect(d, tx, yy, 30, 5, 0.8, 'FD');
    ink(d, i === 0 ? C.brandDark : C.muted);
    font(d, 'bold', 4.5);
    d.text(t, tx + 15, yy + 3.2, { align: 'center' });
  });
  yy += 7;
  // Lista de orgs
  card(d, cx, yy, cw, h - (yy - y) - 6);
  let iy = yy + 2;
  fill(d, C.brandSoft);
  rrect(d, cx + 1, iy, cw - 2, 4, 0.5, 'F');
  ink(d, C.brandDeep);
  font(d, 'bold', 4.3);
  d.text('ORGANIZACAO', cx + 3, iy + 2.8);
  d.text('SCORE', cx + 60, iy + 2.8);
  d.text('NCs', cx + 80, iy + 2.8);
  d.text('ETIQ. 30d', cx + 95, iy + 2.8);
  d.text('ULT. LOGIN', cx + 120, iy + 2.8);
  iy += 5;
  [
    ['Royal Nutri', '88%', 'green', 4, '1.2k', 'hoje'],
    ['AP Madureira Servicos', '72%', 'amber', 11, '845', '2d'],
    ['ProActive Consultoria', '92%', 'green', 2, '2.1k', 'hoje'],
    ['LucasTeste', '58%', 'red', 18, '320', '15d'],
    ['Demo (manual PDF)', '82%', 'amber', 3, '8', 'hoje'],
  ].forEach(([name, score, tier, ncs, eti, login]) => {
    const fg = tier === 'green' ? C.brand : tier === 'amber' ? C.amber : C.red;
    const bg = tier === 'green' ? C.brandSoft : tier === 'amber' ? C.amberSoft : C.redSoft;
    ink(d, C.ink);
    font(d, 'bold', 4.8);
    d.text(name, cx + 3, iy + 2.8);
    pill(d, cx + 60, iy + 0.5, 14, 3, score, bg, fg);
    ink(d, C.body);
    font(d, 'normal', 4.5);
    d.text(String(ncs), cx + 80, iy + 2.8);
    d.text(eti, cx + 95, iy + 2.8);
    d.text(login, cx + 120, iy + 2.8);
    stroke(d, C.hair, 0.1);
    d.line(cx + 2, iy + 4.5, cx + cw - 2, iy + 4.5);
    iy += 5;
  });
}

function mockAdminOrgs(d, x, y, w, h) {
  const { cx, cy, cw } = appShell(d, x, y, w, h, 'platform_admin', 'Plataforma');
  let yy = header(d, cx, cy + 1, 'Organizacoes', 'Clientes do SaaS');
  btn(d, cx + cw - 18, cy - 1, 18, 5, '+ Nova org', true);
  yy += 2;
  card(d, cx, yy, cw, 6);
  input(d, cx + 2, yy + 1.5, 55, 3.5, 'Buscar organizacao...');
  pill(d, cx + 60, yy + 1.5, 12, 3.5, 'Ativas', C.brandSoft, C.brandDeep);
  pill(d, cx + 74, yy + 1.5, 12, 3.5, 'Trial', C.amberSoft, C.amber);
  pill(d, cx + 88, yy + 1.5, 14, 3.5, 'Suspensas', C.redSoft, C.red);
  yy += 8;

  card(d, cx, yy, cw, h - (yy - y) - 6);
  let iy = yy + 2;
  [
    ['Royal Nutri', 'royal-nutri - Profissional', 6, 'Ativa', C.brand],
    ['AP Madureira Servicos', 'ap-madureira-servicos - Essencial', 4, 'Ativa', C.brand],
    ['ProActive Consultoria', 'proactive - Premium', 12, 'Ativa', C.brand],
    ['Cafe da Esquina', 'cafe-esquina - Trial', 1, 'Trial 7d', C.amber],
    ['Demo (manual PDF)', 'demo-manual - Profissional', 1, 'Ativa', C.brand],
  ].forEach(([name, sub, comps, status, color]) => {
    fill(d, C.white);
    stroke(d, C.hair, 0.15);
    rrect(d, cx + 2, iy, cw - 4, 8, 1, 'FD');
    fill(d, C.brandSoft);
    rrect(d, cx + 3.5, iy + 1.5, 5, 5, 0.6, 'F');
    ink(d, C.brandDeep);
    font(d, 'bold', 4);
    d.text(name.slice(0, 2).toUpperCase(), cx + 6, iy + 4.6, { align: 'center' });
    ink(d, C.ink);
    font(d, 'bold', 5.5);
    d.text(name, cx + 10, iy + 3.5);
    ink(d, C.muted);
    font(d, 'normal', 4.3);
    d.text(sub, cx + 10, iy + 6);
    ink(d, C.body);
    font(d, 'normal', 4.5);
    d.text(`${comps} empresa(s)`, cx + cw - 30, iy + 4.5);
    const tone = color === C.brand ? C.brandSoft : C.amberSoft;
    pill(d, cx + cw - 16, iy + 2, 14, 3.5, status, tone, color);
    drawChevron(d, cx + cw - 4, iy + 4, 1, C.faint, 'r');
    iy += 9;
  });
}

function mockAdminPlanos(d, x, y, w, h) {
  const { cx, cy, cw } = appShell(d, x, y, w, h, 'platform_admin', 'Plataforma');
  let yy = header(d, cx, cy + 1, 'Planos', 'Modulos e limites por plano');
  btn(d, cx + cw - 18, cy - 1, 18, 5, '+ Novo plano', true);
  yy += 2;

  const colW = (cw - 9) / 3;
  ['Essencial', 'Profissional', 'Premium'].forEach((plan, i) => {
    const px = cx + i * (colW + 3);
    const featured = i === 1;
    fill(d, featured ? C.brand : C.white);
    stroke(d, featured ? C.brand : C.hair, 0.3);
    rrect(d, px, yy, colW, 60, 2, 'FD');
    if (featured) {
      fill(d, [187, 231, 198]);
      rrect(d, px + colW / 2 - 12, yy - 2, 24, 4, 1, 'F');
      ink(d, C.brandDeep);
      font(d, 'bold', 4);
      d.text('MAIS ESCOLHIDO', px + colW / 2, yy + 0.8, { align: 'center' });
    }
    ink(d, featured ? C.white : C.ink);
    font(d, 'bold', 7);
    d.text(plan, px + colW / 2, yy + 6, { align: 'center' });
    font(d, 'bold', 11);
    d.text(['R$ 99', 'R$ 199', 'R$ 399'][i], px + colW / 2, yy + 14, { align: 'center' });
    ink(d, featured ? [200, 225, 212] : C.muted);
    font(d, 'normal', 4.5);
    d.text(['Ate 2 empresas', 'Ate 5 empresas', 'Ilimitado'][i], px + colW / 2, yy + 19, { align: 'center' });

    const mods = [
      ['Etiquetas', true, true, true],
      ['Checklists', i >= 1, true, true],
      ['NCs', i >= 1, true, true],
      ['Pragas', i >= 1, true, true],
      ['Estoque', i >= 2, true, true],
      ['Dossie', false, i >= 1, true],
    ];
    let my = yy + 26;
    mods.forEach(([m, ...vals]) => {
      const ok = vals[i];
      drawCheck(d, px + 4, my, 1.2, ok ? (featured ? C.white : C.brand) : C.faint);
      ink(d, featured ? C.white : C.body);
      font(d, ok ? 'bold' : 'normal', 4.8);
      d.text(m, px + 7, my + 0.8);
      my += 4.5;
    });

    btn(d, px + 2, yy + 53, colW - 4, 5, 'Editar', !featured);
  });
}

function mockAdminBiblioteca(d, x, y, w, h) {
  const { cx, cy, cw } = appShell(d, x, y, w, h, 'platform_admin', 'Plataforma');
  let yy = header(d, cx, cy + 1, 'Biblioteca global', 'Modelos compartilhados');
  btn(d, cx + cw - 22, cy - 1, 22, 5, '+ Novo modelo', true);
  yy += 2;

  ['Checklists', 'Produtos seed', 'Documentos'].forEach((t, i) => {
    const tx = cx + i * 32;
    fill(d, i === 0 ? C.brandSoft : C.white);
    stroke(d, i === 0 ? C.brand : C.hair, 0.2);
    rrect(d, tx, yy, 30, 5, 0.8, 'FD');
    ink(d, i === 0 ? C.brandDark : C.muted);
    font(d, 'bold', 4.5);
    d.text(t, tx + 15, yy + 3.2, { align: 'center' });
  });
  yy += 8;

  [
    ['RDC 216 - Diaria de limpeza', '12 itens - Diario', '23 orgs clonaram'],
    ['RDC 216 - Pre-abertura', '8 itens - Diario', '18 orgs clonaram'],
    ['RDC 275 - POPs verificacao', '15 itens - Semanal', '15 orgs clonaram'],
    ['RDC 259 - Rotulagem', '10 itens - Mensal', '11 orgs clonaram'],
  ].forEach(([name, sub, usage]) => {
    card(d, cx, yy, cw, 11);
    fill(d, C.brandSoft);
    rrect(d, cx + 2, yy + 2, 7, 7, 1, 'F');
    fill(d, C.brand);
    drawCheck(d, cx + 5.5, yy + 5.5, 2, C.white);
    ink(d, C.ink);
    font(d, 'bold', 5.5);
    d.text(name, cx + 12, yy + 4);
    ink(d, C.muted);
    font(d, 'normal', 4.3);
    d.text(sub, cx + 12, yy + 6.5);
    pill(d, cx + cw - 26, yy + 4, 24, 3.5, usage, C.brandSoft, C.brandDeep);
    yy += 13;
  });
}

function mockAdminTrilha(d, x, y, w, h) {
  const { cx, cy, cw } = appShell(d, x, y, w, h, 'platform_admin', 'Admin');
  let yy = header(d, cx, cy + 1, 'Trilha de auditoria', 'Historico imutavel de mudancas');
  yy += 2;
  card(d, cx, yy, cw, 6);
  input(d, cx + 2, yy + 1.5, 40, 3.5, 'Entidade...');
  input(d, cx + 44, yy + 1.5, 30, 3.5, 'Ator...');
  pill(d, cx + 76, yy + 1.5, 20, 3.5, 'Ultimos 30 dias', C.brandSoft, C.brandDeep);
  yy += 8;

  card(d, cx, yy, cw, h - (yy - y) - 6);
  let iy = yy + 2;
  [
    ['profiles', 'role', 'Lucas (admin)', 'Pedro -> property_manager', '2h'],
    ['profiles', 'create', 'Ariane (nutri)', 'Cozinha Demo', '5h'],
    ['organizations', 'plan_key', 'Lucas (admin)', 'essencial -> profissional', '1d'],
    ['companies', 'delete', 'Ariane (nutri)', 'Soft delete: Padaria X', '2d'],
    ['profiles', 'impersonate', 'Lucas (admin)', 'logou como Ariane', '3d'],
  ].forEach(([ent, act, who, what, when]) => {
    fill(d, C.white);
    stroke(d, C.hair, 0.12);
    rrect(d, cx + 2, iy, cw - 4, 7, 0.8, 'FD');
    pill(d, cx + 4, iy + 1.8, 16, 3, ent, C.brandSoft, C.brandDeep);
    pill(d, cx + 21, iy + 1.8, 14, 3, act, C.amberSoft, C.amber);
    ink(d, C.ink);
    font(d, 'bold', 4.5);
    d.text(who, cx + 4, iy + 6);
    ink(d, C.muted);
    font(d, 'normal', 4.3);
    d.text(what, cx + 35, iy + 4);
    ink(d, C.faint);
    font(d, 'normal', 4);
    d.text(when, cx + cw - 4, iy + 4, { align: 'right' });
    iy += 8;
  });
}

function mockAdminComunicados(d, x, y, w, h) {
  const { cx, cy, cw } = appShell(d, x, y, w, h, 'platform_admin', 'Plataforma');
  let yy = header(d, cx, cy + 1, 'Comunicados', 'Banner global para todas as orgs');
  btn(d, cx + cw - 18, cy - 1, 18, 5, '+ Novo', true);
  yy += 2;

  // Preview do banner em destaque
  fill(d, C.amberSoft);
  rrect(d, cx, yy, cw, 8, 1, 'F');
  fill(d, C.amber);
  rrect(d, cx, yy, 1.5, 8, 0.5, 'F');
  ink(d, [120, 65, 6]);
  font(d, 'bold', 5);
  d.text('PREVIEW DO BANNER ATIVO', cx + 4, yy + 3);
  font(d, 'normal', 4.8);
  d.text('Manutencao programada no dia 15/06 das 02h as 04h. Sem impacto previsto.', cx + 4, yy + 5.8);
  yy += 11;

  ink(d, C.body);
  font(d, 'bold', 5.5);
  d.text('Historico', cx, yy);
  yy += 3;

  [
    ['Manutencao programada 15/06', 'Atencao - Ativo', C.amberSoft, C.amber],
    ['Nova feature: Carrosseis', 'Info - Encerrado', C.blueSoft, C.blue],
    ['Lembrete: Renovar ASOs', 'Atencao - Encerrado', C.amberSoft, C.amber],
  ].forEach(([title, status, bg, fg]) => {
    card(d, cx, yy, cw, 10);
    ink(d, C.ink);
    font(d, 'bold', 5.5);
    d.text(title, cx + 2, yy + 4);
    pill(d, cx + cw - 24, yy + 2, 22, 3.5, status, bg, fg);
    ink(d, C.muted);
    font(d, 'normal', 4.3);
    d.text('Inicio: 10/06 - Fim: 15/06', cx + 2, yy + 7);
    yy += 12;
  });
}

const MOCKS = {
  'admin-centro': mockAdminCentro,
  'admin-dashboard': mockAdminDashboard,
  'admin-orgs': mockAdminOrgs,
  'admin-planos': mockAdminPlanos,
  'admin-biblioteca': mockAdminBiblioteca,
  'admin-trilha': mockAdminTrilha,
  'admin-comunicados': mockAdminComunicados,
  'nutri-painel': mockNutriPainel,
  'property-painel': mockPropertyPainel,
  'property-imprimir': mockPrintWizard,
  'nutri-ncs': mockNcs,
  'nutri-visitas': mockVisitas,
  'nutri-temperatura': mockTemperatura,
  'nutri-documentos': mockDocumentos,
  'nutri-manipuladores': mockManipuladores,
  'property-producao': mockProducao,
  'property-recebimentos': mockEstoqueRecebimento,
  'property-estoque': mockEstoqueRecebimento,
};

/** Lê largura/altura de um PNG (IHDR: big-endian uint32 em offsets 16 e 20). */
function pngSize(buf) {
  if (buf.length < 24) return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

/** Desenha a "tela": screenshot real se existir, senão mockup. */
function drawScreen(d, x, y, w, h, role, feature) {
  const shotPath = join(SHOTS_DIR, `${feature.screenshot}.png`);
  if (existsSync(shotPath)) {
    try {
      const data = readFileSync(shotPath);
      const b64 = `data:image/png;base64,${data.toString('base64')}`;
      // Fundo + moldura
      fill(d, [241, 245, 244]);
      rrect(d, x, y, w, h, 2, 'F');
      stroke(d, C.hair, 0.3);
      rrect(d, x, y, w, h, 2, 'S');
      // Ajusta preservando proporção (contain), centralizado.
      const dim = pngSize(data);
      let iw = w - 2,
        ih = h - 2,
        ix = x + 1,
        iy = y + 1;
      if (dim && dim.w > 0 && dim.h > 0) {
        const boxR = (w - 2) / (h - 2);
        const imgR = dim.w / dim.h;
        if (imgR > boxR) {
          iw = w - 2;
          ih = iw / imgR;
          iy = y + (h - ih) / 2;
        } else {
          ih = h - 2;
          iw = ih * imgR;
          ix = x + (w - iw) / 2;
        }
      }
      d.addImage(b64, 'PNG', ix, iy, iw, ih, undefined, 'FAST');
      return true;
    } catch {
      /* cai pro mockup */
    }
  }
  const fn = MOCKS[feature.screenshot];
  if (fn) fn(d, x, y, w, h);
  else mockGeneric(d, x, y, w, h, role, feature);
  return false;
}

// ============================================================
//  SEÇÃO: METODOLOGIA (scores e métricas)
// ============================================================

/** Capa da seção de metodologia (página inteira). */
function drawMethodologyDivider(d, meth) {
  fill(d, C.brandDeep);
  d.rect(0, 0, PAGE_W, PAGE_H, 'F');

  ink(d, [200, 225, 212]);
  font(d, 'bold', 10);
  d.text('PARTE ESPECIAL', M, 30, { charSpace: 1.5 });

  ink(d, C.white);
  font(d, 'bold', 28);
  d.text(d.splitTextToSize(meth.title, CONTENT_W), M, 58);

  fill(d, C.white);
  opacity(d, 0.1);
  rrect(d, M, 92, CONTENT_W, 46, 3, 'F');
  opacity(d, 1);
  ink(d, [200, 225, 212]);
  font(d, 'bold', 8);
  d.text('PARA APRESENTAR AO CLIENTE', M + 6, 100, { charSpace: 1 });
  ink(d, C.white);
  font(d, 'normal', 10);
  wrap(d, meth.intro, M + 6, 107, CONTENT_W - 12, 4.8);

  ink(d, [200, 225, 212]);
  font(d, 'bold', 8);
  d.text('O QUE VOCE VAI ENTENDER', M, 153, { charSpace: 1 });
  let y = 161;
  meth.metrics.forEach((m, i) => {
    fill(d, C.brand);
    rrect(d, M, y - 3, 4.5, 4.5, 0.6, 'F');
    ink(d, C.white);
    font(d, 'bold', 5);
    d.text(String(i + 1).padStart(2, '0'), M + 2.25, y, { align: 'center' });
    ink(d, C.white);
    font(d, 'bold', 9.5);
    d.text(m.title, M + 8, y - 0.3);
    ink(d, [180, 205, 192]);
    font(d, 'normal', 7);
    d.text(m.tagline, M + 8, y + 3);
    y += 8.5;
  });

  ink(d, C.white);
  font(d, 'bold', 8);
  d.text('ProActive7 - Manual do Sistema', M, PAGE_H - 15);
}

/** Página de uma métrica, em linguagem de ensino e venda. */
function drawMethodologyPage(d, m, index) {
  let y = drawPageHeader(d);
  ink(d, C.brandDeep);
  font(d, 'bold', 6.5);
  d.text('COMO MEDIMOS', M, y, { charSpace: 1.2 });
  ink(d, C.faint);
  font(d, 'normal', 6.5);
  d.text(`METRICA ${String(index + 1).padStart(2, '0')}`, PAGE_W - M, y, {
    align: 'right',
    charSpace: 0.6,
  });
  y += 4;
  ink(d, C.ink);
  font(d, 'bold', 17);
  d.text(d.splitTextToSize(m.title, CONTENT_W), M, y + 5);
  y += 5 + 6 * d.splitTextToSize(m.title, CONTENT_W).length;

  // Tagline em destaque
  ink(d, C.brand);
  font(d, 'bolditalic', 10);
  y = wrap(d, m.tagline, M, y, CONTENT_W, 5) + 2;

  // Onde aparece (chip)
  fill(d, C.brandSoft);
  const whereLabel = `Onde aparece:  ${m.where}`;
  const ww = d.getTextWidth(whereLabel) + 6;
  rrect(d, M, y, Math.min(ww, CONTENT_W), 6, 3, 'F');
  ink(d, C.brandDeep);
  font(d, 'normal', 7.5);
  d.text(whereLabel, M + 3, y + 4);
  y += 10;

  // O que é
  ink(d, C.body);
  font(d, 'normal', 9.5);
  y = wrap(d, m.plain, M, y, CONTENT_W, 5) + 5;

  // COMO É CALCULADO (linguagem simples)
  if (m.calc && m.calc.length) {
    y = ensure(d, y, 22);
    fill(d, C.brand);
    d.rect(M, y - 3, 1.5, 4, 'F');
    ink(d, C.brandDeep);
    font(d, 'bold', 8);
    d.text('COMO E CALCULADO', M + 3, y);
    y += 5;
    for (const line of m.calc) {
      y = ensure(d, y, 8);
      fill(d, C.brand);
      d.circle(M + 1.4, y + 0.6, 1, 'F');
      ink(d, C.body);
      font(d, 'normal', 9);
      y = wrap(d, line, M + 5, y + 1.4, CONTENT_W - 5, 4.4) + 1.5;
    }
    y += 3;
  }

  // BREAKDOWN visual (barras proporcionais)
  if (m.breakdown && m.breakdown.length) {
    y = ensure(d, y, 14 + m.breakdown.length * 7);
    fill(d, C.brand);
    d.rect(M, y - 3, 1.5, 4, 'F');
    ink(d, C.brandDeep);
    font(d, 'bold', 8);
    // Título: usa breakdownTitle se fornecido; senão escolhe o padrão
    // de "7 frentes" (compliance) baseado no número de partes.
    const sum = m.breakdown.reduce((s, p) => s + p.points, 0);
    const isHundred = sum === 100;
    const defaultTitle = isHundred
      ? `AS ${
          ['UMA', 'DUAS', 'TRES', 'QUATRO', 'CINCO', 'SEIS', 'SETE', 'OITO'][
            m.breakdown.length - 1
          ] ?? m.breakdown.length
        } FRENTES (TOTAL 100 PONTOS)`
      : 'DISTRIBUICAO';
    d.text(m.breakdownTitle || defaultTitle, M + 3, y);
    y += 6;
    // Escala da barra: usa o maior valor do breakdown (não força 25).
    const maxPts = Math.max(...m.breakdown.map((p) => p.points));
    const unit = m.breakdownUnit || (isHundred ? 'pts' : 'itens');
    const barMaxW = 46;
    const labelW = 36;
    for (const part of m.breakdown) {
      y = ensure(d, y, 9);
      ink(d, C.ink);
      font(d, 'bold', 8);
      d.text(part.label, M, y + 1.5, { maxWidth: labelW });
      const bx = M + labelW + 2;
      fill(d, C.hair);
      rrect(d, bx, y, barMaxW, 3.2, 1, 'F');
      fill(d, C.brand);
      rrect(d, bx, y, (part.points / maxPts) * barMaxW, 3.2, 1, 'F');
      ink(d, C.brandDeep);
      font(d, 'bold', 8);
      d.text(`${part.points} ${unit}`, bx + barMaxW + 3, y + 2.6);
      ink(d, C.muted);
      font(d, 'normal', 7);
      const dx = bx + barMaxW + 16;
      d.text(d.splitTextToSize(part.desc, PAGE_W - M - dx), dx, y + 1.5);
      const lines = d.splitTextToSize(part.desc, PAGE_W - M - dx).length;
      y += Math.max(7, lines * 3 + 1.5);
    }
    y += 2;
  }

  // EXEMPLO (caixa destacada)
  if (m.example) {
    const scnLines = d.splitTextToSize(
      'Cenario:  ' + m.example.scenario,
      CONTENT_W - 10,
    );
    const resLines = d.splitTextToSize(
      'Resultado:  ' + m.example.result,
      CONTENT_W - 10,
    );
    const boxH = 9 + scnLines.length * 4.2 + resLines.length * 4.6 + 4;
    y = ensure(d, y, boxH + 4);
    fill(d, [255, 251, 235]);
    rrect(d, M, y, CONTENT_W, boxH, 1.5, 'F');
    fill(d, C.amber);
    rrect(d, M, y, 2, boxH, 1.5, 'F');
    ink(d, [146, 64, 14]);
    font(d, 'bold', 7.5);
    d.text('EXEMPLO PRATICO', M + 5, y + 5);
    ink(d, C.body);
    font(d, 'normal', 8.5);
    let ey = y + 10;
    d.text(scnLines, M + 5, ey);
    ey += scnLines.length * 4.2 + 1.5;
    ink(d, [146, 64, 14]);
    font(d, 'bold', 8.5);
    d.text(resLines, M + 5, ey);
    y += boxH + 5;
  }

  // COMO LER O RESULTADO (tiers coloridos)
  if (m.howToRead && m.howToRead.length) {
    y = ensure(d, y, 10 + m.howToRead.length * 6);
    fill(d, C.brand);
    d.rect(M, y - 3, 1.5, 4, 'F');
    ink(d, C.brandDeep);
    font(d, 'bold', 8);
    d.text('COMO LER O RESULTADO', M + 3, y);
    y += 5;
    const colors = [C.brand, C.amber, C.red];
    for (let i = 0; i < m.howToRead.length; i++) {
      y = ensure(d, y, 7);
      const tone = colors[i] || C.muted;
      fill(d, tone);
      rrect(d, M, y - 2.4, 4, 4, 0.8, 'F');
      ink(d, C.body);
      font(d, 'normal', 9);
      y = wrap(d, m.howToRead[i], M + 6, y, CONTENT_W - 6, 4.4) + 1.5;
    }
    y += 3;
  }

  // POR QUE IMPORTA (caixa de venda/ensino)
  if (m.whyMatters) {
    const wmLines = d.splitTextToSize(m.whyMatters, CONTENT_W - 10);
    const boxH = 9 + wmLines.length * 4.4 + 2;
    y = ensure(d, y, boxH + 2);
    fill(d, C.brandSoft);
    rrect(d, M, y, CONTENT_W, boxH, 1.5, 'F');
    fill(d, C.brand);
    rrect(d, M, y, 2, boxH, 1.5, 'F');
    ink(d, C.brandDeep);
    font(d, 'bold', 7.5);
    d.text('POR QUE ISSO IMPORTA', M + 5, y + 5);
    ink(d, C.body);
    font(d, 'italic', 8.7);
    d.text(wmLines, M + 5, y + 10);
  }

  drawFooter(d);
}

// ============================================================
//  MONTAGEM DO DOCUMENTO
// ============================================================
function main() {
  const d = new jsPDF({ unit: 'mm', format: 'a4', compress: true });

  drawCover(d);

  // Reserva páginas do sumário (2 páginas) — preenche no fim.
  d.addPage();
  d.addPage();

  const rolePage = {};
  const featPage = [];

  for (const role of CONTENT.roles) {
    d.addPage();
    rolePage[role.key] = d.getCurrentPageInfo().pageNumber;
    drawRoleDivider(d, role);

    for (const f of role.features) {
      d.addPage();
      featPage.push({ role: role.key, title: f.title, page: d.getCurrentPageInfo().pageNumber });

      let y = drawPageHeader(d);
      ink(d, C.brandDeep);
      font(d, 'bold', 6.5);
      d.text(role.title.toUpperCase(), M, y, { charSpace: 1.2 });
      y += 4;
      ink(d, C.ink);
      font(d, 'bold', 16);
      d.text(f.title, M, y + 4);
      y += 9;
      ink(d, C.muted);
      font(d, 'normal', 9);
      d.text(f.subtitle, M, y);
      y += 5;

      const mockH = 92;
      const real = drawScreen(d, M, y, CONTENT_W, mockH, role.key, f);
      y += mockH + 5;
      ink(d, C.faint);
      font(d, 'italic', 6.5);
      d.text(
        real
          ? 'Captura de tela do sistema.'
          : 'Representacao da tela (mockup) seguindo o design real do sistema.',
        M,
        y,
      );
      y += 6;

      // O QUE É
      y = ensure(d, y, 24);
      fill(d, C.brand);
      d.rect(M, y - 3, 1.5, 4, 'F');
      ink(d, C.brandDeep);
      font(d, 'bold', 8);
      d.text('O QUE E', M + 3, y);
      ink(d, C.body);
      font(d, 'normal', 9);
      y = wrap(d, f.what, M, y + 5, CONTENT_W, 4.5) + 4;

      // COMO USAR
      y = ensure(d, y, 24);
      fill(d, C.brand);
      d.rect(M, y - 3, 1.5, 4, 'F');
      ink(d, C.brandDeep);
      font(d, 'bold', 8);
      d.text('COMO USAR', M + 3, y);
      y += 5;
      for (let i = 0; i < f.how.length; i++) {
        y = ensure(d, y, 9);
        fill(d, C.brandSoft);
        d.circle(M + 1.6, y + 0.8, 1.9, 'F');
        ink(d, C.brandDeep);
        font(d, 'bold', 6);
        d.text(String(i + 1), M + 1.6, y + 1.6, { align: 'center' });
        ink(d, C.body);
        font(d, 'normal', 9);
        y = wrap(d, f.how[i], M + 5.5, y + 1.8, CONTENT_W - 5.5, 4.4) + 1.5;
      }
      y += 3;

      // DICA
      y = ensure(d, y, 20);
      const tipLines = d.splitTextToSize(f.tip, CONTENT_W - 9);
      const tipH = Math.max(14, 8 + tipLines.length * 4);
      fill(d, C.brandSoft);
      rrect(d, M, y, CONTENT_W, tipH, 1.5, 'F');
      fill(d, C.brand);
      rrect(d, M, y, 2, tipH, 1.5, 'F');
      ink(d, C.brandDeep);
      font(d, 'bold', 7);
      d.text('DICA', M + 5, y + 4.5);
      ink(d, C.body);
      font(d, 'italic', 8.5);
      d.text(tipLines, M + 5, y + 8.5);

      drawFooter(d);
    }
  }

  // SEÇÃO DE METODOLOGIA (após os papéis)
  let methodologyPage = null;
  const methodologyEntries = [];
  if (CONTENT.methodology) {
    d.addPage();
    methodologyPage = d.getCurrentPageInfo().pageNumber;
    drawMethodologyDivider(d, CONTENT.methodology);

    CONTENT.methodology.metrics.forEach((m, i) => {
      d.addPage();
      methodologyEntries.push({ title: m.title, page: d.getCurrentPageInfo().pageNumber });
      drawMethodologyPage(d, m, i);
    });
  }

  // Sumário (páginas 2 e 3)
  d.setPage(2);
  const toc = [];
  for (const role of CONTENT.roles) {
    toc.push({ kind: 'role', title: role.title, page: rolePage[role.key] });
    for (const fp of featPage.filter((f) => f.role === role.key)) {
      toc.push({ kind: 'feature', title: fp.title, page: fp.page });
    }
  }
  if (methodologyPage) {
    toc.push({
      kind: 'role',
      title: 'Metodologia (scores e métricas)',
      page: methodologyPage,
    });
    for (const e of methodologyEntries) {
      toc.push({ kind: 'feature', title: e.title, page: e.page });
    }
  }
  drawToc(d, toc);
  drawFooter(d);

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  const arr = d.output('arraybuffer');
  writeFileSync(OUT_FILE, Buffer.from(arr));
  const kb = (Buffer.from(arr).length / 1024).toFixed(0);
  const shots = existsSync(SHOTS_DIR);
  console.log(`OK  ${OUT_FILE}`);
  console.log(`    ${kb} KB - ${d.internal.pages.length - 1} paginas`);
  console.log(
    shots
      ? '    Usando capturas reais quando disponiveis em dist/screenshots.'
      : '    Sem dist/screenshots: usando mockups. Rode npm run manual:screenshots para capturas reais.',
  );
}

main();
