import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

describe('desativação do antigo PWA', () => {
  it('remove somente o precache, desregistra o worker e atualiza todas as abas controladas', async () => {
    const listeners: Record<
      string,
      (event: { waitUntil: (work: Promise<unknown>) => void }) => void
    > = {};
    const skipWaiting = vi.fn();
    const unregister = vi.fn().mockResolvedValue(true);
    const deleteCache = vi.fn().mockResolvedValue(true);
    const navigate = vi.fn().mockResolvedValue(null);
    const closedTab = vi.fn().mockRejectedValue(new Error('Aba fechada'));
    runInNewContext(readFileSync('public/sw.js', 'utf8'), {
      self: {
        addEventListener: (
          name: string,
          handler: (typeof listeners)[string],
        ) => {
          listeners[name] = handler;
        },
        skipWaiting,
        registration: { unregister },
        clients: {
          matchAll: vi.fn().mockResolvedValue([
            { url: 'https://www.proactive7.com.br/login', navigate: closedTab },
            { url: 'https://www.proactive7.com.br/painel', navigate },
          ]),
        },
      },
      caches: {
        keys: async () => ['workbox-precache-v2-site', 'other-cache'],
        delete: deleteCache,
      },
    });
    const tasks: Promise<unknown>[] = [];
    const event = {
      waitUntil: (task: Promise<unknown>) => {
        tasks.push(task);
      },
    };
    listeners.install(event);
    listeners.activate(event);
    await Promise.all(tasks);
    expect(skipWaiting).toHaveBeenCalledOnce();
    expect(deleteCache).toHaveBeenCalledExactlyOnceWith(
      'workbox-precache-v2-site',
    );
    expect(unregister).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(
      'https://www.proactive7.com.br/painel',
    );
    expect(closedTab).toHaveBeenCalledWith(
      'https://www.proactive7.com.br/login',
    );
    expect(listeners.fetch).toBeUndefined();
    expect(listeners.push).toBeUndefined();
  });
});
