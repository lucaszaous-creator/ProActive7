#!/usr/bin/env node
// =====================================================================
// ProActive7 — Agente de impressão local (estilo PrintNode, grátis)
//
// Roda no PC da cozinha (Windows/Mac/Linux, Node 18+). Faz polling na
// Edge Function `print-agent` do Supabase, recebe os jobs da fila e manda
// o ZPL pra impressora térmica via TCP porta 9100 (impressora de rede/Wi-Fi,
// ex: Elgin L42PRO FULL).
//
// Detecção automática: o agente varre a rede local procurando impressoras
// (TCP 9100) e reporta a lista pro app. Na tela Cadastros -> Impressoras
// você abre um popup e clica na impressora encontrada — não precisa saber
// o IP. Depois disso o agente recebe o IP escolhido automaticamente.
//
// Setup:
//   1. Instale Node 18+ (https://nodejs.org).
//   2. Copie config.example.json para config.json e preencha:
//        SUPABASE_URL, SUPABASE_ANON_KEY (chaves públicas do app),
//        AGENT_TOKEN  (gerado na tela Cadastros -> Impressoras).
//      (PRINTER_HOST é opcional — normalmente você escolhe pela web.)
//   3. Rode:  node print-agent.mjs
//      (ou `npm start`). Deixe rodando — pode pôr no inicializar do Windows.
// =====================================================================

import net from 'node:net';
import os from 'node:os';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadConfig() {
  // Prioriza variáveis de ambiente; cai pro config.json local.
  let file = {};
  try {
    file = JSON.parse(readFileSync(join(__dirname, 'config.json'), 'utf8'));
  } catch {
    /* sem arquivo — usa env */
  }
  const cfg = {
    supabaseUrl: process.env.SUPABASE_URL || file.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY || file.SUPABASE_ANON_KEY,
    token: process.env.AGENT_TOKEN || file.AGENT_TOKEN,
    // PRINTER_HOST agora é opcional: normalmente vem da escolha na web.
    printerHost: process.env.PRINTER_HOST || file.PRINTER_HOST || '',
    printerPort: Number(process.env.PRINTER_PORT || file.PRINTER_PORT || 9100),
    pollMs: Number(process.env.POLL_MS || file.POLL_MS || 2000),
    // De quanto em quanto tempo revarre a rede e reporta (ms).
    scanMs: Number(process.env.SCAN_MS || file.SCAN_MS || 60000),
  };
  const missing = ['supabaseUrl', 'anonKey', 'token'].filter((k) => !cfg[k]);
  if (missing.length) {
    console.error('Config faltando:', missing.join(', '));
    process.exit(1);
  }
  return cfg;
}

const cfg = loadConfig();
const fnUrl = `${cfg.supabaseUrl.replace(/\/$/, '')}/functions/v1/print-agent`;

// Impressora atribuída pela web (vem na resposta do poll). Tem prioridade
// sobre o config.json. Começa com o que estiver no config (se houver).
let assigned = { host: cfg.printerHost || null, port: cfg.printerPort };

async function callAgent(payload) {
  const res = await fetch(fnUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: cfg.anonKey,
      Authorization: `Bearer ${cfg.anonKey}`,
    },
    body: JSON.stringify({ token: cfg.token, ...payload }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${text}`);
  }
  return res.json();
}

// Testa se há algo escutando em host:port (impressora "crua" na 9100).
function probe(host, port, timeout = 400) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeout);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}

// Deriva os prefixos /24 das interfaces de rede locais (ex: "192.168.0").
function localSubnets() {
  const bases = new Set();
  const ifaces = os.networkInterfaces();
  for (const list of Object.values(ifaces)) {
    for (const ni of list ?? []) {
      if (ni.family === 'IPv4' && !ni.internal) {
        bases.add(ni.address.split('.').slice(0, 3).join('.'));
      }
    }
  }
  return [...bases];
}

// Varre a(s) sub-rede(s) na porta 9100 e devolve as impressoras achadas.
async function discoverPrinters() {
  const found = [];
  for (const base of localSubnets()) {
    const checks = [];
    for (let i = 1; i <= 254; i++) {
      const host = `${base}.${i}`;
      checks.push(
        probe(host, 9100).then((ok) => {
          if (ok) found.push({ host, port: 9100 });
        }),
      );
    }
    await Promise.all(checks);
  }
  // Inclui o host fixo do config, se houver e não tiver aparecido.
  if (cfg.printerHost && !found.some((p) => p.host === cfg.printerHost)) {
    found.push({ host: cfg.printerHost, port: cfg.printerPort });
  }
  return found;
}

async function scanAndReport() {
  try {
    const printers = await discoverPrinters();
    await callAgent({ action: 'report_printers', printers });
    console.log(`Detectadas ${printers.length} impressora(s) na rede.`);
  } catch (e) {
    console.error('Falha ao detectar impressoras:', String(e));
  }
}

// Envia bytes crus (ZPL) pra impressora de rede na porta 9100.
function sendToPrinter(zpl) {
  return new Promise((resolve, reject) => {
    if (!assigned.host) {
      return reject(
        new Error('Nenhuma impressora selecionada (escolha no app, em Impressoras)'),
      );
    }
    const socket = net.createConnection(
      { host: assigned.host, port: assigned.port || 9100 },
      () => {
        socket.write(zpl, 'utf8', () => socket.end());
      },
    );
    socket.setTimeout(10000);
    socket.on('error', reject);
    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('timeout falando com a impressora'));
    });
    socket.on('close', () => resolve());
  });
}

async function processJob(job) {
  try {
    // copies já vem embutido no ZPL via ^PQ; envia o payload uma vez.
    await sendToPrinter(job.zpl);
    await callAgent({ action: 'ack', job_id: job.id, status: 'done' });
    console.log(`[ok] job ${job.id} impresso`);
  } catch (e) {
    await callAgent({
      action: 'ack',
      job_id: job.id,
      status: 'error',
      error: String(e),
    }).catch(() => {});
    console.error(`[erro] job ${job.id}:`, String(e));
  }
}

let lastOk = false;
async function loop() {
  try {
    const { jobs, printer } = await callAgent({ action: 'poll' });
    // A impressora escolhida na web tem prioridade.
    if (printer?.host) assigned = { host: printer.host, port: printer.port || 9100 };
    if (!lastOk) {
      console.log('Conectado ao ProActive7. Aguardando impressões...');
      lastOk = true;
    }
    for (const job of jobs ?? []) await processJob(job);
  } catch (e) {
    lastOk = false;
    console.error('Falha no poll:', String(e));
  } finally {
    setTimeout(loop, cfg.pollMs);
  }
}

console.log('Agente iniciado. Varrendo a rede por impressoras...');
void scanAndReport();
setInterval(() => void scanAndReport(), cfg.scanMs);
loop();

// ---------------------------------------------------------------------
// MODO USB (sem rede): a detecção automática acha impressoras de REDE
// (porta 9100). Pra impressora USB, substitua sendToPrinter() por um
// spool cru e informe o IP/host manualmente:
//   Windows:  `copy /b temp.zpl "\\\\localhost\\NOME_COMPARTILHADO"`
//             (compartilhe a impressora e use o nome do share).
//   Linux/Mac: `lp -d NOME_IMPRESSORA -o raw temp.zpl`
// Grave job.zpl num arquivo temporário e chame o comando acima.
// ---------------------------------------------------------------------
