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
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      // null: registramos manualmente em src/main.tsx via registerSW()
      // pra forçar update aggressive nos clientes presos em SW antigo.
      injectRegister: null,
      includeAssets: [
        'favicon.svg',
        'apple-touch-icon.png',
        'pwa-192.png',
        'pwa-512.png',
        'pwa-512-maskable.png',
      ],
      manifest: {
        name: 'ProActive7 — Consultoria Nutricional',
        short_name: 'ProActive7',
        description:
          'ProActive7 — etiquetas de validade, POPs, manipuladores e compliance ANVISA RDC 216 para serviços de alimentação.',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        // Sem trava de orientacao: a RT usa tablet na vistoria e o
        // 'portrait' impedia girar a tela para ler a tabela do laudo.
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
      injectManifest: {
        // Padroes ja cobrem html/js/css/imagens em assets/, mas reforcamos
        // os icones na raiz.
        globPatterns: ['**/*.{js,css,html,svg,png,webp,ico}'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Separa libs grandes em chunks próprios: melhora cache entre deploys
        // (vendor muda pouco) e divide o parse do bundle inicial.
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-i18n': ['i18next', 'react-i18next'],
        },
      },
    },
  },
});
