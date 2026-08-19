/// <reference lib="webworker" />
import { getCacheKeyForURL, precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

// Precache injetado pelo vite-plugin-pwa (injectManifest).
precacheAndRoute(self.__WB_MANIFEST);

// Ativa o novo SW imediatamente assim que entra em "waiting", sem
// depender de o navegador fechar todas as abas. Evita o cenário em
// que duas versões do app convivem após um deploy.
self.addEventListener('install', () => {
  void self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Aceita ativacao manual via postMessage (fallback / compat).
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// Fallback de navegacao: sem isso o app so abre offline na URL exata que
// ja estava em cache. Como e uma SPA, qualquer rota interna (/visitas/x)
// pedia rede e caia na tela de dinossauro — o PWA cacheava os arquivos mas
// nao abria sem sinal, que era o unico momento em que ele importava.
//
// Rede primeiro (para nao servir HTML velho depois de um deploy) e o
// index.html do precache como rede de seguranca.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.mode !== 'navigate') return;

  // Paginas estaticas de SEO (/servicos, /clientes...) sao pre-renderizadas
  // no build e ja estao no precache com URL propria: deixa o workbox servir.
  event.respondWith(
    fetch(request).catch(async () => {
      const exact = getCacheKeyForURL(new URL(request.url).pathname);
      const cached = exact ? await caches.match(exact) : undefined;
      if (cached) return cached;
      const shell = getCacheKeyForURL('/index.html');
      const fallback = shell ? await caches.match(shell) : undefined;
      return (
        fallback ??
        new Response('Sem conexao e sem copia local desta pagina.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        })
      );
    }),
  );
});

interface PushPayload {
  title?: string;
  body?: string;
  url?: string;
}

self.addEventListener('push', (event) => {
  let payload: PushPayload;
  try {
    payload = (event.data?.json() ?? {}) as PushPayload;
  } catch {
    payload = { body: event.data?.text() ?? '' };
  }
  const title = payload.title ?? 'ProActive7';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body ?? '',
      icon: '/pwa-192.png',
      badge: '/pwa-192.png',
      data: { url: payload.url ?? '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string } | null)?.url ?? '/';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const c of clientList) {
          if ('focus' in c && c.url.includes(url)) {
            return (c as WindowClient).focus();
          }
        }
        return self.clients.openWindow(url);
      }),
  );
});
