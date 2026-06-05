// Gera o PDF "Manual do Sistema ProActive7" — explicação de cada função
// disponível, por papel (Platform Admin / Nutricionista / Gerente / Cozinha).
//
// Os "prints" são mockups vetoriais desenhados com primitivas do jsPDF
// (rect, line, text) seguindo o design system real do app. Para usar
// capturas reais do app em vez de mockups, rode o script
// scripts/capture-screenshots.mjs (Playwright) e depois regenerar com
// `npm run manual:pdf -- --screenshots`.
//
// Saída: dist/manual-proactive7.pdf
//
// Uso:
//   node scripts/generate-system-manual.mjs

import { jsPDF } from 'jspdf';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'dist');
const OUT_FILE = join(OUT_DIR, 'manual-proactive7.pdf');
const SCREENSHOTS_DIR = join(ROOT, 'dist', 'screenshots');

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
  paper: [250, 250, 247], // FAFAF7 do site
  white: [255, 255, 255],
  amber: [217, 119, 6],
  amberSoft: [255, 251, 235],
  red: [220, 38, 38],
  redSoft: [254, 242, 242],
  blue: [37, 99, 235],
  blueSoft: [239, 246, 255],
  sidebarBg: [255, 255, 255],
  sidebarText: [82, 82, 82],
  sidebarActive: [236, 253, 245],
  sidebarActiveText: [4, 120, 87],
};

const PAGE_W = 210;
const PAGE_H = 297;
const M = 16;
const CONTENT_W = PAGE_W - M * 2;

// ============================================================
//  PRIMITIVAS DE DESENHO
// ============================================================

function fill(doc, color) {
  doc.setFillColor(...color);
}
function stroke(doc, color, w = 0.2) {
  doc.setDrawColor(...color);
  doc.setLineWidth(w);
}
function ink(doc, color) {
  doc.setTextColor(...color);
}
function font(doc, weight = 'normal', size = 10) {
  doc.setFont('helvetica', weight);
  doc.setFontSize(size);
}

/** Retângulo arredondado. */
function rrect(doc, x, y, w, h, r, style = 'F') {
  doc.roundedRect(x, y, w, h, r, r, style);
}

/** Imprime texto com quebra automática por largura. Retorna novo Y. */
function wrap(doc, text, x, y, w, lineHeight = 4.5) {
  const lines = doc.splitTextToSize(text, w);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

/** Garante espaço; senão adiciona página. Retorna possivelmente novo Y. */
function ensure(doc, y, needed = 40) {
  if (y + needed > PAGE_H - 18) {
    drawFooter(doc);
    doc.addPage();
    return drawPageHeader(doc);
  }
  return y;
}

// ============================================================
//  CABEÇALHO / RODAPÉ
// ============================================================

function drawPageHeader(doc) {
  // Faixa fina no topo
  fill(doc, C.brandSoft);
  doc.rect(0, 0, PAGE_W, 14, 'F');
  fill(doc, C.brand);
  doc.rect(0, 13.5, PAGE_W, 0.5, 'F');

  ink(doc, C.brandDeep);
  font(doc, 'bold', 10);
  doc.text('ProActive7', M, 9);
  font(doc, 'normal', 7.5);
  ink(doc, C.muted);
  doc.text('MANUAL DO SISTEMA', PAGE_W - M, 9, { align: 'right' });
  return 22;
}

function drawFooter(doc) {
  const pageInfo = doc.internal.pages;
  const total = pageInfo.length - 1; // jsPDF arr starts at 1
  const current = doc.getCurrentPageInfo().pageNumber;
  stroke(doc, C.hair);
  doc.line(M, PAGE_H - 12, PAGE_W - M, PAGE_H - 12);
  font(doc, 'normal', 7.5);
  ink(doc, C.muted);
  doc.text('Manual do Sistema · proactive7.com.br', M, PAGE_H - 7);
  doc.text(`${current} / ${total}`, PAGE_W - M, PAGE_H - 7, {
    align: 'right',
  });
}

// ============================================================
//  CAPA
// ============================================================

function drawCover(doc) {
  // Fundo escuro estilo "cozinha"
  fill(doc, C.ink);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  // gradient simulado: retângulos horizontais
  for (let i = 0; i < 60; i++) {
    const t = i / 60;
    const r = Math.round(15 + (6 - 15) * t);
    const g = Math.round(23 + (78 - 23) * t);
    const b = Math.round(42 + (59 - 42) * t);
    fill(doc, [r, g, b]);
    doc.rect(0, (PAGE_H / 60) * i, PAGE_W, PAGE_H / 60 + 0.5, 'F');
  }

  // Linhas glitch decorativas
  fill(doc, [255, 255, 255]);
  doc.setGState(new doc.GState({ opacity: 0.15 }));
  doc.rect(20, 80, 130, 0.3, 'F');
  doc.rect(60, 95, 90, 0.3, 'F');
  doc.rect(40, 110, 110, 0.3, 'F');
  doc.rect(80, 130, 80, 0.3, 'F');
  doc.setGState(new doc.GState({ opacity: 1 }));

  // Selo verde
  fill(doc, C.brand);
  rrect(doc, M, 30, 38, 8, 1, 'F');
  ink(doc, C.white);
  font(doc, 'bold', 7);
  doc.text('MANUAL · v1', M + 3, 35.5);

  // Título
  ink(doc, C.white);
  font(doc, 'bold', 36);
  doc.text('Manual', M, 100);
  doc.text('do Sistema', M, 116);

  font(doc, 'normal', 12);
  ink(doc, [200, 220, 210]);
  doc.text('ProActive7', M, 128);

  // Tagline
  font(doc, 'normal', 9);
  ink(doc, [180, 200, 190]);
  doc.text('Boa alimentação, bem-estar e saúde'.toUpperCase(), M, 138, {
    charSpace: 1.2,
  });

  // Subtítulo
  font(doc, 'normal', 11);
  ink(doc, [220, 230, 224]);
  doc.text(
    'Cada função do sistema explicada para nutricionistas, gerentes',
    M,
    180,
  );
  doc.text('e operadores de cozinha. Com prints de tela e dicas de uso.', M, 187);

  // Rodapé de capa
  fill(doc, C.brand);
  doc.rect(0, PAGE_H - 30, PAGE_W, 30, 'F');
  ink(doc, C.white);
  font(doc, 'bold', 9);
  doc.text('proactive7.com.br', M, PAGE_H - 18);
  font(doc, 'normal', 8);
  ink(doc, [200, 230, 215]);
  doc.text('Macaé · RJ · Desde 2013', M, PAGE_H - 12);
  font(doc, 'normal', 8);
  doc.text(new Date().toLocaleDateString('pt-BR'), PAGE_W - M, PAGE_H - 12, {
    align: 'right',
  });
}

// ============================================================
//  SUMÁRIO
// ============================================================

function drawToc(doc, entries) {
  let y = drawPageHeader(doc);
  ink(doc, C.ink);
  font(doc, 'bold', 22);
  doc.text('Sumário', M, y + 8);
  y += 18;

  font(doc, 'normal', 8);
  ink(doc, C.muted);
  doc.text(
    'Este manual cobre todas as funções do sistema agrupadas pelo papel que as utiliza. Cada seção começa com uma visão geral do papel e segue com as telas — descrição, print e dica de uso.',
    M,
    y,
    { maxWidth: CONTENT_W },
  );
  y += 14;

  for (const e of entries) {
    if (e.kind === 'role') {
      y += 4;
      // separador
      stroke(doc, C.hair);
      doc.line(M, y, PAGE_W - M, y);
      y += 7;
      fill(doc, C.brandSoft);
      rrect(doc, M, y - 4, 4, 5, 1, 'F');
      ink(doc, C.brandDeep);
      font(doc, 'bold', 11.5);
      doc.text(e.title, M + 7, y);
      font(doc, 'normal', 8);
      ink(doc, C.muted);
      doc.text(e.subtitle, M + 7, y + 4.5);
      ink(doc, C.faint);
      font(doc, 'bold', 9);
      doc.text(String(e.page).padStart(3, ' '), PAGE_W - M, y, {
        align: 'right',
      });
      y += 10;
    } else {
      ink(doc, C.body);
      font(doc, 'normal', 9.5);
      doc.text(e.title, M + 10, y);
      // dotted leader
      const titleW = doc.getTextWidth(e.title);
      stroke(doc, C.hair, 0.15);
      const startX = M + 12 + titleW;
      const endX = PAGE_W - M - 10;
      doc.setLineDashPattern([0.6, 0.8], 0);
      doc.line(startX, y - 0.8, endX, y - 0.8);
      doc.setLineDashPattern([], 0);
      ink(doc, C.muted);
      font(doc, 'normal', 9);
      doc.text(String(e.page), PAGE_W - M, y, { align: 'right' });
      y += 6;
    }
    y = ensure(doc, y, 12);
  }
}

// ============================================================
//  DIVISOR DE PAPEL
// ============================================================

function drawRoleDivider(doc, { title, subtitle, color, who, capabilities }) {
  fill(doc, color);
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

  ink(doc, C.white);
  font(doc, 'bold', 10);
  doc.text('PAPEL', M, 30, { charSpace: 1.5 });

  font(doc, 'bold', 42);
  doc.text(title, M, 75);

  font(doc, 'normal', 14);
  ink(doc, [220, 235, 226]);
  doc.text(subtitle, M, 90);

  // Box "Quem é"
  fill(doc, [255, 255, 255]);
  doc.setGState(new doc.GState({ opacity: 0.12 }));
  rrect(doc, M, 110, CONTENT_W, 28, 3, 'F');
  doc.setGState(new doc.GState({ opacity: 1 }));

  ink(doc, [220, 235, 226]);
  font(doc, 'bold', 8);
  doc.text('QUEM É', M + 6, 118, { charSpace: 1 });
  ink(doc, C.white);
  font(doc, 'normal', 10);
  wrap(doc, who, M + 6, 124, CONTENT_W - 12, 4.5);

  // Capacidades
  ink(doc, [220, 235, 226]);
  font(doc, 'bold', 8);
  doc.text('O QUE PODE FAZER', M, 155, { charSpace: 1 });

  let y = 162;
  for (const c of capabilities) {
    fill(doc, C.white);
    doc.circle(M + 1.5, y - 1.5, 1, 'F');
    ink(doc, C.white);
    font(doc, 'normal', 10);
    y = wrap(doc, c, M + 6, y, CONTENT_W - 6, 5);
    y += 1;
  }

  ink(doc, [220, 235, 226]);
  font(doc, 'normal', 8);
  doc.text(
    'As próximas páginas descrevem cada tela disponível para este papel.',
    M,
    PAGE_H - 25,
  );
  ink(doc, C.white);
  font(doc, 'bold', 8);
  doc.text('ProActive7 · Manual do Sistema', M, PAGE_H - 18);
}

// ============================================================
//  MOCKUP: layout base do sistema (sidebar + conteúdo)
// ============================================================

function drawAppShell(doc, x, y, w, h, opts = {}) {
  const { activeMenu = 'Início', menuItems = DEFAULT_MENU, role = 'Cozinha' } = opts;

  // Container externo (com sombra leve)
  fill(doc, [0, 0, 0]);
  doc.setGState(new doc.GState({ opacity: 0.08 }));
  rrect(doc, x + 0.8, y + 1, w, h, 2, 'F');
  doc.setGState(new doc.GState({ opacity: 1 }));

  // Fundo
  fill(doc, C.paper);
  rrect(doc, x, y, w, h, 2, 'F');
  stroke(doc, C.hair, 0.2);
  rrect(doc, x, y, w, h, 2, 'S');

  // Sidebar
  const sidebarW = 32;
  fill(doc, C.sidebarBg);
  rrect(doc, x, y, sidebarW, h, 2, 'F');
  stroke(doc, C.hair, 0.15);
  doc.line(x + sidebarW, y, x + sidebarW, y + h);

  // Logo
  fill(doc, [156, 163, 175]);
  rrect(doc, x + 3, y + 3, sidebarW - 6, 7, 0.8, 'F');
  ink(doc, C.white);
  font(doc, 'bold', 5.5);
  doc.text('PROACTIVE7', x + sidebarW / 2, y + 7.5, { align: 'center' });

  // Menu
  let my = y + 14;
  for (const item of menuItems) {
    const isActive = item === activeMenu;
    if (isActive) {
      fill(doc, C.sidebarActive);
      rrect(doc, x + 1.5, my - 1.5, sidebarW - 3, 4.4, 0.6, 'F');
      ink(doc, C.sidebarActiveText);
      font(doc, 'bold', 5.5);
    } else {
      ink(doc, C.sidebarText);
      font(doc, 'normal', 5.5);
    }
    // bolinha do ícone
    if (isActive) {
      fill(doc, C.brand);
      doc.circle(x + 4, my, 0.8, 'F');
    } else {
      fill(doc, C.faint);
      doc.circle(x + 4, my, 0.8, 'F');
    }
    doc.text(item, x + 6.5, my + 0.5);
    my += 4.8;
  }

  // Footer da sidebar
  fill(doc, C.hair);
  doc.rect(x + 1.5, y + h - 12, sidebarW - 3, 0.2, 'F');
  ink(doc, C.body);
  font(doc, 'bold', 5);
  doc.text('Usuário Demo', x + 3, y + h - 8);
  font(doc, 'normal', 4.5);
  ink(doc, C.muted);
  doc.text(role, x + 3, y + h - 5);

  return { contentX: x + sidebarW + 4, contentY: y + 4, contentW: w - sidebarW - 8, contentH: h - 8 };
}

const DEFAULT_MENU = [
  'Início',
  'Etiquetas',
  'Validades',
  'Produção',
  'Estoque',
  'Cadastros',
  'Conformidade',
  'Fotos',
];

// Componentes de tela
function ttitle(doc, x, y, text, sub) {
  ink(doc, C.ink);
  font(doc, 'bold', 9);
  doc.text(text, x, y);
  if (sub) {
    ink(doc, C.muted);
    font(doc, 'normal', 5.5);
    doc.text(sub, x, y + 3.5);
  }
  return y + (sub ? 8 : 5);
}

function pill(doc, x, y, w, h, label, bg, fg) {
  fill(doc, bg);
  rrect(doc, x, y, w, h, h / 2, 'F');
  ink(doc, fg);
  font(doc, 'bold', 5);
  doc.text(label, x + w / 2, y + h / 2 + 1.5, { align: 'center' });
}

function card(doc, x, y, w, h) {
  fill(doc, C.white);
  rrect(doc, x, y, w, h, 1.5, 'F');
  stroke(doc, C.hair, 0.15);
  rrect(doc, x, y, w, h, 1.5, 'S');
}

function btn(doc, x, y, w, h, label, primary = true) {
  fill(doc, primary ? C.brand : C.white);
  rrect(doc, x, y, w, h, h / 2, 'F');
  if (!primary) {
    stroke(doc, C.hair, 0.3);
    rrect(doc, x, y, w, h, h / 2, 'S');
  }
  ink(doc, primary ? C.white : C.brandDark);
  font(doc, 'bold', 5.5);
  doc.text(label, x + w / 2, y + h / 2 + 1.7, { align: 'center' });
}

function input(doc, x, y, w, h, placeholder) {
  fill(doc, C.white);
  rrect(doc, x, y, w, h, 0.8, 'F');
  stroke(doc, C.hair, 0.2);
  rrect(doc, x, y, w, h, 0.8, 'S');
  if (placeholder) {
    ink(doc, C.faint);
    font(doc, 'normal', 5);
    doc.text(placeholder, x + 1.5, y + h / 2 + 1.5);
  }
}

function bar(doc, x, y, w, value, color) {
  fill(doc, C.hair);
  rrect(doc, x, y, w, 1.5, 0.5, 'F');
  fill(doc, color);
  rrect(doc, x, y, w * value, 1.5, 0.5, 'F');
}

function tableRow(doc, x, y, w, cells, opts = {}) {
  const { isHeader, height = 4 } = opts;
  if (isHeader) {
    fill(doc, C.brandSoft);
    rrect(doc, x, y - 1, w, height, 0.5, 'F');
  }
  ink(doc, isHeader ? C.brandDeep : C.body);
  font(doc, isHeader ? 'bold' : 'normal', 5);
  let cx = x + 1;
  for (const c of cells) {
    doc.text(c.text, cx, y + 1.8);
    cx += c.w;
  }
  if (!isHeader) {
    stroke(doc, C.hair, 0.1);
    doc.line(x, y + height - 1, x + w, y + height - 1);
  }
}

// ============================================================
//  MOCKUPS DAS TELAS
// ============================================================

function mockDashboardNutri(doc, x, y, w, h) {
  const { contentX, contentY, contentW } = drawAppShell(doc, x, y, w, h, {
    activeMenu: 'Carteira',
    menuItems: [
      'Carteira',
      'Avaliação',
      'Acompanhamento',
      'Cadastros',
      'Administração',
    ],
    role: 'Nutricionista',
  });

  let cy = contentY + 2;
  ink(doc, C.muted);
  font(doc, 'normal', 5);
  doc.text('BOM DIA', contentX, cy + 2);
  cy += 4;
  ink(doc, C.ink);
  font(doc, 'bold', 8.5);
  doc.text('Ariane Madureira', contentX, cy + 2);
  pill(doc, contentX + 32, cy - 0.5, 20, 3.4, '3 críticas', C.amberSoft, C.amber);
  cy += 6;

  // KPIs
  const kpiW = (contentW - 6) / 4;
  ['Score 82%', '7 empresas', '4 visitas 14d', '6 alertas'].forEach((l, i) => {
    card(doc, contentX + i * (kpiW + 2), cy, kpiW, 11);
    ink(doc, C.muted);
    font(doc, 'normal', 4.5);
    doc.text(['SCORE MÉDIO', 'EMPRESAS', 'PRÓX. VISITAS', 'ALERTAS HOJE'][i], contentX + 1 + i * (kpiW + 2), cy + 3);
    ink(doc, C.ink);
    font(doc, 'bold', 7);
    doc.text(l.split(' ')[0], contentX + 1 + i * (kpiW + 2), cy + 7.5);
    ink(doc, C.muted);
    font(doc, 'normal', 4.5);
    doc.text(l.split(' ').slice(1).join(' '), contentX + 1 + i * (kpiW + 2), cy + 10);
  });
  cy += 14;

  // Triagem
  ink(doc, C.body);
  font(doc, 'bold', 6);
  doc.text('Afazeres · pendências dos seus clientes', contentX, cy);
  cy += 3;
  const alertW = (contentW - 4) / 2;
  ['Empresas sem visita 60d', 'ASOs vencendo em 30d', 'NCs graves +14d', 'Pragas vencido'].forEach((l, i) => {
    const ax = contentX + (i % 2) * (alertW + 2);
    const ay = cy + Math.floor(i / 2) * 12;
    card(doc, ax, ay, alertW, 10);
    fill(doc, [i % 2 === 0 ? C.amberSoft[0] : C.redSoft[0], i % 2 === 0 ? C.amberSoft[1] : C.redSoft[1], i % 2 === 0 ? C.amberSoft[2] : C.redSoft[2]]);
    rrect(doc, ax + 1.5, ay + 1.5, 4, 4, 0.5, 'F');
    ink(doc, C.body);
    font(doc, 'bold', 5);
    doc.text(l, ax + 7, ay + 3);
    ink(doc, C.muted);
    font(doc, 'normal', 4.5);
    doc.text('3 itens', ax + 7, ay + 6);
  });
  cy += 26;

  // Carteira
  ink(doc, C.body);
  font(doc, 'bold', 6);
  doc.text('Carteira · 3 críticas', contentX, cy);
  cy += 3;
  ['Restaurante Mar Azul', 'Padaria Imbetiba', 'Cantina Escolar'].forEach((name, i) => {
    const tones = [C.redSoft, C.amberSoft, C.brandSoft];
    const toneFg = [C.red, C.amber, C.brand];
    const scores = ['58%', '72%', '92%'];
    fill(doc, tones[i]);
    rrect(doc, contentX, cy, contentW, 7, 1, 'F');
    ink(doc, C.ink);
    font(doc, 'bold', 5.5);
    doc.text(name, contentX + 2, cy + 3.2);
    ink(doc, C.muted);
    font(doc, 'normal', 4.5);
    doc.text('3 NCs · 4/5 ASOs · CIP em dia', contentX + 2, cy + 5.7);
    ink(doc, toneFg[i]);
    font(doc, 'bold', 7);
    doc.text(scores[i], contentX + contentW - 2, cy + 4.5, { align: 'right' });
    cy += 8;
  });
}

function mockPrintWizard(doc, x, y, w, h) {
  const { contentX, contentY, contentW } = drawAppShell(doc, x, y, w, h, {
    activeMenu: 'Etiquetas',
    role: 'Cozinha',
  });

  let cy = contentY + 2;
  ttitle(doc, contentX, cy, 'Imprimir etiqueta', 'Passo 4 de 5 · nenhum campo precisa ser digitado');
  cy += 8;

  // Stepper
  ['Manip.', 'Grupo', 'Produto', 'Info', 'Imprimir'].forEach((s, i) => {
    const sx = contentX + i * (contentW / 5);
    const isDone = i < 3;
    const isActive = i === 3;
    fill(doc, isActive ? C.brand : isDone ? C.brandSoft : C.hair);
    doc.circle(sx + contentW / 10, cy, 2.2, 'F');
    if (isDone) {
      ink(doc, C.brand);
      font(doc, 'bold', 4);
      doc.text('✓', sx + contentW / 10, cy + 1, { align: 'center' });
    } else {
      ink(doc, isActive ? C.white : C.muted);
      font(doc, 'bold', 4);
      doc.text(String(i + 1), sx + contentW / 10, cy + 1, { align: 'center' });
    }
    if (i < 4) {
      fill(doc, isDone ? C.brand : C.hair);
      doc.rect(sx + contentW / 10 + 3, cy - 0.2, contentW / 5 - 6, 0.4, 'F');
    }
    ink(doc, isActive ? C.brandDeep : C.muted);
    font(doc, 'normal', 4.5);
    doc.text(s, sx + contentW / 10, cy + 6, { align: 'center' });
  });
  cy += 12;

  // Card
  card(doc, contentX, cy, contentW, 50);
  cy += 2;

  // Produto banner
  fill(doc, C.brandSoft);
  rrect(doc, contentX + 2, cy, contentW - 4, 6, 1, 'F');
  fill(doc, C.brand);
  doc.circle(contentX + 4.5, cy + 3, 1.5, 'F');
  ink(doc, C.ink);
  font(doc, 'bold', 5.5);
  doc.text('Salada de frutas', contentX + 7, cy + 2.5);
  ink(doc, C.brand);
  font(doc, 'bold', 5);
  doc.text('Vence 28/01 14:00', contentX + 7, cy + 4.8);
  cy += 8;

  // Condição
  ink(doc, C.body);
  font(doc, 'bold', 5);
  doc.text('Condição de armazenamento', contentX + 2, cy + 2);
  cy += 3;
  fill(doc, C.white);
  rrect(doc, contentX + 2, cy, contentW - 4, 4.5, 0.8, 'F');
  stroke(doc, C.hair, 0.2);
  rrect(doc, contentX + 2, cy, contentW - 4, 4.5, 0.8, 'S');
  ink(doc, C.body);
  font(doc, 'normal', 5);
  doc.text('Refrigerado — 2 dias', contentX + 4, cy + 3);
  cy += 6;

  // Data bloqueada
  ink(doc, C.body);
  font(doc, 'bold', 5);
  doc.text('Data e hora da manipulação', contentX + 2, cy + 2);
  cy += 3;
  fill(doc, [243, 244, 246]);
  rrect(doc, contentX + 2, cy, contentW - 4, 4.5, 0.8, 'F');
  ink(doc, C.muted);
  font(doc, 'normal', 5);
  doc.text('26/01/2026 14:32 (bloqueado)', contentX + 4, cy + 3);
  cy += 5;
  ink(doc, C.muted);
  font(doc, 'italic', 4);
  doc.text('Bloqueado — atualiza no exato momento da impressão.', contentX + 2, cy + 2);
  cy += 4;

  // Quantidade
  ink(doc, C.body);
  font(doc, 'bold', 5);
  doc.text('Quantidade (etiquetas)', contentX + 2, cy + 2);
  cy += 3;
  input(doc, contentX + 2, cy, contentW - 4, 4.5, '1');
  cy += 7;

  // Navigation
  btn(doc, contentX, cy, 16, 5, '◀ Voltar', false);
  btn(doc, contentX + contentW - 16, cy, 16, 5, 'Avançar ▶', true);
}

function mockNonConformities(doc, x, y, w, h) {
  const { contentX, contentY, contentW } = drawAppShell(doc, x, y, w, h, {
    activeMenu: 'Avaliação',
    menuItems: ['Carteira', 'Avaliação', 'Acompanhamento', 'Cadastros'],
    role: 'Nutricionista',
  });

  let cy = contentY + 2;
  ttitle(doc, contentX, cy, 'Não-conformidades', 'Plano de ação 5W2H');
  btn(doc, contentX + contentW - 18, cy - 2, 18, 5, '+ Nova NC', true);
  cy += 8;

  // Cards por cliente
  ink(doc, C.muted);
  font(doc, 'bold', 4.5);
  doc.text('POR CLIENTE', contentX, cy);
  cy += 3;
  const cardW = (contentW - 6) / 4;
  ['Mar Azul', 'Imbetiba', 'Cantina', 'Hotel Litoral'].forEach((n, i) => {
    const active = i === 0;
    fill(doc, active ? C.brandSoft : C.white);
    stroke(doc, active ? C.brand : C.hair, 0.2);
    rrect(doc, contentX + i * (cardW + 2), cy, cardW, 12, 1, 'FD');
    ink(doc, C.muted);
    font(doc, 'normal', 4);
    doc.text(n, contentX + 1 + i * (cardW + 2), cy + 2.5);
    ink(doc, C.ink);
    font(doc, 'bold', 8);
    doc.text(['5', '3', '2', '1'][i], contentX + 1 + i * (cardW + 2), cy + 7);
    ink(doc, C.muted);
    font(doc, 'normal', 4);
    doc.text('em aberto', contentX + 6 + i * (cardW + 2), cy + 7);
    if (i === 0) {
      pill(doc, contentX + 1 + i * (cardW + 2), cy + 9, 8, 2.4, '2 crít', C.redSoft, C.red);
    }
  });
  cy += 15;

  // Filtros
  card(doc, contentX, cy, contentW, 6);
  cy += 2;
  pill(doc, contentX + 2, cy, 16, 3.5, 'Status: Aberta', C.brandSoft, C.brandDeep);
  pill(doc, contentX + 20, cy, 14, 3.5, 'Severidade', C.brandSoft, C.brandDeep);
  cy += 8;

  // Lista
  [
    { sev: 'critical', desc: 'Geladeira fora da faixa há 3 dias' },
    { sev: 'high', desc: 'Manipulador sem ASO em dia' },
    { sev: 'medium', desc: 'POP de higienização não assinado' },
  ].forEach((nc) => {
    card(doc, contentX, cy, contentW, 11);
    const tone = nc.sev === 'critical' ? C.red : nc.sev === 'high' ? C.amber : C.blue;
    const toneSoft = nc.sev === 'critical' ? C.redSoft : nc.sev === 'high' ? C.amberSoft : C.blueSoft;
    pill(doc, contentX + 2, cy + 2, 12, 3, nc.sev === 'critical' ? 'Crítica' : nc.sev === 'high' ? 'Alta' : 'Média', toneSoft, tone);
    pill(doc, contentX + 15, cy + 2, 10, 3, 'Aberta', C.redSoft, C.red);
    ink(doc, C.ink);
    font(doc, 'bold', 5.5);
    doc.text(nc.desc, contentX + 2, cy + 7);
    ink(doc, C.muted);
    font(doc, 'normal', 4.5);
    doc.text('Prazo: 03/02/2026 (vencida)', contentX + 2, cy + 9.5);
    cy += 12;
  });
}

function mockAuditDetail(doc, x, y, w, h) {
  const { contentX, contentY, contentW } = drawAppShell(doc, x, y, w, h, {
    activeMenu: 'Avaliação',
    menuItems: ['Carteira', 'Avaliação', 'Acompanhamento', 'Cadastros'],
    role: 'Nutricionista',
  });

  let cy = contentY + 2;
  ink(doc, C.muted);
  font(doc, 'normal', 5);
  doc.text('← Voltar', contentX, cy + 2);
  cy += 5;

  ink(doc, C.ink);
  font(doc, 'bold', 8);
  doc.text('Restaurante Mar Azul', contentX, cy + 3);
  ink(doc, C.muted);
  font(doc, 'normal', 5);
  doc.text('Checklist RDC 216 — visita mensal', contentX, cy + 7);

  // score
  pill(doc, contentX + contentW - 24, cy - 1, 24, 6, 'Score 82%', C.amberSoft, C.amber);

  cy += 12;

  // Botões
  btn(doc, contentX, cy, 18, 5, '📅 Reagendar', false);
  btn(doc, contentX + 19, cy, 16, 5, '✕ Cancelar', false);
  btn(doc, contentX + 36, cy, 24, 5, '💾 Salvar rascunho', false);
  btn(doc, contentX + contentW - 18, cy, 18, 5, '✎ Finalizar', true);
  cy += 8;

  // Score por categoria
  card(doc, contentX, cy, contentW, 16);
  ink(doc, C.body);
  font(doc, 'bold', 5.5);
  doc.text('Score por categoria', contentX + 2, cy + 3);
  ['Edificação', 'Higiene', 'Manipuladores', 'Temperatura'].forEach((cat, i) => {
    const bx = contentX + 2 + i * ((contentW - 4) / 4);
    const bw = (contentW - 4) / 4 - 2;
    fill(doc, C.hair);
    rrect(doc, bx, cy + 6, bw, 1.5, 0.5, 'F');
    const val = [0.9, 0.7, 0.85, 0.6][i];
    fill(doc, val >= 0.85 ? C.brand : val >= 0.7 ? C.amber : C.red);
    rrect(doc, bx, cy + 6, bw * val, 1.5, 0.5, 'F');
    ink(doc, C.muted);
    font(doc, 'normal', 4);
    doc.text(cat, bx, cy + 10);
    ink(doc, C.ink);
    font(doc, 'bold', 4.5);
    doc.text(`${(val * 100).toFixed(0)}%`, bx + bw, cy + 10, { align: 'right' });
  });
  cy += 19;

  // Itens
  card(doc, contentX, cy, contentW, h - (cy - y) - 6);
  let iy = cy + 2;
  ink(doc, C.muted);
  font(doc, 'bold', 4.5);
  doc.text('HIGIENE', contentX + 2, iy + 2);
  iy += 4;
  ['Bancadas limpas', 'Pia higienizada', 'Lixo segregado'].forEach((it, i) => {
    fill(doc, C.white);
    stroke(doc, C.hair, 0.15);
    rrect(doc, contentX + 2, iy, contentW - 4, 6, 0.8, 'FD');
    ink(doc, C.body);
    font(doc, 'normal', 5);
    doc.text(it, contentX + 4, iy + 3.7);
    // toggle C / NC / NA
    ['C', 'NC', 'NA'].forEach((opt, j) => {
      const ox = contentX + contentW - 22 + j * 7;
      const sel = (i === 1 && opt === 'NC') || (i !== 1 && opt === 'C');
      fill(doc, sel ? (opt === 'NC' ? C.redSoft : C.brandSoft) : C.white);
      stroke(doc, sel ? (opt === 'NC' ? C.red : C.brand) : C.hair, 0.2);
      rrect(doc, ox, iy + 1, 6, 4, 0.8, 'FD');
      ink(doc, sel ? (opt === 'NC' ? C.red : C.brand) : C.muted);
      font(doc, 'bold', 4.5);
      doc.text(opt, ox + 3, iy + 3.6, { align: 'center' });
    });
    iy += 7;
  });
}

function mockTemperature(doc, x, y, w, h) {
  const { contentX, contentY, contentW } = drawAppShell(doc, x, y, w, h, {
    activeMenu: 'Acompanhamento',
    menuItems: ['Carteira', 'Avaliação', 'Acompanhamento', 'Cadastros'],
    role: 'Nutricionista',
  });

  let cy = contentY + 2;
  ttitle(doc, contentX, cy, 'Temperatura', 'Registro de equipamentos e leituras');
  btn(doc, contentX + contentW - 18, cy - 2, 18, 5, '+ Equipamento', true);
  cy += 8;

  // Dois cards lado a lado
  const halfW = (contentW - 3) / 2;

  // Equipamentos
  card(doc, contentX, cy, halfW, 38);
  ink(doc, C.body);
  font(doc, 'bold', 5.5);
  doc.text('Equipamentos', contentX + 2, cy + 3);
  let iy = cy + 6;
  [
    ['Geladeira cozinha', 'Geladeira · 0 a 8°C'],
    ['Freezer estoque', 'Freezer · -22 a -15°C'],
    ['Estufa balcão', 'Estufa · 60 a 90°C'],
  ].forEach(([n, sub]) => {
    ink(doc, C.ink);
    font(doc, 'bold', 5);
    doc.text(n, contentX + 2, iy + 2);
    ink(doc, C.muted);
    font(doc, 'normal', 4.5);
    doc.text(sub, contentX + 2, iy + 4.8);
    stroke(doc, C.hair, 0.1);
    doc.line(contentX + 2, iy + 6.5, contentX + halfW - 2, iy + 6.5);
    iy += 8;
  });

  // Registrar leitura
  card(doc, contentX + halfW + 3, cy, halfW, 38);
  ink(doc, C.body);
  font(doc, 'bold', 5.5);
  doc.text('Registrar leitura', contentX + halfW + 5, cy + 3);
  let ry = cy + 6;
  input(doc, contentX + halfW + 5, ry, halfW - 6, 4.5, 'Geladeira cozinha');
  ry += 6;
  input(doc, contentX + halfW + 5, ry, halfW - 6, 4.5, 'Ex.: 4.5');
  ry += 6;
  input(doc, contentX + halfW + 5, ry, halfW - 6, 4.5, 'Observações (opcional)');
  ry += 6;
  // PhotoAttacher
  fill(doc, C.brandSoft);
  rrect(doc, contentX + halfW + 5, ry, 18, 4.5, 0.8, 'F');
  ink(doc, C.brandDeep);
  font(doc, 'bold', 4.5);
  doc.text('📷 Anexar foto', contentX + halfW + 14, ry + 3, { align: 'center' });
  ry += 6;
  btn(doc, contentX + halfW + 5, ry, halfW - 6, 5, 'Registrar', true);
  cy += 41;

  // Últimas leituras
  card(doc, contentX, cy, contentW, h - (cy - y) - 6);
  ink(doc, C.body);
  font(doc, 'bold', 5.5);
  doc.text('Últimas leituras', contentX + 2, cy + 3);
  iy = cy + 6;
  [
    ['Geladeira cozinha', '4.5°C', 'ok'],
    ['Freezer estoque', '-12°C', 'alert'],
    ['Estufa balcão', '78°C', 'ok'],
  ].forEach(([n, t, status]) => {
    const isOut = status === 'alert';
    fill(doc, isOut ? C.redSoft : C.brandSoft);
    rrect(doc, contentX + 2, iy, 4, 4, 0.8, 'F');
    ink(doc, isOut ? C.red : C.brand);
    font(doc, 'bold', 3.5);
    doc.text(isOut ? '!' : '°', contentX + 4, iy + 2.5, { align: 'center' });
    ink(doc, C.ink);
    font(doc, 'bold', 5);
    doc.text(`${n} — ${t}`, contentX + 8, iy + 2);
    ink(doc, C.muted);
    font(doc, 'normal', 4.5);
    doc.text('26/01 15:30 · Ariane', contentX + 8, iy + 4.5);
    // thumb
    fill(doc, C.hair);
    rrect(doc, contentX + contentW - 7, iy, 4, 4, 0.5, 'F');
    iy += 6;
  });
}

function mockDocuments(doc, x, y, w, h) {
  const { contentX, contentY, contentW } = drawAppShell(doc, x, y, w, h, {
    activeMenu: 'Conformidade',
    role: 'Cozinha',
  });

  let cy = contentY + 2;
  ttitle(doc, contentX, cy, 'Documentos', 'Carregue os documentos do estabelecimento');
  btn(doc, contentX + contentW - 18, cy - 2, 18, 5, '+ Adicionar', true);
  cy += 8;

  // Barra de progresso
  card(doc, contentX, cy, contentW, 10);
  ink(doc, C.muted);
  font(doc, 'normal', 4.5);
  doc.text('Carregue cada documento na gaveta certa. PDF/imagem até 20 MB.', contentX + 2, cy + 3);
  ink(doc, C.ink);
  font(doc, 'bold', 7);
  doc.text('14', contentX + contentW - 14, cy + 4.5);
  ink(doc, C.muted);
  font(doc, 'normal', 4);
  doc.text('/ 22 entregues', contentX + contentW - 14, cy + 7);
  fill(doc, C.hair);
  rrect(doc, contentX + 2, cy + 7.5, contentW - 18, 1.5, 0.5, 'F');
  fill(doc, C.brand);
  rrect(doc, contentX + 2, cy + 7.5, (contentW - 18) * 0.64, 1.5, 0.5, 'F');
  cy += 13;

  // Grupos
  ['Funcionários e saúde', 'Controles periódicos', 'Manuais e planilhas'].forEach((group) => {
    card(doc, contentX, cy, contentW, 14);
    ink(doc, C.ink);
    font(doc, 'bold', 5.5);
    doc.text(group, contentX + 2, cy + 3);
    // 2 mini items
    const itemW = (contentW - 6) / 2;
    [0, 1].forEach((i) => {
      const ix = contentX + 2 + i * (itemW + 2);
      stroke(doc, C.hair, 0.15);
      rrect(doc, ix, cy + 5, itemW, 7, 0.8, 'S');
      // status circle
      const done = i === 0;
      fill(doc, done ? C.brandSoft : C.hair);
      doc.circle(ix + 2, cy + 8.5, 1.2, 'F');
      if (done) {
        ink(doc, C.brand);
        font(doc, 'bold', 3.5);
        doc.text('✓', ix + 2, cy + 9, { align: 'center' });
      }
      ink(doc, C.body);
      font(doc, 'bold', 4.5);
      doc.text(['ASO', 'Exames de fezes', 'Dedetização', 'Reservatório água', 'Manual BP', 'Cronograma'][group === 'Funcionários e saúde' ? i : group === 'Controles periódicos' ? i + 2 : i + 4], ix + 4.5, cy + 8);
      ink(doc, C.muted);
      font(doc, 'normal', 3.5);
      doc.text(done ? '2 anexos' : 'Pendente', ix + 4.5, cy + 10.5);
    });
    cy += 16;
  });
}

function mockPropertyDashboard(doc, x, y, w, h) {
  const { contentX, contentY, contentW } = drawAppShell(doc, x, y, w, h, {
    activeMenu: 'Início',
    role: 'Cozinha',
  });

  let cy = contentY + 2;

  // Hero
  fill(doc, C.brandSoft);
  rrect(doc, contentX, cy, contentW, 14, 1.5, 'F');
  fill(doc, C.brand);
  rrect(doc, contentX + 2, cy + 2, 10, 10, 1, 'F');
  ink(doc, C.white);
  font(doc, 'bold', 5.5);
  doc.text('MAR', contentX + 7, cy + 7.5, { align: 'center' });
  ink(doc, C.muted);
  font(doc, 'normal', 4.5);
  doc.text('BOM DIA, RAFAEL · PAINEL DA EMPRESA', contentX + 14, cy + 5);
  ink(doc, C.ink);
  font(doc, 'bold', 8);
  doc.text('Restaurante Mar Azul', contentX + 14, cy + 9.5);
  pill(doc, contentX + 14, cy + 11, 26, 2.6, '3 tarefas hoje', C.amberSoft, C.amber);
  cy += 17;

  // Quick actions
  ['Imprimir etiqueta', 'Registrar temp.', 'Abrir checklist'].forEach((l, i) => {
    const aw = (contentW - 6) / 3;
    fill(doc, i === 0 ? C.brand : C.white);
    stroke(doc, C.brand, 0.2);
    rrect(doc, contentX + i * (aw + 3), cy, aw, 9, 1, 'FD');
    ink(doc, i === 0 ? C.white : C.brandDark);
    font(doc, 'bold', 5.5);
    doc.text(l, contentX + i * (aw + 3) + aw / 2, cy + 5.5, { align: 'center' });
  });
  cy += 12;

  // Tarefas de hoje
  ink(doc, C.body);
  font(doc, 'bold', 6);
  doc.text('Para hoje', contentX, cy);
  cy += 3;

  card(doc, contentX, cy, contentW, 26);
  let ly = cy + 2;
  [
    ['Checklist diário de limpeza', 'Higiene · pendente'],
    ['Registrar temperatura geladeiras (3)', 'Equipamentos · pendente'],
    ['Etiquetas vencendo em 24h (4)', 'Validades · atenção'],
  ].forEach(([t, sub], i) => {
    fill(doc, [254, 249, 230]);
    rrect(doc, contentX + 1.5, ly, 1.5, 5, 0.3, 'F');
    ink(doc, C.ink);
    font(doc, 'bold', 5);
    doc.text(t, contentX + 4, ly + 2);
    ink(doc, C.muted);
    font(doc, 'normal', 4.5);
    doc.text(sub, contentX + 4, ly + 4.5);
    ink(doc, C.brand);
    font(doc, 'bold', 4.5);
    doc.text('Fazer →', contentX + contentW - 3, ly + 3, { align: 'right' });
    ly += 7;
  });
  cy += 28;

  // Vencendo
  ink(doc, C.body);
  font(doc, 'bold', 6);
  doc.text('Etiquetas vencendo em 24h', contentX, cy);
  cy += 3;
  ['Salada de frutas — vence em 4h', 'Molho branco — vence amanhã'].forEach((t) => {
    fill(doc, C.redSoft);
    rrect(doc, contentX, cy, contentW, 5, 0.8, 'F');
    ink(doc, C.red);
    font(doc, 'bold', 5);
    doc.text(t, contentX + 2, cy + 3.2);
    cy += 6;
  });
}

function mockProduction(doc, x, y, w, h) {
  const { contentX, contentY, contentW } = drawAppShell(doc, x, y, w, h, {
    activeMenu: 'Produção',
    role: 'Cozinha',
  });

  let cy = contentY + 2;
  ttitle(doc, contentX, cy, 'Produção (etiquetas em uso)', 'Etiquetas impressas aguardando baixa');
  cy += 8;

  // Stat cards
  const sw = (contentW - 6) / 3;
  [
    ['12', 'Itens ativos', C.brand],
    ['4', 'Vencendo', C.amber],
    ['2', 'Vencidos', C.red],
  ].forEach(([n, l, color], i) => {
    card(doc, contentX + i * (sw + 3), cy, sw, 12);
    fill(doc, [color[0], color[1], color[2]]);
    doc.setGState(new doc.GState({ opacity: 0.15 }));
    rrect(doc, contentX + 1 + i * (sw + 3), cy + 1.5, 4, 4, 0.8, 'F');
    doc.setGState(new doc.GState({ opacity: 1 }));
    ink(doc, C.ink);
    font(doc, 'bold', 8);
    doc.text(n, contentX + 1 + i * (sw + 3), cy + 7);
    ink(doc, C.muted);
    font(doc, 'normal', 4.5);
    doc.text(l, contentX + 1 + i * (sw + 3), cy + 10);
  });
  cy += 15;

  // Grid de cards de etiqueta
  const cw = (contentW - 6) / 3;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const cx = contentX + col * (cw + 3);
      const cyy = cy + row * 23;
      const isExpired = row === 1 && col === 0;
      const isSoon = row === 0 && col === 2;
      card(doc, cx, cyy, cw, 21);
      fill(doc, isExpired ? C.redSoft : isSoon ? C.amberSoft : C.brandSoft);
      rrect(doc, cx + 1.5, cyy + 1.5, 4, 4, 0.8, 'F');
      pill(doc, cx + cw - 14, cyy + 1.5, 12, 3, isExpired ? 'Vencido' : isSoon ? 'Hoje' : 'Vence 3d', isExpired ? C.redSoft : isSoon ? C.amberSoft : C.brandSoft, isExpired ? C.red : isSoon ? C.amber : C.brand);
      ink(doc, C.ink);
      font(doc, 'bold', 5);
      doc.text(['Salada Caesar', 'Risoto cogumelos', 'Molho rosé', 'Sopa creme', 'Frango assado', 'Arroz integral'][row * 3 + col], cx + 2, cyy + 8);
      ink(doc, C.muted);
      font(doc, 'normal', 4);
      doc.text('Lote: L-2026-01-A', cx + 2, cyy + 11);
      doc.text('Manip.: 26/01 10:00', cx + 2, cyy + 13.5);
      doc.text('Resp.: Maria S.', cx + 2, cyy + 16);
      btn(doc, cx + 1.5, cyy + 17.5, cw - 3, 3, '▼ Dar baixa', true);
    }
  }
}

function mockManipulators(doc, x, y, w, h) {
  const { contentX, contentY, contentW } = drawAppShell(doc, x, y, w, h, {
    activeMenu: 'Avaliação',
    menuItems: ['Carteira', 'Avaliação', 'Acompanhamento', 'Cadastros'],
    role: 'Nutricionista',
  });

  let cy = contentY + 2;
  ttitle(doc, contentX, cy, 'Manipuladores', 'ASOs, treinamentos e histórico');
  btn(doc, contentX + contentW - 22, cy - 2, 22, 5, '+ Novo funcionário', true);
  cy += 8;

  // KPIs
  const sw = (contentW - 6) / 4;
  [
    ['18', 'Ativos', C.brand],
    ['3', 'ASO vencendo', C.amber],
    ['1', 'ASO vencido', C.red],
    ['12', 'Treinamentos', C.brand],
  ].forEach(([n, l, color], i) => {
    card(doc, contentX + i * (sw + 2), cy, sw, 11);
    ink(doc, C.ink);
    font(doc, 'bold', 8);
    doc.text(n, contentX + 1 + i * (sw + 2), cy + 6);
    ink(doc, C.muted);
    font(doc, 'normal', 4.5);
    doc.text(l, contentX + 1 + i * (sw + 2), cy + 9);
  });
  cy += 14;

  // Lista de manipuladores
  card(doc, contentX, cy, contentW, h - (cy - y) - 6);
  let iy = cy + 2;
  // header
  fill(doc, C.brandSoft);
  rrect(doc, contentX + 1, iy, contentW - 2, 4, 0.5, 'F');
  ink(doc, C.brandDeep);
  font(doc, 'bold', 4.5);
  doc.text('NOME', contentX + 3, iy + 2.8);
  doc.text('FUNÇÃO', contentX + 50, iy + 2.8);
  doc.text('ASO', contentX + 95, iy + 2.8);
  doc.text('TREINAMENTOS', contentX + 120, iy + 2.8);
  iy += 5;

  [
    ['Maria Silva Santos', 'Cozinheira', '12/2026', '3', 'ok'],
    ['João Oliveira', 'Auxiliar', '03/2026', '2', 'soon'],
    ['Ana Costa', 'Manipuladora', '08/2025', '4', 'alert'],
    ['Pedro Souza', 'Chef', '11/2026', '5', 'ok'],
    ['Carla Lima', 'Cozinheira', '02/2027', '3', 'ok'],
  ].forEach((row) => {
    const [name, role, aso, train, status] = row;
    ink(doc, C.ink);
    font(doc, 'normal', 5);
    doc.text(name, contentX + 3, iy + 2.8);
    ink(doc, C.body);
    font(doc, 'normal', 4.5);
    doc.text(role, contentX + 50, iy + 2.8);
    const tone = status === 'ok' ? C.brand : status === 'soon' ? C.amber : C.red;
    const toneSoft = status === 'ok' ? C.brandSoft : status === 'soon' ? C.amberSoft : C.redSoft;
    pill(doc, contentX + 95, iy + 0.5, 16, 3, aso, toneSoft, tone);
    ink(doc, C.body);
    font(doc, 'normal', 4.5);
    doc.text(train, contentX + 120, iy + 2.8);
    stroke(doc, C.hair, 0.1);
    doc.line(contentX + 2, iy + 4.5, contentX + contentW - 2, iy + 4.5);
    iy += 5;
  });
}

function mockReceiving(doc, x, y, w, h) {
  const { contentX, contentY, contentW } = drawAppShell(doc, x, y, w, h, {
    activeMenu: 'Estoque',
    role: 'Cozinha',
  });

  let cy = contentY + 2;
  ttitle(doc, contentX, cy, 'Recebimentos', 'Conferência de notas e temperaturas');
  btn(doc, contentX + contentW - 22, cy - 2, 22, 5, '+ Novo recebimento', true);
  cy += 8;

  // Lista
  [
    ['Distribuidora Alfa', 'NF 12345 · 26/01', 8, 0],
    ['Hortifruti Beta', 'NF 67890 · 25/01', 5, 1],
    ['Frigorífico Gama', 'NF 11122 · 24/01', 12, 0],
  ].forEach(([name, sub, items, rejected]) => {
    card(doc, contentX, cy, contentW, 14);
    ink(doc, C.ink);
    font(doc, 'bold', 6);
    doc.text(name, contentX + 2, cy + 4);
    ink(doc, C.muted);
    font(doc, 'normal', 4.5);
    doc.text(sub, contentX + 2, cy + 7);

    // Resumo
    pill(doc, contentX + contentW - 32, cy + 1.5, 16, 3.5, `${items} itens`, C.brandSoft, C.brandDeep);
    if (rejected > 0) {
      pill(doc, contentX + contentW - 14, cy + 1.5, 12, 3.5, `${rejected} rejeit`, C.redSoft, C.red);
    }

    // Mini barra de itens conformes
    ink(doc, C.muted);
    font(doc, 'normal', 4);
    doc.text('Conformes', contentX + 2, cy + 11);
    fill(doc, C.hair);
    rrect(doc, contentX + 20, cy + 9.5, contentW - 24, 1.2, 0.4, 'F');
    fill(doc, rejected > 0 ? C.amber : C.brand);
    rrect(doc, contentX + 20, cy + 9.5, (contentW - 24) * (1 - rejected / items), 1.2, 0.4, 'F');
    ink(doc, C.body);
    font(doc, 'bold', 4);
    doc.text(`${items - rejected}/${items}`, contentX + contentW - 2, cy + 10.5, { align: 'right' });

    cy += 16;
  });
}

function mockCompanies(doc, x, y, w, h) {
  const { contentX, contentY, contentW } = drawAppShell(doc, x, y, w, h, {
    activeMenu: 'Cadastros',
    menuItems: ['Plataforma', 'Operação', 'Conformidade', 'Cadastros', 'Administração'],
    role: 'Platform Admin',
  });

  let cy = contentY + 2;
  ttitle(doc, contentX, cy, 'Empresas', 'Gestão das empresas atendidas pela RT');
  btn(doc, contentX + contentW - 18, cy - 2, 18, 5, '+ Nova empresa', true);
  cy += 8;

  // Filtros / busca
  card(doc, contentX, cy, contentW, 6);
  input(doc, contentX + 2, cy + 1.5, 50, 3.5, '🔍 Buscar empresa...');
  pill(doc, contentX + 54, cy + 1.5, 14, 3.5, 'Ativas', C.brandSoft, C.brandDeep);
  pill(doc, contentX + 70, cy + 1.5, 14, 3.5, 'Todas', C.white, C.muted);
  cy += 8;

  // Lista de empresas
  card(doc, contentX, cy, contentW, h - (cy - y) - 6);
  let iy = cy + 2;
  [
    ['Restaurante Mar Azul', 'CNPJ 12.345.678/0001-90 · Macaé', '82%', 'amber'],
    ['Padaria Imbetiba', 'CNPJ 23.456.789/0001-01 · Macaé', '72%', 'amber'],
    ['Hotel Litoral', 'CNPJ 34.567.890/0001-12 · Macaé', '92%', 'green'],
    ['Cantina Escolar', 'CNPJ 45.678.901/0001-23 · Macaé', '58%', 'red'],
    ['Restaurante Brisa', 'CNPJ 56.789.012/0001-34 · Macaé', '88%', 'green'],
  ].forEach(([name, sub, score, status]) => {
    fill(doc, C.white);
    stroke(doc, C.hair, 0.15);
    rrect(doc, contentX + 2, iy, contentW - 4, 7, 0.8, 'FD');

    // Avatar
    fill(doc, C.brandSoft);
    rrect(doc, contentX + 3.5, iy + 1.2, 4.5, 4.5, 0.6, 'F');
    ink(doc, C.brandDeep);
    font(doc, 'bold', 4);
    doc.text(name.split(' ').slice(0, 2).map((w) => w[0]).join(''), contentX + 5.75, iy + 4, { align: 'center' });

    ink(doc, C.ink);
    font(doc, 'bold', 5);
    doc.text(name, contentX + 9.5, iy + 3);
    ink(doc, C.muted);
    font(doc, 'normal', 4);
    doc.text(sub, contentX + 9.5, iy + 5.5);

    const tone = status === 'green' ? C.brand : status === 'amber' ? C.amber : C.red;
    const toneSoft = status === 'green' ? C.brandSoft : status === 'amber' ? C.amberSoft : C.redSoft;
    pill(doc, contentX + contentW - 14, iy + 2, 10, 3.5, score, toneSoft, tone);

    iy += 8;
  });
}

// ============================================================
//  ESTRUTURA DO MANUAL
// ============================================================

// Cada função: title, role, mockup function, what (o que é), how (como usar), tip
const FEATURES = [
  // ====== NUTRICIONISTA ======
  {
    role: 'nutri',
    title: 'Carteira de clientes',
    subtitle: 'O painel inicial da nutricionista',
    mock: mockDashboardNutri,
    what:
      'É a tela inicial quando a nutricionista entra no sistema. Mostra a saúde geral da carteira: score médio das empresas atendidas, quantas estão em situação crítica, próximas visitas técnicas e alertas de pendências.',
    how: [
      'KPIs no topo: score médio, total de empresas e alertas do dia.',
      'Bloco "Afazeres" — lista as pendências dos clientes (empresas sem visita há 60 dias, ASOs vencendo, NCs paradas, controle de pragas vencido).',
      'Lista da carteira no rodapé: cada empresa com seu score, NCs abertas e indicadores de conformidade.',
      'Clique em "Relatório (PDF)" para baixar o documento de conformidade assinável da empresa.',
    ],
    tip: 'Comece o dia pela coluna de "Afazeres" — cada card vira um item da sua agenda. Quando todos zeram, a carteira está sob controle.',
  },
  {
    role: 'nutri',
    title: 'Visitas técnicas',
    subtitle: 'Inspeções sanitárias (RDC 216 + RDC 275)',
    mock: mockAuditDetail,
    what:
      'Onde a RT realiza as visitas de avaliação às empresas. Cada visita usa um modelo (checklist) e produz um score por categoria. Visitas finalizadas geram um relatório assinado em PDF e abrem automaticamente as NCs identificadas.',
    how: [
      'Agendar uma visita em "Avaliação → Visitas técnicas".',
      'No dia, abrir a visita e marcar cada item como C (conforme), NC (não conforme) ou NA (não se aplica).',
      'Itens marcados como NC viram automaticamente Não-conformidades com prazo de 30 dias.',
      'Botões disponíveis: Reagendar, Cancelar, Salvar rascunho, Finalizar (assina e bloqueia).',
      'Visitas finalizadas têm o status travado — e o PDF pode ser exportado.',
    ],
    tip: 'Use "Salvar rascunho" durante a visita para não perder o trabalho. Só finalize quando estiver tudo conferido — depois de assinada, a visita não retrocede.',
  },
  {
    role: 'nutri',
    title: 'Não-conformidades',
    subtitle: 'Plano de ação 5W2H',
    mock: mockNonConformities,
    what:
      'Lista de problemas identificados durante visitas, checklists ou registros manuais. Cada NC tem severidade, prazo, responsável e plano de ação no formato 5W2H (O quê, Por quê, Onde, Quando, Quem, Como, Quanto custa).',
    how: [
      'Cards no topo agrupam as NCs por cliente — clique para filtrar.',
      'Abrir uma NC: descrição, severidade, plano 5W2H e fotos (evidência e fechamento).',
      'Para fechar: marcar status como "Fechada", adicionar nota de fechamento e foto da correção.',
      'Filtros por status (aberta, em andamento, fechada) e severidade.',
    ],
    tip: 'A foto de fechamento é a melhor proteção da RT. Sem ela, é palavra contra palavra na auditoria.',
  },
  {
    role: 'nutri',
    title: 'Manipuladores',
    subtitle: 'Cadastro de funcionários, ASOs e treinamentos',
    mock: mockManipulators,
    what:
      'Ficha completa de cada manipulador de alimentos da empresa. Controla ASOs (Atestados de Saúde Ocupacional), histórico de treinamentos e dados pessoais. Disponível para a nutricionista (RT) e gerente; o cozinheiro não vê.',
    how: [
      'KPIs no topo: ativos, ASOs vencendo em 30 dias, ASOs vencidos, total de treinamentos.',
      'Botão "+ Novo funcionário" para cadastrar (nome, função, CPF, data de admissão).',
      'Clicar em um funcionário abre o histórico de ASOs (com upload do PDF) e treinamentos.',
      'O sistema envia alerta no painel quando o ASO está perto de vencer.',
    ],
    tip: 'ASO vencido = NC imediata em qualquer visita da Vigilância. Configure o lembrete (Notificações) para receber 30 dias antes.',
  },
  {
    role: 'nutri',
    title: 'Checklists',
    subtitle: 'Procedimentos operacionais com histórico',
    mock: mockDocuments,
    what:
      'Templates de checklist criados pela RT e executados pelo cozinheiro no dia a dia. Frequência diária, semanal ou mensal. Cada execução fica registrada com data, responsável, itens marcados e opcionalmente foto.',
    how: [
      'Criar um template em "Avaliação → Checklists → Novo template" (itens + frequência).',
      'Use a Biblioteca para clonar modelos prontos (RDC 216, RDC 275, RDC 259).',
      'Para executar: cozinha entra em "Conformidade → Checklists" e marca os itens.',
      'Execuções aparecem no histórico — a RT acompanha quem fez, quando e o que deixou pendente.',
    ],
    tip: 'Crie checklists curtos e diários ao invés de longos e semanais — o engajamento da cozinha é muito maior.',
  },

  // ====== ACOMPANHAMENTO ======
  {
    role: 'nutri',
    title: 'Temperatura',
    subtitle: 'Registro de equipamentos e leituras',
    mock: mockTemperature,
    what:
      'Cadastro de todos os equipamentos térmicos da cozinha (freezers, geladeiras, estufas) com faixa segura de operação. A cozinha registra leituras periódicas; o sistema alerta visualmente quando sai da faixa.',
    how: [
      'Cadastrar equipamentos com nome, tipo e faixa (mín/máx em °C).',
      'Para registrar: selecionar equipamento, digitar temperatura, anexar foto do termômetro (opcional) e salvar.',
      'Lista de últimas leituras mostra um ícone vermelho quando a temperatura fica fora da faixa.',
      'O cozinheiro também acessa essa tela (a RT a cadastra; a cozinha registra).',
    ],
    tip: 'A foto do termômetro é evidência para auditoria. Vale a pena fazer disso parte do procedimento operacional fixo.',
  },
  {
    role: 'nutri',
    title: 'Controle de pragas',
    subtitle: 'Histórico de dedetização e MIP',
    mock: mockReceiving,
    what:
      'Registro do programa de controle integrado de pragas (CIP) exigido pela RDC 216 art. 4.4. Cadastra fornecedores licenciados, datas de aplicação, produtos usados e o documento entregue pela empresa contratada.',
    how: [
      'Aba "Fornecedores": cadastra a empresa de controle (CNPJ, alvará/licença sanitária, contato).',
      'Aba "Serviços": registra cada aplicação (data, tipo, técnico responsável, próxima data).',
      'Upload do laudo/certificado entregue pela empresa contratada.',
      'O painel da nutri alerta quando o próximo serviço está vencido.',
    ],
    tip: 'O documento da empresa contratada é a evidência principal. Quando ela entrega, suba na mesma hora — depois esquece.',
  },
  {
    role: 'nutri',
    title: 'Documentos',
    subtitle: 'Lista da Vigilância Sanitária 2026',
    mock: mockDocuments,
    what:
      'Central de upload dos documentos exigidos pela Vigilância Sanitária, organizados por categoria: Contabilidade, Funcionários e saúde, Controles periódicos, Manuais e planilhas, Carro-pipa (se aplicar) e Licenciamento. Sem editor de texto — é só upload de PDF/imagem.',
    how: [
      'Barra de progresso "X de N entregues" no topo.',
      'Cada item da lista é uma "gaveta" — clique em "Carregar" para subir o arquivo.',
      'Categorias com dicas contextuais (ex.: "Últimos 3 meses", "Entregue pelo fiscal").',
      'Renomear, recategorizar ou excluir documentos a qualquer momento.',
    ],
    tip: 'Mantenha sempre os últimos 3 meses dos controles periódicos (dedetização, ar condicionado, reservatório). É o que o fiscal pede primeiro.',
  },

  // ====== PROPERTY / COZINHA ======
  {
    role: 'property',
    title: 'Início (cozinha)',
    subtitle: 'Painel diário do operador',
    mock: mockPropertyDashboard,
    what:
      'Tela inicial quando o cozinheiro/gerente entra. Foco em "o que fazer agora": checklists pendentes do dia, equipamentos sem leitura, etiquetas vencendo em 24h e atalhos para as ações mais comuns.',
    how: [
      'Atalhos no topo: imprimir etiqueta, registrar temperatura, abrir checklist.',
      'Bloco "Para hoje" lista as tarefas pendentes da rotina.',
      'Alertas vermelhos para etiquetas vencidas ou vencendo nas próximas horas.',
      'Toda a tela é otimizada para celular — cada item é tap-friendly.',
    ],
    tip: 'Se o painel está com 0 tarefas e 0 alertas, está tudo em dia. Não precisa procurar nada além.',
  },
  {
    role: 'property',
    title: 'Imprimir etiqueta (wizard)',
    subtitle: 'Validade calculada, zero digitação',
    mock: mockPrintWizard,
    what:
      'Fluxo único e guiado em 5 passos para imprimir uma etiqueta conforme a RDC 216 da ANVISA. Tudo escolhido de lista (manipulador, grupo, produto) — nada digitado à mão. Validade calculada automaticamente; data e hora de manipulação travadas no exato momento da impressão.',
    how: [
      '1. Manipulador: quem está manipulando (escolhe da lista cadastrada pela RT).',
      '2. Grupo: opcional, filtra os produtos.',
      '3. Produto: seleciona o que vai ser etiquetado.',
      '4. Informações: condição de armazenamento, quantidade, lote/fornecedor (opcionais).',
      '5. Imprimir: confirma e manda para a impressora (relay) ou diálogo do navegador.',
    ],
    tip: 'A data/hora de manipulação NÃO pode ser editada. Isso é proposital — o sistema usa o momento exato em que você imprime. Quanto mais rápido entre manipular e imprimir, melhor.',
  },
  {
    role: 'property',
    title: 'Produção · etiquetas em uso',
    subtitle: 'Dar baixa conforme o lote vai sendo usado',
    mock: mockProduction,
    what:
      'Mostra as etiquetas já impressas que ainda estão "vivas" — aguardando uso, descarte ou vencimento. Cards coloridos por status (verde = ok, amarelo = vence hoje/em breve, vermelho = vencido). Cada baixa pode opcionalmente gerar saída de estoque.',
    how: [
      'Stat cards no topo: ativos, vencendo e vencidos.',
      'Filtros por status e ordenação por validade ou produção.',
      'Cada card mostra produto, lote, manipulação, validade, responsável e saldo de estoque do lote.',
      'Botão "Dar baixa" abre modal com motivo (uso, descarte, vencimento) e opção de baixar do estoque.',
    ],
    tip: 'Vencidos em vermelho devem ser zerados todo dia. Se acumulou, é sinal de que a cozinha está produzindo mais do que consome — vale revisar com a RT.',
  },
  {
    role: 'property',
    title: 'Estoque (matéria-prima)',
    subtitle: 'Saldo dos itens recebidos por lote (FIFO)',
    mock: mockReceiving,
    what:
      'Saldo da matéria-prima que entrou via "Recebimentos" (nota fiscal). Ordenado por validade — o lote mais perto de vencer aparece primeiro (FIFO). Diferente de "Produção", que mostra etiquetas de cozinha.',
    how: [
      'Lista por produto/lote com saldo, unidade e validade.',
      'Cores de alerta: vermelho (vencido) e amarelo (vence em 7 dias).',
      'Botão "Dar saída" registra consumo, descarte ou vencimento.',
      'Filtros por categoria e busca por nome ou lote.',
    ],
    tip: 'O FIFO automático é a forma mais simples de eliminar perdas — sempre use primeiro o que está em cima da lista.',
  },
  {
    role: 'property',
    title: 'Recebimentos',
    subtitle: 'Conferência de notas fiscais',
    mock: mockReceiving,
    what:
      'Registro de cada nota fiscal recebida: fornecedor, número da NF, data, e item a item com lote, quantidade, validade, temperatura na chegada e se foi aceito ou rejeitado.',
    how: [
      'Botão "+ Novo recebimento" inicia o registro.',
      'Cabeçalho: fornecedor (lista) + NF + data + foto da nota.',
      'Itens: produto, lote, quantidade, unidade, validade, temperatura na chegada, marcar se foi rejeitado com motivo.',
      'Ao salvar, o sistema atualiza automaticamente o saldo do estoque.',
    ],
    tip: 'Foto da nota + temperatura na chegada são as evidências mais cobradas pela auditoria. Vale o minutinho extra.',
  },
];

// Encadeia os papéis com as descrições
const ROLES = [
  {
    role: 'nutri',
    title: 'Nutricionista (RT)',
    subtitle: 'Responsável Técnica perante a ANVISA',
    color: [4, 120, 87],
    who: 'A nutricionista (Ariane) cuida da carteira de clientes inteira — múltiplas empresas dentro de uma organização. Avalia visitas técnicas, abre/fecha NCs, mantém documentos e manipuladores em dia.',
    capabilities: [
      'Carteira de clientes (saúde de cada empresa)',
      'Visitas técnicas (avaliação, checklist, assinatura, PDF)',
      'Não-conformidades (5W2H, fotos, fechamento)',
      'Manipuladores · ASOs · Treinamentos',
      'Documentos da empresa (Lista da Vigilância)',
      'Acompanhamento: temperatura, pragas, fotos, agenda',
      'Administração: empresas, usuários, assinatura',
    ],
  },
  {
    role: 'property',
    title: 'Cozinha (Property)',
    subtitle: 'Operador na ponta · uma empresa',
    color: [4, 120, 87],
    who: 'O operador da cozinha (cozinheiro, gerente local) usa o sistema no dia a dia: imprime etiqueta, registra temperatura, faz checklist, dá baixa em etiquetas vencidas, registra recebimentos.',
    capabilities: [
      'Painel diário com tarefas e atalhos',
      'Imprimir etiqueta (wizard de 5 passos)',
      'Produção e validades (dar baixa)',
      'Estoque e recebimentos',
      'Checklist · temperatura · controle de pragas',
      'Documentos da empresa (upload)',
      'NÃO acessa: outras empresas, manipuladores, agenda',
    ],
  },
];

// ============================================================
//  GERAR O PDF
// ============================================================

function main() {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });

  // CAPA
  drawCover(doc);

  // SUMÁRIO
  doc.addPage();
  // Preparar entries (paginação calculada DEPOIS — primeira passada estima):
  // Estratégia simples: 1 página por feature, primeira página de cada role = divider.
  const tocEntries = [];
  let p = 4; // depois da capa(1), sumário(2-3 com 2 páginas reservadas) … vamos contar de verdade.

  // Vamos rodar a geração em DUAS passadas: primeira só para calcular páginas; segunda gera.
  // Mais simples: gerar tudo de uma vez e preencher o TOC depois com .setPage().

  // Reserva 2 páginas para sumário (atual page=2 e nova page=3)
  doc.addPage();

  // Para cada papel, gerar divider + páginas
  const rolePageStarts = {};
  const featurePages = [];

  for (const r of ROLES) {
    doc.addPage();
    rolePageStarts[r.role] = doc.getCurrentPageInfo().pageNumber;
    drawRoleDivider(doc, r);

    // Features do papel
    const items = FEATURES.filter((f) => f.role === r.role);
    for (const f of items) {
      doc.addPage();
      const page = doc.getCurrentPageInfo().pageNumber;
      featurePages.push({ feature: f, page });

      let y = drawPageHeader(doc);

      // Título da feature
      ink(doc, C.brandDeep);
      font(doc, 'bold', 6.5);
      doc.text(r.title.toUpperCase(), M, y, { charSpace: 1.5 });
      y += 4;
      ink(doc, C.ink);
      font(doc, 'bold', 16);
      doc.text(f.title, M, y + 4);
      y += 9;
      ink(doc, C.muted);
      font(doc, 'normal', 9);
      doc.text(f.subtitle, M, y);
      y += 5;

      // Mockup
      const mockH = 95;
      f.mock(doc, M, y, CONTENT_W, mockH);
      y += mockH + 6;

      // "Captura de tela ilustrativa"
      ink(doc, C.faint);
      font(doc, 'italic', 6.5);
      doc.text(
        'Mockup ilustrativo · siga as cores e a hierarquia visual do design real.',
        M,
        y,
      );
      y += 6;

      // "O QUE É"
      y = ensure(doc, y, 30);
      fill(doc, C.brand);
      doc.rect(M, y - 3, 1.5, 4, 'F');
      ink(doc, C.brandDeep);
      font(doc, 'bold', 8);
      doc.text('O QUE É', M + 3, y);
      y += 2;
      ink(doc, C.body);
      font(doc, 'normal', 9);
      y = wrap(doc, f.what, M, y + 4, CONTENT_W, 4.5);
      y += 5;

      // COMO USAR
      y = ensure(doc, y, 30);
      fill(doc, C.brand);
      doc.rect(M, y - 3, 1.5, 4, 'F');
      ink(doc, C.brandDeep);
      font(doc, 'bold', 8);
      doc.text('COMO USAR', M + 3, y);
      y += 4;
      ink(doc, C.body);
      font(doc, 'normal', 9);
      for (let i = 0; i < f.how.length; i++) {
        y = ensure(doc, y, 8);
        fill(doc, C.brandSoft);
        doc.circle(M + 1.5, y + 1, 1.8, 'F');
        ink(doc, C.brandDeep);
        font(doc, 'bold', 6);
        doc.text(String(i + 1), M + 1.5, y + 1.8, { align: 'center' });
        ink(doc, C.body);
        font(doc, 'normal', 9);
        y = wrap(doc, f.how[i], M + 5, y + 2, CONTENT_W - 5, 4.5);
        y += 1.5;
      }
      y += 3;

      // DICA
      y = ensure(doc, y, 20);
      fill(doc, C.brandSoft);
      rrect(doc, M, y, CONTENT_W, 16, 1.5, 'F');
      stroke(doc, C.brand, 0.3);
      // Faixa lateral
      fill(doc, C.brand);
      rrect(doc, M, y, 2, 16, 1.5, 'F');
      ink(doc, C.brandDeep);
      font(doc, 'bold', 7);
      doc.text('DICA DA NUTRI', M + 5, y + 4);
      ink(doc, C.body);
      font(doc, 'italic', 8.5);
      wrap(doc, f.tip, M + 5, y + 8, CONTENT_W - 8, 4);

      drawFooter(doc);
    }
  }

  // Preenche o sumário (página 2 e 3 reservadas)
  doc.setPage(2);
  const tocList = [];
  for (const r of ROLES) {
    tocList.push({
      kind: 'role',
      title: r.title,
      subtitle: r.subtitle,
      page: rolePageStarts[r.role],
    });
    for (const fp of featurePages.filter((f) => f.feature.role === r.role)) {
      tocList.push({
        kind: 'feature',
        title: fp.feature.title,
        page: fp.page,
      });
    }
  }
  drawToc(doc, tocList);
  drawFooter(doc);

  // Salva
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  const arr = doc.output('arraybuffer');
  writeFileSync(OUT_FILE, Buffer.from(arr));
  console.log(`✓ PDF gerado: ${OUT_FILE}`);
  const sizeKb = (Buffer.from(arr).length / 1024).toFixed(0);
  console.log(`  ${sizeKb} KB · ${doc.internal.pages.length - 1} páginas`);
}

main();
