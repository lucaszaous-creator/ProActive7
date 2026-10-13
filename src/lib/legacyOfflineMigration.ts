// Transitional recovery only. This module cannot create new offline records.
export interface LegacyWrite {
  id: string;
  userId?: string;
  table: string;
  op: 'insert' | 'update';
  payload: Record<string, unknown>;
  match: Record<string, string>;
  queuedAt: string;
  attempts: number;
}

export async function drainLegacyWrites(
  entries: LegacyWrite[],
  userId: string,
  execute: (entry: LegacyWrite) => Promise<boolean>,
  remove: (id: string) => Promise<void>,
): Promise<number> {
  let remaining = entries.length;
  for (const entry of [...entries].sort((a, b) =>
    a.queuedAt.localeCompare(b.queuedAt),
  )) {
    // Never submit another person's work using the current account.
    if (!entry.userId || entry.userId !== userId) continue;
    // Keep ambiguous/previously failed writes for manual recovery.
    if (entry.attempts >= 5) break;
    if (!(await execute(entry))) break;
    await remove(entry.id);
    remaining--;
  }
  return remaining;
}

function openExistingOutbox(): Promise<IDBDatabase | null> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('proactive7-offline');
    // A first-time institutional visitor must not get a new legacy database.
    let absent = false;
    request.onupgradeneeded = () => {
      absent = true;
      request.transaction?.abort();
    };
    request.onerror = () => (absent ? resolve(null) : reject(request.error));
    request.onblocked = () => reject(new Error('Legacy database unavailable'));
    request.onsuccess = () => {
      const db = request.result;
      if (absent || !db.objectStoreNames.contains('outbox')) {
        db.close();
        resolve(null);
      } else {
        db.onversionchange = () => db.close();
        resolve(db);
      }
    };
  });
}

async function recoverExistingOutbox(): Promise<boolean> {
  const db = await openExistingOutbox().catch(() => null);
  if (!db) return false;
  try {
    const entries = await new Promise<LegacyWrite[]>((resolve, reject) => {
      const request = db
        .transaction('outbox', 'readonly')
        .objectStore('outbox')
        .getAll();
      request.onsuccess = () => resolve(request.result as LegacyWrite[]);
      request.onerror = () => reject(request.error);
    });
    if (!entries.length) return false;
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key || !navigator.onLine) return true;

    const { createClient } = await import('@supabase/supabase-js');
    // Isolated from the anonymous CMS client. Restore only the account that
    // was already signed in; never offer login or start a refresh timer.
    const legacy = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    const { data, error } = await legacy.auth.getUser();
    if (error || !data.user) return true;
    const remaining = await drainLegacyWrites(
      entries,
      data.user.id,
      async (entry) => {
        if (entry.op === 'insert') {
          const result = await legacy
            .from(entry.table)
            .insert(entry.payload)
            .select('id');
          return !result.error && result.data?.length === 1;
        }
        if (entry.op !== 'update' || !Object.keys(entry.match).length)
          return false;
        let query = legacy.from(entry.table).update(entry.payload);
        for (const [column, value] of Object.entries(entry.match))
          query = query.eq(column, value);
        const result = await query.select('id');
        // RLS can silently filter out an UPDATE. Do not discard it locally.
        return !result.error && result.data?.length === 1;
      },
      (id) =>
        new Promise<void>((resolve, reject) => {
          const transaction = db.transaction('outbox', 'readwrite');
          transaction.objectStore('outbox').delete(id);
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(transaction.error);
        }),
    );
    return remaining > 0;
  } catch {
    return true;
  } finally {
    db.close();
  }
}

let started = false;
export function startLegacyOfflineMigration(
  onPending: (pending: boolean) => void,
) {
  if (started || typeof indexedDB === 'undefined') return;
  started = true;
  const run = async () => {
    try {
      // Shared-device tabs must not replay the same insert concurrently.
      if (!navigator.locks) {
        const db = await openExistingOutbox();
        if (db) {
          const request = db
            .transaction('outbox', 'readonly')
            .objectStore('outbox')
            .count();
          request.onsuccess = () => {
            onPending(request.result > 0);
            db.close();
          };
          request.onerror = () => db.close();
        }
        return;
      }
      await navigator.locks.request('proactive7-legacy-outbox', async () => {
        onPending(await recoverExistingOutbox());
      });
    } catch {
      // An unavailable browser API is not evidence of pending records.
      // No data or credentials are displayed or deleted on failure.
    }
  };
  window.addEventListener('online', () => {
    void run();
  });
  void run();
}
