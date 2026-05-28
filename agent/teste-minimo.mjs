// Teste mínimo: só abre uma caixa de mensagem do Windows e sai.
// Se este .exe não rodar, é o Windows (Defender/SmartScreen) bloqueando,
// não código do agente.
import { spawnSync } from 'node:child_process';
spawnSync(
  'powershell',
  [
    '-NoProfile',
    '-Command',
    "Add-Type -AssemblyName System.Windows.Forms;" +
      "[void][System.Windows.Forms.MessageBox]::Show(" +
      "'Funcionou! O .exe rodou ate o fim.','ProActive7 Teste')",
  ],
  { windowsHide: true },
);
