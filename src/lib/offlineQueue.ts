/**
 * Fila de escrita offline ("outbox").
 *
 * A cozinha é o pior lugar possível para sinal: câmara fria, subsolo,
 * estoque nos fundos. Até aqui perder o sinal no meio da vistoria era
 * perder o preenchimento — o PWA cacheava os arquivos do app, mas não
 * tinha nenhuma fila de dados.
 *
 * O que entra aqui é ESCRITA: o que a RT já decidiu e que só falta subir.
 * Leitura continua exigindo conexão (o rascunho local cobre a visita que
 * está aberta). Foto também não entra: o upload é de arquivo binário para
 * o Storage e a UI diz isso na cara, em vez de fingir que guardou.
 *
 * O armazenamento é IndexedDB, mas o acesso passa por `QueueStorage` —
 * assim a lógica de sincronização é testável sem navegador.
 */

export interface QueuedWrite {
  id: string;
  /** Tabela do PostgREST. */
  table: string;
  op: 'insert' | 'update';
  /** Filtro do update (normalmente { id }). Vazio em insert. */
  match: Record<string, string>;
  payload: Record<string, unknown>;
  /** Texto que a pessoa lê na fila ("Vistoria — Cozinha Central"). */
  label: string;
  queuedAt: string;
  attempts: number;
  lastError?: string;
}

/**
 * `navigator.onLine` mente: diz "online" em Wi-Fi de cozinha que não chega
 * a lugar nenhum. Por isso quem grava trata falha de rede como offline.
 *
 * Vive aqui, e não no offlineSync, porque é predicado puro — o offlineSync
 * carrega o cliente do Supabase junto, e quem só quer classificar um erro
 * não deveria arrastar isso.
 */
export function isNetworkError(error: { message?: string } | null): boolean {
  if (!error?.message) return false;
  const m = error.message.toLowerCase();
  return (
    m.includes('failed to fetch') ||
    m.includes('networkerror') ||
    m.includes('network request failed') ||
    m.includes('load failed') ||
    m.includes('timeout')
  );
}

/** Depois disso a fila para de tentar sozinha e pede ação da pessoa. */
export const MAX_AUTO_ATTEMPTS = 5;

export interface QueueStorage {
  all(): Promise<QueuedWrite[]>;
  put(entry: QueuedWrite): Promise<void>;
  remove(id: string): Promise<void>;
}

export type WriteExecutor = (
  entry: QueuedWrite,
) => Promise<{ error: { message: string } | null }>;

export interface FlushResult {
  sent: number;
  failed: number;
  remaining: number;
}

/**
 * Sobe o que dá, na ordem em que foi enfileirado.
 *
 * A ordem importa: dois updates da mesma visita têm de chegar na sequência
 * certa, senão o mais antigo sobrescreve o mais novo. Por isso um erro
 * PARA a rodada em vez de pular para o próximo item — voltar o sinal no
 * meio de um upload não pode reordenar o histórico.
 */
export async function flushQueue(
  storage: QueueStorage,
  execute: WriteExecutor,
): Promise<FlushResult> {
  const entries = (await storage.all()).sort((a, b) =>
    a.queuedAt < b.queuedAt ? -1 : a.queuedAt > b.queuedAt ? 1 : 0,
  );
  let sent = 0;
  let failed = 0;

  for (const entry of entries) {
    if (entry.attempts >= MAX_AUTO_ATTEMPTS) {
      failed += 1;
      continue;
    }
    const { error } = await execute(entry);
    if (!error) {
      await storage.remove(entry.id);
      sent += 1;
      continue;
    }
    await storage.put({
      ...entry,
      attempts: entry.attempts + 1,
      lastError: error.message,
    });
    failed += 1;
    break;
  }

  const remaining = (await storage.all()).length;
  return { sent, failed, remaining };
}

/** Entradas que desistiram sozinhas e precisam de decisão da pessoa. */
export function stuckEntries(entries: QueuedWrite[]): QueuedWrite[] {
  return entries.filter((e) => e.attempts >= MAX_AUTO_ATTEMPTS);
}

/**
 * Um update novo da MESMA linha substitui o anterior que ainda não subiu.
 * Sem isso, meia hora de vistoria sem sinal viraria dezenas de updates
 * empilhados da mesma visita, todos com o mesmo destino final.
 */
export function collapse(
  entries: QueuedWrite[],
  incoming: QueuedWrite,
): QueuedWrite[] {
  if (incoming.op !== 'update') return [...entries, incoming];
  const isSameRow = (e: QueuedWrite) =>
    e.op === 'update' &&
    e.table === incoming.table &&
    JSON.stringify(e.match) === JSON.stringify(incoming.match) &&
    e.attempts === 0;
  return [...entries.filter((e) => !isSameRow(e)), incoming];
}

export function newWrite(
  init: Omit<QueuedWrite, 'id' | 'queuedAt' | 'attempts'>,
): QueuedWrite {
  return {
    ...init,
    id: crypto.randomUUID(),
    queuedAt: new Date().toISOString(),
    attempts: 0,
  };
}

/** Armazenamento em memória — usado nos testes e como fallback sem IDB. */
export function memoryStorage(seed: QueuedWrite[] = []): QueueStorage {
  let rows = [...seed];
  return {
    all: async () => [...rows],
    put: async (entry) => {
      rows = collapse(
        rows.filter((r) => r.id !== entry.id),
        entry,
      );
    },
    remove: async (id) => {
      rows = rows.filter((r) => r.id !== id);
    },
  };
}

// ---------------------------------------------------------------------
// IndexedDB
// ---------------------------------------------------------------------

const DB_NAME = 'proactive7-offline';
const DB_VERSION = 1;
const QUEUE_STORE = 'outbox';
const DRAFT_STORE = 'drafts';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(DRAFT_STORE)) {
        db.createObjectStore(DRAFT_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  run: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const request = run(db.transaction(store, mode).objectStore(store));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
  );
}

export const hasIndexedDb = () =>
  typeof indexedDB !== 'undefined' && indexedDB !== null;

export const indexedDbStorage: QueueStorage = {
  all: () => tx<QueuedWrite[]>(QUEUE_STORE, 'readonly', (s) => s.getAll()),
  put: async (entry) => {
    // Colapsa updates repetidos da mesma linha antes de gravar.
    const existing = await tx<QueuedWrite[]>(QUEUE_STORE, 'readonly', (s) =>
      s.getAll(),
    );
    const keep = collapse(
      existing.filter((e) => e.id !== entry.id),
      entry,
    );
    const dropped = existing.filter((e) => !keep.some((k) => k.id === e.id));
    for (const d of dropped) {
      await tx(QUEUE_STORE, 'readwrite', (s) => s.delete(d.id));
    }
    await tx(QUEUE_STORE, 'readwrite', (s) => s.put(entry));
  },
  remove: (id) =>
    tx(QUEUE_STORE, 'readwrite', (s) => s.delete(id)).then(() => {}),
};

/** Rascunho local da tela aberta (some quando a escrita sobe). */
export async function saveDraft(key: string, value: unknown): Promise<void> {
  if (!hasIndexedDb()) return;
  await tx(DRAFT_STORE, 'readwrite', (s) => s.put(value, key));
}

export async function readDraft<T>(key: string): Promise<T | null> {
  if (!hasIndexedDb()) return null;
  const value = await tx<T | undefined>(DRAFT_STORE, 'readonly', (s) =>
    s.get(key),
  );
  return value ?? null;
}

export async function removeDraft(key: string): Promise<void> {
  if (!hasIndexedDb()) return;
  await tx(DRAFT_STORE, 'readwrite', (s) => s.delete(key));
}
