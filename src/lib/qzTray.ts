// Wrapper para QZ Tray (https://qz.io) — ponte oficial para imprimir em
// impressoras locais a partir do navegador.
//
// Para o QZ Tray NÃO pedir permissão a cada conexão, configuramos:
//   1. Certificado público (CERT) — embutido aqui, vira override.crt no PC
//   2. Assinatura — Edge Function `sign-qz` assina cada requisição
//   3. Usuário instala o cert UMA vez em ~/.qz/override.crt no PC

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error — qz-tray não publica tipos
import qz from 'qz-tray';

/** Certificado público do ProActive7 (par da chave que está na Edge sign-qz). */
export const QZ_TRAY_CERT = `-----BEGIN CERTIFICATE-----
MIIDUTCCAjmgAwIBAgIUHPSRYn8u/o/ab7DxL2FerAQ8RZ0wDQYJKoZIhvcNAQEL
BQAwNzETMBEGA1UEAwwKUHJvQWN0aXZlNzETMBEGA1UECgwKUHJvQWN0aXZlNzEL
MAkGA1UEBhMCQlIwIBcNMjYwNTI5MDAxNjMwWhgPMjEyNjA1MDUwMDE2MzBaMDcx
EzARBgNVBAMMClByb0FjdGl2ZTcxEzARBgNVBAoMClByb0FjdGl2ZTcxCzAJBgNV
BAYTAkJSMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzYq3/vPv4jWE
Rc/2Un93G6VsYUm0b1F1QjJaWTEmeI5DwxiH2ZOmQuhIxKQ/bVP9r8Odvw2A4Dwh
IktZ5t7NPaBSdPPzi+5M98AYqXBgqbgHf8VUBe+J8UIqoQLwGAOTS5C3DcEDUrqQ
Fvr/OHXevLqxB0lUswhAOZG3q4WE9V7NKFYPVvt5+qFp76VfEWG1MsNELU1U9dxR
oO4fnOkwFpyMlqZ2tzPPo4iLLZ+Umfo+Lgn3BzP4mRd+0HNcKNUi2TLZ2au2GuCU
3jp7F06HKbSJMRN71TckZbYVQl3XnMGN51+uqBwHTysryhI0Vmxu5pOZtLKsYB3R
E6H4HtK49QIDAQABo1MwUTAdBgNVHQ4EFgQUmMCL8RJJjGjMBPAgLmwmdg1UtQkw
HwYDVR0jBBgwFoAUmMCL8RJJjGjMBPAgLmwmdg1UtQkwDwYDVR0TAQH/BAUwAwEB
/zANBgkqhkiG9w0BAQsFAAOCAQEAHbjehywrW2clKvcbv04ugdD5nsG5LokX+wgC
/eDZwj544YSgR3KwQzmgLvrq0vBmABMiibfmmPX+cq1ZLI9MzKlMptexLn9ENxaV
un/5RgcsM3nF1SBvrfTl+zAdNAo0Qj3LghkMt/999tkehbizQ8PgrmQIHdtSegt1
X3YlzhEfdGPDxN3woNz+iay9r0t03+1fs7zCSOpNddN5OPhss1ULeb2EC4mod5JD
Vd8eOCt/2P8huLsLqmuNB9pU2RgGInZILrbBtb/lb2VxTwf4aPeSqPJ0E1uiWb6w
pJ0uzhql/9LdDqAR5QopAy0n37BoKr8affYByTOWVk/oys/smQ==
-----END CERTIFICATE-----`;

let signingSetup = false;

function setupSigning(): void {
  if (signingSetup) return;
  console.log('[qz] setupSigning: configurando cert + algoritmo SHA256');
  // Diz ao QZ Tray qual o cert "público" da nossa identidade.
  qz.security.setCertificatePromise((resolve: (v: string) => void) => {
    console.log('[qz] cert pedido pelo QZ Tray — enviando ProActive7');
    resolve(QZ_TRAY_CERT);
  });
  // SHA256 (mais compatível em todas as versões do QZ Tray Community).
  qz.security.setSignatureAlgorithm('SHA256');
  // Pra cada requisição, manda assinar na nossa Edge Function.
  qz.security.setSignaturePromise(
    (toSign: string) =>
      (resolve: (v: string) => void, reject: (e: unknown) => void) => {
        console.log('[qz] assinando:', toSign.substring(0, 50) + '...');
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sign-qz`;
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ toSign }),
        })
          .then((r) => r.json())
          .then((r) => {
            if (r.signature) {
              console.log('[qz] sig OK (len=' + r.signature.length + ')');
              resolve(r.signature);
            } else {
              console.error('[qz] sig FAIL:', r);
              reject(new Error(r.error ?? 'sem assinatura'));
            }
          })
          .catch((e) => {
            console.error('[qz] fetch sig erro:', e);
            reject(e);
          });
      },
  );
  signingSetup = true;
}

let connecting: Promise<void> | null = null;

/** True se a sessão atual já está conectada ao QZ Tray local. */
export function isQzConnected(): boolean {
  return !!qz.websocket.isActive?.();
}

/** Garante conexão com o QZ Tray local; é idempotente. */
export async function connectQz(): Promise<void> {
  if (isQzConnected()) return;
  if (connecting) return connecting;
  setupSigning();
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
