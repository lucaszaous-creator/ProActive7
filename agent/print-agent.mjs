#!/usr/bin/env node
// =====================================================================
// ProActive7 — Agente de impressão local (estilo PrintNode, grátis)
//
// Modo executável (.exe Windows) ou script Node. No Windows, pede o
// TOKEN numa CAIXA DE DIÁLOGO (não depende do console, que falha em
// executável empacotado). Salva o token ao lado do .exe e registra o
// agente para iniciar com o Windows.
// =====================================================================

import net from 'node:net';
import os from 'node:os';
import { readFileSync, writeFileSync, readSync, appendFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';

// Chaves PÚBLICAS do projeto (seguras de embutir — as mesmas do site).
const DEFAULT_URL = 'https://glvdiicipblsohdgmqaz.supabase.co';
const DEFAULT_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsdmRpaWNpcGJsc29oZGdtcWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NzA2MDAsImV4cCI6MjA5NTA0NjYwMH0.-RZ1w7l78auSDe7u5-gcFJumLRusjrF4i28WibbK4EI';

const isWin = process.platform === 'win32';
const baseDir = dirname(process.execPath);
const configPath = join(baseDir, 'proactive7-agente.json');
const logPath = join(baseDir, 'proactive7-agente.log');

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    process.stdout.write(line);
  } catch {
    /* console pode não existir no exe */
  }
  try {
    appendFileSync(logPath, line);
  } catch {
    /* ignora */
  }
}

// ---------- Diálogos nativos do Windows (via PowerShell) ----------
function psRun(script) {
  const r = spawnSync(
    'powershell',
    ['-NoProfile', '-NonInteractive', '-Command', script],
    { encoding: 'utf8', windowsHide: true },
  );
  return (r.stdout || '').replace(/\r?\n$/, '');
}

function inputBox(prompt, title) {
  // Caixa de texto com OK/Cancelar; devolve o que o usuário digitou.
  const p = prompt.replace(/'/g, "''");
  const t = title.replace(/'/g, "''");
  return psRun(
    `Add-Type -AssemblyName Microsoft.VisualBasic;` +
      `[Microsoft.VisualBasic.Interaction]::InputBox('${p}','${t}','')`,
  ).trim();
}

function messageBox(msg, title) {
  const m = msg.replace(/'/g, "''");
  const t = title.replace(/'/g, "''");
  psRun(
    `Add-Type -AssemblyName System.Windows.Forms;` +
      `[void][System.Windows.Forms.MessageBox]::Show('${m}','${t}')`,
  );
}

// Pausa/erro: no Windows mostra uma janela; senão segura o console.
function notify(msg, title = 'ProActive7 — Agente') {
  if (isWin) {
    messageBox(msg, title);
    return;
  }
  process.stdout.write(`\n${msg}\nTecle Enter para sair.\n`);
  try {
    const buf = Buffer.alloc(1);
    for (;;) {
      const n = readSync(0, buf, 0, 1);
      if (n === 0 || buf[0] === 0x0a) return;
    }
  } catch {
    /* sem stdin */
  }
}

// Token: diálogo no Windows; stdin no terminal (modo script).
function promptToken() {
  if (isWin) {
    return inputBox(
      'Cole aqui o TOKEN da impressora\n' +
        '(tela Cadastros -> Impressoras -> cadastrar) e clique OK:',
      'ProActive7 — Agente',
    );
  }
  process.stdout.write('Cole o TOKEN da impressora e tecle Enter:\n> ');
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
    if (buf[0] === 0x0a) break;
    if (buf[0] === 0x0d) continue;
    out.push(buf[0]);
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

function ensureAutostart() {
  if (!isWin) return;
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
    ], { windowsHide: true });
    log('Auto-start configurado.');
  } catch (e) {
    log('Auto-start falhou: ' + String(e));
  }
}

function loadConfig() {
  const file = readConfigFile();
  let token = process.env.AGENT_TOKEN || file.AGENT_TOKEN;

  if (!token) {
    token = promptToken();
    if (!token) {
      notify('Nenhum token informado. Abra o programa de novo para configurar.');
      process.exit(0);
    }
    saveToken(token);
    ensureAutostart();
    notify(
      'Token salvo! O agente vai ficar rodando e procurar a impressora na ' +
        'rede.\n\nVolte ao app, em Impressoras, e clique em "Selecionar ' +
        'impressora".\n\nPode minimizar a janela preta — só não feche.',
    );
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

function main() {
  log(`Iniciando. execPath=${process.execPath}, win=${isWin}, baseDir=${baseDir}`);
  cfg = loadConfig();
  fnUrl = `${cfg.supabaseUrl.replace(/\/$/, '')}/functions/v1/print-agent`;
  assigned = { host: cfg.printerHost || null, port: cfg.printerPort };
  log('Agente rodando. Procurando impressoras...');
  void scanAndReport();
  setInterval(() => void scanAndReport(), cfg.scanMs);
  loop();
}

process.on('uncaughtException', (e) => {
  log('uncaughtException: ' + (e && e.stack ? e.stack : String(e)));
  notify('Erro: ' + String(e));
  process.exit(1);
});
process.on('unhandledRejection', (e) => {
  log('unhandledRejection: ' + (e && e.stack ? e.stack : String(e)));
  notify('Erro: ' + String(e));
  process.exit(1);
});

try {
  main();
} catch (e) {
  log('Erro na inicializacao: ' + (e && e.stack ? e.stack : String(e)));
  notify('Erro ao iniciar: ' + String(e));
  process.exit(1);
}

// ---------------------------------------------------------------------
// MODO USB (sem rede): a detecção automática acha impressoras de REDE
// (porta 9100). Pra impressora USB, informe o IP/host no
// proactive7-agente.json e troque sendToPrinter() por um spool cru.
// ---------------------------------------------------------------------
