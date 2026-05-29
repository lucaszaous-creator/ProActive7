// WebUSB — impressão direta via API nativa do Chrome. Grátis, sem
// agente, sem prompt. O navegador pede permissão UMA vez por impressora
// (quando o usuário clica em "Conectar"), depois fica silencioso pra
// sempre. Funciona em qualquer impressora USB (Elgin, Zebra, etc).
//
// Limitação: Chrome desktop apenas (não funciona em Safari/Firefox).
// HTTPS é obrigatório (já temos).
//
// Como o Windows pode ter o driver de impressão "claimando" o dispositivo,
// se a chamada de claimInterface falhar, recomendamos ao usuário instalar
// o driver "WinUSB" via Zadig (link nas instruções).

interface UsbPrinter {
  device: USBDevice;
  interfaceNumber: number;
  endpointOut: number;
}

/** Verifica se o browser suporta WebUSB. */
export function isWebUsbSupported(): boolean {
  return typeof navigator !== 'undefined' && 'usb' in navigator;
}

/** Devolve a primeira impressora USB já autorizada (sem pedir permissão). */
export async function getPairedPrinter(): Promise<UsbPrinter | null> {
  if (!isWebUsbSupported()) return null;
  const devices = await navigator.usb.getDevices();
  for (const d of devices) {
    const prepared = await tryPrepare(d).catch(() => null);
    if (prepared) return prepared;
  }
  return null;
}

/** Pede ao usuário pra escolher a impressora USB no diálogo nativo do Chrome. */
export async function requestPrinter(): Promise<UsbPrinter | null> {
  if (!isWebUsbSupported()) {
    throw new Error('Seu navegador não suporta WebUSB. Use Chrome ou Edge.');
  }
  let device: USBDevice;
  try {
    // filters: [] mostra TODOS os dispositivos USB conectados.
    device = await navigator.usb.requestDevice({ filters: [] });
  } catch (e) {
    if ((e as Error).name === 'NotFoundError') return null; // usuário cancelou
    throw e;
  }
  const prepared = await tryPrepare(device);
  if (!prepared) {
    throw new Error(
      'Dispositivo não tem endpoint de impressão (bulk OUT). ' +
        'Confirme que escolheu a impressora correta.',
    );
  }
  return prepared;
}

async function tryPrepare(device: USBDevice): Promise<UsbPrinter | null> {
  if (!device.opened) await device.open();
  if (!device.configuration) await device.selectConfiguration(1);

  // Encontra a primeira interface com endpoint bulk OUT (padrão de impressora)
  let interfaceNumber = -1;
  let endpointOut = -1;
  for (const iface of device.configuration!.interfaces) {
    for (const alt of iface.alternates) {
      for (const ep of alt.endpoints) {
        if (ep.direction === 'out' && ep.type === 'bulk') {
          interfaceNumber = iface.interfaceNumber;
          endpointOut = ep.endpointNumber;
          break;
        }
      }
      if (endpointOut >= 0) break;
    }
    if (endpointOut >= 0) break;
  }

  if (endpointOut < 0) {
    await device.close().catch(() => {});
    return null;
  }

  try {
    await device.claimInterface(interfaceNumber);
  } catch (e) {
    // O Windows pode estar com o driver de impressão claimando o dispositivo.
    await device.close().catch(() => {});
    throw new Error(
      'Não consegui acessar a impressora USB (provavelmente o Windows ' +
        'está usando o driver padrão). Solução: troque o driver para ' +
        'WinUSB via Zadig (https://zadig.akeo.ie). Detalhe: ' +
        ((e as Error)?.message ?? String(e)),
    );
  }

  return { device, interfaceNumber, endpointOut };
}

/** Envia bytes crus (ZPL ou ESC/POS) à impressora USB. */
export async function printRawViaUsb(
  printer: UsbPrinter,
  data: string,
): Promise<void> {
  const bytes = new TextEncoder().encode(data);
  // Alguns drivers exigem fragmentação em pacotes <= 64 bytes; mas para
  // impressoras térmicas modernas, transferência única funciona.
  await printer.device.transferOut(printer.endpointOut, bytes);
}

/** Libera a impressora (não fecha — mantém pareada para próximas impressões). */
export async function releasePrinter(printer: UsbPrinter): Promise<void> {
  try {
    await printer.device.releaseInterface(printer.interfaceNumber);
  } catch {
    /* ignora */
  }
}

/** Descrição amigável da impressora (pra mostrar na UI). */
export function describePrinter(printer: UsbPrinter): string {
  const d = printer.device;
  const parts = [
    d.manufacturerName?.trim(),
    d.productName?.trim(),
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : `USB ${d.vendorId.toString(16)}:${d.productId.toString(16)}`;
}
