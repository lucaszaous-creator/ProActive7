import { useSyncExternalStore } from 'react';
import {
  getOfflineState,
  subscribeOffline,
  type OfflineState,
} from './offlineSync';

/** Estado da fila offline para a interface (ver lib/offlineSync). */
export function useOffline(): OfflineState {
  return useSyncExternalStore(
    subscribeOffline,
    getOfflineState,
    getOfflineState,
  );
}
