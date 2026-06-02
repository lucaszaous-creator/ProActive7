import { useEffect } from 'react';

// Embed oficial do Instagram: renderiza os <blockquote class="instagram-media">
// e carrega o embed.js do próprio Instagram (grátis, sem token). O script
// transforma os blockquotes em cards com a foto/carrossel/vídeo reais.

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadEmbedScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.instgrm) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://www.instagram.com/embed.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => resolve();
    document.body.appendChild(s);
  });
  return scriptPromise;
}

export function InstagramFeed({ urls }: { urls: string[] }) {
  useEffect(() => {
    let cancelled = false;
    void loadEmbedScript().then(() => {
      if (!cancelled) window.instgrm?.Embeds.process();
    });
    return () => {
      cancelled = true;
    };
  }, [urls]);

  if (!urls.length) return null;

  return (
    <div className="grid justify-center gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {urls.map((url) => (
        <blockquote
          key={url}
          className="instagram-media"
          data-instgrm-permalink={url}
          data-instgrm-version="14"
          style={{
            background: '#FFF',
            border: 0,
            borderRadius: 16,
            boxShadow: '0 12px 30px -18px rgba(47,93,63,0.35)',
            margin: 0,
            maxWidth: 540,
            minWidth: 280,
            width: '100%',
          }}
        />
      ))}
    </div>
  );
}
