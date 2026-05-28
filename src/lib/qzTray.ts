// Wrapper para QZ Tray (https://qz.io) — ponte oficial para imprimir em
// impressoras locais a partir do navegador. O QZ Tray roda no PC do
// usuário (instalador oficial assinado) e expõe um WebSocket Secure em
// localhost. Nosso app conecta, lista as impressoras instaladas no
// Windows e manda ZPL direto, sem diálogo nem .exe customizado.
//
// Community Edition: o navegador pede confirmação 1x por domínio.

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error — qz-tray não publica tipos
import qz from 'qz-tray';

let connecting: Promise<void> | null = null;

/** True se a sessão atual já está conectada ao QZ Tray local. */
export function isQzConnected(): boolean {
  return !!qz.websocket.isActive?.();
}

/** Garante conexão com o QZ Tray local; é idempotente. */
export async function connectQz(): Promise<void> {
  if (isQzConnected()) return;
  if (connecting) return connecting;
  connecting = (async () => {
    try {
      await qz.websocket.connect();
    } finally {
      connecting = null;
    }
  })();
  return connecting;
}

/** Lista os nomes das impressoras instaladas no Windows do PC local. */
export async function listLocalPrinters(): Promise<string[]> {
  await connectQz();
  const result = await qz.printers.find();
  return Array.isArray(result) ? (result as string[]) : [result as string];
}

/** Imprime ZPL cru numa impressora térmica local. `copies` repete o job. */
export async function printZpl(
  printerName: string,
  zpl: string,
  copies = 1,
): Promise<void> {
  await connectQz();
  const config = qz.configs.create(printerName);
  const data = [{ type: 'raw', format: 'plain', data: zpl }];
  for (let i = 0; i < copies; i++) {
    // eslint-disable-next-line no-await-in-loop
    await qz.print(config, data);
  }
}

/** URL oficial de download do instalador do QZ Tray para Windows. */
export const QZ_TRAY_DOWNLOAD_URL = 'https://qz.io/download/';
