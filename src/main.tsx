import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import * as Sentry from '@sentry/react';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import './i18n';
import './index.css';

// Força o Service Worker antigo a checar atualização toda vez que o
// app inicia, e aceitar o novo bundle imediatamente — destrava
// usuários com SW pre-#40 que tinha auto-update preguiçoso.
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    void updateSW(true); // força ativação do novo SW sem prompt
  },
});

// Sentry so liga quando o DSN esta configurado (producao). Em dev
// fica off para nao poluir o dashboard.
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn && import.meta.env.PROD) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_RELEASE,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
          <h1 className="text-lg font-semibold text-neutral-800">
            Algo deu errado.
          </h1>
          <p className="max-w-sm text-sm text-neutral-600">
            Já registramos o erro. Recarregue a página para tentar novamente.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Recarregar
          </button>
        </div>
      }
    >
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
          <Toaster richColors position="top-right" />
        </BrowserRouter>
      </ThemeProvider>
    </Sentry.ErrorBoundary>
  </React.StrictMode>,
);
