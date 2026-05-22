import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'apple-touch-icon.png',
        'pwa-192.png',
        'pwa-512.png',
        'pwa-512-maskable.png',
      ],
      manifest: {
        name: 'Etiqueta — Validade de Alimentos',
        short_name: 'Etiqueta',
        description:
          'Imprima etiquetas de validade e controle alimentos manipulados.',
        theme_color: '#059669',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/pwa-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Supabase nunca deve ser servido do cache: sempre rede.
        navigateFallbackDenylist: [/^\/etiqueta\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname.endsWith('supabase.co'),
            handler: 'NetworkOnly',
          },
          {
            urlPattern: ({ request }) =>
              request.destination === 'image' &&
              !request.url.includes('supabase.co'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
