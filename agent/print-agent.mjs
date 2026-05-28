#!/usr/bin/env node
// =====================================================================
// ProActive7 — Agente de impressão local (estilo PrintNode, grátis)
//
// Roda no PC da cozinha (Windows/Mac/Linux). Faz polling na Edge Function
// `print-agent` do Supabase, recebe os jobs da fila e manda o ZPL pra
// impressora térmica via TCP porta 9100 (impressora de rede/Wi-Fi, ex:
// Elgin L42PRO FULL).
//
// Detecção automática: o agente varre a rede local procurando impressoras
// (TCP 9100) e reporta a lista pro app. Na tela Cadastros -> Impressoras
// você abre um popup e clica na impressora — não precisa saber o IP.
//
// USO MAIS SIMPLES (executável .exe): basta abrir o programa, colar o
// TOKEN (gerado na tela de Impressoras) quando ele pedir, e deixar rodando.
// Ele se registra para iniciar junto com o Windows automaticamente.
// =====================================================================

import net from 'node:net';
import os from 'node:os';
import readline from 'node:readline';
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Chaves PÚBLICAS do projeto (seguras de embutir — são as mesmas do site).
const DEFAULT_URL = 'https://glvdiicipblsohdgmqaz.supabase.co';
const DEFAULT_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsdmRpaWNpcGJsc29oZGdtcWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NzA2MDAsImV4cCI6MjA5NTA0NjYwMH0.-RZ1w7l78auSDe7u5-gcFJumLRusjrF4i28WibbK4EI';

// Quando empacotado (.exe), os dados ficam ao lado do executável.
const isPackaged = !!process.pkg;
const baseDir = isPackaged
  ? dirname(process.execPath)
  : dirname(fileURLToPath(import.meta.url));
const configPath = join(baseDir, 'proactive7-agente.json');

function readConfigFile() {
  // Aceita o config.json antigo também, por compatibilidade.
  for (const name of ['proactive7-agente.json', 'config.json']) {
    try {
      return JSON.parse(readFileSync(join(baseDir, name), 'utf8'));
    } catch {
      /* tenta o próximo */
    }
  }
  return {};
}

function saveToken(token) {
  try {
    writeFileSync(configPath, JSON.stringify({ AGENT_TOKEN: token }, null, 2));
  } catch (e) {
    console.error('Não consegui salvar o token:', String(e));
  }
}

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(question, (a) => {
      rl.close();
      resolve(a.trim());
    }),
  );
}

// Registra o agente para iniciar com o Windows (só quando é .exe).
function ensureAutostart() {
  if (process.platform !== 'win32' || !isPackaged) return;
  try {
    spawnSync('reg', [
      'add',
      'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
      '/v',
      'ProActive7Agente',
      '/t',
      'REG_SZ',
      '/d',
      `"${process.execPath}"`,
      '/f',
    ]);
  } catch {
    /* sem permissão — segue mesmo assim */
  }
}

async function loadConfig() {
  const file = readConfigFile();
  let token = process.env.AGENT_TOKEN || file.AGENT_TOKEN;

  // Sem token: pede ao usuário (modo executável) e salva.
  if (!token) {
    console.log('\n=== ProActive7 — Agente de impressão ===');
    console.log(
      'Cole o TOKEN da impressora (tela Cadastros -> Impressoras -> cadastrar).',
    );
    token = await ask('Token: ');
    if (!token) {
      console.error('Token vazio. Feche e abra de novo para tentar.');
      await ask('Tecle Enter para sair.');
      process.exit(1);
    }
    saveToken(token);
    ensureAutostart();
    console.log('Token salvo! Não vou pedir de novo neste computador.\n');
  }

  return {
    supabaseUrl: process.env.SUPABASE_URL || file.SUPABASE_URL || DEFAULT_URL,
    anonKey: process.env.SUPABASE_ANON_KEY || file.SUPABASE_ANON_KEY || DEFAULT_ANON,
    token,
    printerHost: process.env.PRINTER_HOST || file.PRINTER_HOST || '',
    printerPort: Number(process.env.PRINTER_PORT || file.PRINTER_PORT || 9100),
    pollMs: Number(process.env.POLL_MS || file.POLL_MS || 2000),
    scanMs: Number(process.env.SCAN_MS || file.SCAN_MS || 60000),
  };
}

let cfg;
let fnUrl;
// Impressora atribuída pela web (vem na resposta do poll).
let assigned = { host: null, port: 9100 };

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

async function main() {
  cfg = await loadConfig();
  fnUrl = `${cfg.supabaseUrl.replace(/\/$/, '')}/functions/v1/print-agent`;
  assigned = { host: cfg.printerHost || null, port: cfg.printerPort };
  console.log('Agente iniciado. Varrendo a rede por impressoras...');
  console.log('Pode minimizar esta janela. Deixe-a aberta para imprimir.');
  void scanAndReport();
  setInterval(() => void scanAndReport(), cfg.scanMs);
  loop();
}

main().catch(async (e) => {
  console.error('Erro fatal:', String(e));
  // No modo .exe a janela fecharia sozinha; segura pra mensagem ser lida.
  if (isPackaged) await ask('Tecle Enter para sair.');
  process.exit(1);
});

// ---------------------------------------------------------------------
// MODO USB (sem rede): a detecção automática acha impressoras de REDE
// (porta 9100). Pra impressora USB, informe o IP/host manualmente no
// proactive7-agente.json e troque sendToPrinter() por um spool cru:
//   Windows:  copy /b temp.zpl "\\\\localhost\\NOME_COMPARTILHADO"
//   Linux/Mac: lp -d NOME_IMPRESSORA -o raw temp.zpl
// ---------------------------------------------------------------------
