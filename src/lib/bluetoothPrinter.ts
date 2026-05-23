// Cliente Web Bluetooth para impressoras termicas BLE genericas (58/80mm).
// Suporta o GATT service 000018f0-... usado pela maioria dos modelos
// chineses baratos. Impressoras Bluetooth Classico (Elgin, Bematech,
// Epson SPP) NAO sao suportadas pelo Web Bluetooth — para essas use o
// modo padrao (dialogo de impressao do sistema).

// Servico/caracteristica padrao. Algumas impressoras usam IDs proprios;
// nesse caso, sugestao futura: configuravel por usuario.
const SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb';
const WRITE_UUID = '00002af1-0000-1000-8000-00805f9b34fb';

// Conservador: a maioria das impressoras BLE aceita writes de ate 100B,
// mas 20B e seguro para qualquer MTU.
const CHUNK_SIZE = 100;

export function isBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

interface ConnectedPrinter {
  device: BluetoothDevice;
  characteristic: BluetoothRemoteGATTCharacteristic;
}

let current: ConnectedPrinter | null = null;

async function connectDevice(
  device: BluetoothDevice,
): Promise<ConnectedPrinter> {
  if (!device.gatt) throw new Error('Dispositivo sem GATT');
  const server = await device.gatt.connect();
  const service = await server.getPrimaryService(SERVICE_UUID);
  const characteristic = await service.getCharacteristic(WRITE_UUID);
  device.addEventListener('gattserverdisconnected', () => {
    if (current?.device === device) current = null;
  });
  return { device, characteristic };
}

export async function pairPrinter(): Promise<string> {
  if (!isBluetoothSupported()) {
    throw new Error(
      'Este navegador não suporta Bluetooth. Use Chrome/Edge no Android ou no desktop.',
    );
  }
  const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: [SERVICE_UUID] }],
    optionalServices: [SERVICE_UUID],
  });
  current = await connectDevice(device);
  return device.name ?? 'Impressora';
}

export function getConnectedName(): string | null {
  if (!current) return null;
  return current.device.name ?? 'Impressora';
}

export async function printBytes(bytes: Uint8Array): Promise<void> {
  if (!current) throw new Error('Nenhuma impressora pareada.');
  // Reconecta se o GATT caiu.
  if (current.device.gatt && !current.device.gatt.connected) {
    current = await connectDevice(current.device);
  }
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + CHUNK_SIZE);
    await current.characteristic.writeValueWithoutResponse(chunk);
  }
}

export function disconnectPrinter(): void {
  if (current?.device.gatt?.connected) current.device.gatt.disconnect();
  current = null;
}
