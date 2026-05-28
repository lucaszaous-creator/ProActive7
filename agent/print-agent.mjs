#!/usr/bin/env node
// =====================================================================
// ProActive7 — Agente de impressão local (estilo PrintNode, grátis)
//
// Roda no PC da cozinha (Windows/Mac/Linux, Node 18+). Faz polling na
// Edge Function `print-agent` do Supabase, recebe os jobs da fila e manda
// o ZPL pra impressora térmica via TCP porta 9100 (impressora de rede/Wi-Fi,
// ex: Elgin L42PRO FULL).
//
// Setup:
//   1. Instale Node 18+ (https://nodejs.org).
//   2. Copie config.example.json para config.json e preencha:
//        SUPABASE_URL, SUPABASE_ANON_KEY (chaves públicas do app),
//        AGENT_TOKEN  (gerado na tela Cadastros -> Impressoras),
//        PRINTER_HOST (IP da impressora), PRINTER_PORT (9100).
//   3. Rode:  node print-agent.mjs
//      (ou `npm start`). Deixe rodando — pode pôr no inicializar do Windows.
//
// Impressora USB (sem rede): deixe PRINTER_HOST vazio e veja a seção
// "modo USB" no fim deste arquivo.
// =====================================================================

import net from 'node:net';
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
    printerHost: process.env.PRINTER_HOST || file.PRINTER_HOST || '',
    printerPort: Number(process.env.PRINTER_PORT || file.PRINTER_PORT || 9100),
    pollMs: Number(process.env.POLL_MS || file.POLL_MS || 2000),
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

// Envia bytes crus (ZPL) pra impressora de rede na porta 9100.
function sendToPrinter(zpl) {
  return new Promise((resolve, reject) => {
    if (!cfg.printerHost) {
      return reject(new Error('PRINTER_HOST vazio (veja modo USB)'));
    }
    const socket = net.createConnection(
      { host: cfg.printerHost, port: cfg.printerPort },
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
    const { jobs } = await callAgent({ action: 'poll' });
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

console.log(`Agente iniciado. Impressora: ${cfg.printerHost || 'USB'}:${cfg.printerPort}`);
loop();

// ---------------------------------------------------------------------
// MODO USB (sem rede): substitua sendToPrinter() acima por um spool cru.
//   Windows:  importe child_process e rode
//             `copy /b temp.zpl "\\\\localhost\\NOME_COMPARTILHADO"`
//             (compartilhe a impressora e use o nome do share).
//   Linux/Mac: `lp -d NOME_IMPRESSORA -o raw temp.zpl`
// Grave job.zpl num arquivo temporário e chame o comando acima.
// ---------------------------------------------------------------------
