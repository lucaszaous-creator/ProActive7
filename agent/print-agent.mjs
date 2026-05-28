#!/usr/bin/env node
// =====================================================================
// ProActive7 — Agente de impressão local (estilo PrintNode, grátis)
//
// Modo executável (.exe Windows) ou script Node. Quando rodado como .exe,
// pede o TOKEN na primeira vez (gerado na tela Cadastros -> Impressoras),
// salva ao lado do executável e se registra para iniciar com o Windows.
// =====================================================================

import net from 'node:net';
import os from 'node:os';
import { readFileSync, writeFileSync, readSync, appendFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';

// Chaves PÚBLICAS do projeto (seguras de embutir — são as mesmas do site).
const DEFAULT_URL = 'https://glvdiicipblsohdgmqaz.supabase.co';
const DEFAULT_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsdmRpaWNpcGJsc29oZGdtcWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NzA2MDAsImV4cCI6MjA5NTA0NjYwMH0.-RZ1w7l78auSDe7u5-gcFJumLRusjrF4i28WibbK4EI';

// Detecta modo "executável" sem depender de process.pkg (que pode não
// estar definido em build ESM do yao-pkg).
const isExe =
  !!process.pkg ||
  /\.exe$/i.test(process.execPath) &&
    !/[\\/](node|node\.exe)$/i.test(process.execPath);
const baseDir = dirname(process.execPath);
const configPath = join(baseDir, 'proactive7-agente.json');
const logPath = join(baseDir, 'proactive7-agente.log');

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  try {
    appendFileSync(logPath, line);
  } catch {
    /* ignora */
  }
}

// Pausa síncrona até o usuário apertar Enter (não usa readline — funciona
// em qualquer contexto de stdin, inclusive empacotado).
function pauseSync(msg = 'Tecle Enter para sair.') {
  process.stdout.write(msg + '\n');
  try {
    const buf = Buffer.alloc(1);
    for (;;) {
      const n = readSync(0, buf, 0, 1);
      if (n === 0 || buf[0] === 0x0a) return;
    }
  } catch {
    // Sem stdin disponível: segura a janela por 30s pra dar tempo de ler.
    const end = Date.now() + 30000;
    while (Date.now() < end) {
      /* busy wait */
    }
  }
}

// Lê uma linha do stdin (síncrono). Não usa readline.
function askSync(question) {
  process.stdout.write(question);
  const out = [];
  const buf = Buffer.alloc(1);
  for (;;) {
    let n = 0;
    try {
      n = readSync(0, buf, 0, 1);
    } catch {
      break;
    }
    if (n === 0) break;
    const ch = buf[0];
    if (ch === 0x0a) break; // \n
    if (ch === 0x0d) continue; // \r (Windows)
    out.push(ch);
  }
  return Buffer.from(out).toString('utf8').trim();
}

function readConfigFile() {
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
    log(`Token salvo em ${configPath}`);
  } catch (e) {
    log('Falha ao salvar token: ' + String(e));
  }
}

// Registra o agente para iniciar com o Windows.
function ensureAutostart() {
  if (process.platform !== 'win32' || !isExe) return;
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
    log('Auto-start configurado.');
  } catch (e) {
    log('Auto-start falhou (sem permissão?): ' + String(e));
  }
}

function loadConfig() {
  const file = readConfigFile();
  let token = process.env.AGENT_TOKEN || file.AGENT_TOKEN;

  if (!token) {
    console.log('\n=================================================');
    console.log('  ProActive7 — Agente de impressao');
    console.log('=================================================');
    console.log('Cole o TOKEN da impressora (tela Cadastros ->');
    console.log('Impressoras -> cadastrar) e tecle Enter.\n');
    token = askSync('Token: ');
    if (!token) {
      log('Token vazio. Feche e abra de novo para tentar.');
      pauseSync();
      process.exit(1);
    }
    saveToken(token);
    ensureAutostart();
    console.log('\nToken salvo! Nao vou pedir de novo neste computador.');
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
    log(`Detectadas ${printers.length} impressora(s) na rede.`);
  } catch (e) {
    log('Falha ao detectar impressoras: ' + String(e));
  }
}

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
    log(`[ok] job ${job.id} impresso`);
  } catch (e) {
    await callAgent({
      action: 'ack',
      job_id: job.id,
      status: 'error',
      error: String(e),
    }).catch(() => {});
    log(`[erro] job ${job.id}: ${String(e)}`);
  }
}

let lastOk = false;
async function loop() {
  try {
    const { jobs, printer } = await callAgent({ action: 'poll' });
    if (printer?.host) assigned = { host: printer.host, port: printer.port || 9100 };
    if (!lastOk) {
      log('Conectado ao ProActive7. Aguardando impressoes...');
      lastOk = true;
    }
    for (const job of jobs ?? []) await processJob(job);
  } catch (e) {
    lastOk = false;
    log('Falha no poll: ' + String(e));
  } finally {
    setTimeout(loop, cfg.pollMs);
  }
}

async function main() {
  log(`Iniciando. execPath=${process.execPath}, isExe=${isExe}, baseDir=${baseDir}`);
  cfg = loadConfig();
  fnUrl = `${cfg.supabaseUrl.replace(/\/$/, '')}/functions/v1/print-agent`;
  assigned = { host: cfg.printerHost || null, port: cfg.printerPort };
  console.log('\nAgente rodando. Pode minimizar esta janela.');
  console.log('Mantenha-a aberta — fechar para a impressao.\n');
  void scanAndReport();
  setInterval(() => void scanAndReport(), cfg.scanMs);
  loop();
}

// Qualquer crash não tratado: loga e segura a janela.
process.on('uncaughtException', (e) => {
  log('uncaughtException: ' + (e && e.stack ? e.stack : String(e)));
  pauseSync();
  process.exit(1);
});
process.on('unhandledRejection', (e) => {
  log('unhandledRejection: ' + (e && e.stack ? e.stack : String(e)));
  pauseSync();
  process.exit(1);
});

try {
  main().catch((e) => {
    log('Erro fatal: ' + (e && e.stack ? e.stack : String(e)));
    pauseSync();
    process.exit(1);
  });
} catch (e) {
  log('Erro na inicializacao: ' + (e && e.stack ? e.stack : String(e)));
  pauseSync();
  process.exit(1);
}
