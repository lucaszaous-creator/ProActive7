import { supabase } from './supabase';
export { isNetworkError } from './offlineQueue';
import {
  flushQueue,
  hasIndexedDb,
  indexedDbStorage,
  memoryStorage,
  newWrite,
  stuckEntries,
  type QueueStorage,
  type QueuedWrite,
} from './offlineQueue';

/**
 * Cola entre a fila (lib/offlineQueue) e o app: guarda a escrita quando
 * não há sinal, sobe sozinha quando o sinal volta e avisa a interface.
 *
 * Um módulo só, com estado no escopo do módulo, em vez de contexto React:
 * a fila é do aparelho, não de uma árvore de componentes — o `AuditDetailPage`
 * enfileira e o indicador no `Layout` mostra, sem um provider entre eles.
 */

// Navegador antigo/privado sem IndexedDB não pode derrubar o app: a fila
// vira memória (some ao fechar a aba, mas a sessão em curso funciona).
const storage: QueueStorage = hasIndexedDb()
  ? indexedDbStorage
  : memoryStorage();

export interface OfflineState {
  online: boolean;
  pending: number;
  stuck: number;
  syncing: boolean;
}

let state: OfflineState = {
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  pending: 0,
  stuck: 0,
  syncing: false,
};

const listeners = new Set<() => void>();

function emit(next: Partial<OfflineState>) {
  state = { ...state, ...next };
  for (const l of listeners) l();
}

export function subscribeOffline(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getOfflineState(): OfflineState {
  return state;
}

async function refreshCounts() {
  const entries = await storage.all();
  emit({ pending: entries.length, stuck: stuckEntries(entries).length });
}

/** Executa uma entrada da fila no PostgREST. */
async function execute(entry: QueuedWrite) {
  const table = supabase.from(entry.table);
  if (entry.op === 'insert') {
    const { error } = await table.insert(entry.payload);
    return { error: error ? { message: error.message } : null };
  }
  let query = table.update(entry.payload);
  for (const [column, value] of Object.entries(entry.match)) {
    query = query.eq(column, value);
  }
  const { error } = await query;
  return { error: error ? { message: error.message } : null };
}

/**
 * Guarda a escrita para subir depois. Devolve a entrada enfileirada para
 * quem chamou poder mostrar "salvo no aparelho".
 */
export async function queueWrite(
  init: Parameters<typeof newWrite>[0],
): Promise<QueuedWrite> {
  const entry = newWrite(init);
  await storage.put(entry);
  await refreshCounts();
  return entry;
}

export async function syncNow(): Promise<{ sent: number; remaining: number }> {
  if (state.syncing) return { sent: 0, remaining: state.pending };
  emit({ syncing: true });
  try {
    const result = await flushQueue(storage, execute);
    await refreshCounts();
    return { sent: result.sent, remaining: result.remaining };
  } finally {
    emit({ syncing: false });
  }
}

/** Reseta a contagem de tentativas para a pessoa poder insistir. */
export async function retryStuck(): Promise<void> {
  const entries = await storage.all();
  for (const e of stuckEntries(entries)) {
    await storage.put({ ...e, attempts: 0, lastError: undefined });
  }
  await refreshCounts();
  await syncNow();
}

export async function listPending(): Promise<QueuedWrite[]> {
  return storage.all();
}

let started = false;

/** Liga os ouvintes de rede. Idempotente — chamado uma vez no boot. */
export function startOfflineSync() {
  if (started || typeof window === 'undefined') return;
  started = true;

  window.addEventListener('online', () => {
    emit({ online: true });
    void syncNow();
  });
  window.addEventListener('offline', () => emit({ online: false }));

  // A aba pode ter ficado em segundo plano justamente durante a queda:
  // ao voltar para a frente, tenta de novo.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      void syncNow();
    }
  });

  void refreshCounts().then(() => {
    if (navigator.onLine) void syncNow();
  });
}
