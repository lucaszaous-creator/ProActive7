// Helpers de Web Push: ler a inscricao atual, inscrever/desinscrever e
// sincronizar com a tabela push_subscriptions.

import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

async function getSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export async function getCurrentEndpoint(): Promise<string | null> {
  const sub = await getSubscription();
  return sub?.endpoint ?? null;
}

export async function subscribePush(userId: string): Promise<void> {
  if (!isPushSupported()) {
    throw new Error('Este navegador não suporta notificações push.');
  }
  if (!VAPID_PUBLIC_KEY) {
    throw new Error('VITE_VAPID_PUBLIC_KEY não configurada no build.');
  }
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    throw new Error('Permissão de notificações negada.');
  }
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }
  const json = sub.toJSON();
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userId,
      endpoint: sub.endpoint,
      keys: json.keys ?? {},
    },
    { onConflict: 'endpoint' },
  );
  if (error) throw error;
}

export async function unsubscribePush(): Promise<void> {
  const sub = await getSubscription();
  if (!sub) return;
  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', sub.endpoint);
  await sub.unsubscribe();
}
