import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { RootErrorBoundary } from './components/RootErrorBoundary';
import { setErrorReporter } from './lib/errorReporter';
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

// Sentry só liga em produção com DSN. Carregado de forma assíncrona para
// ficar fora do bundle inicial (não é necessário para o primeiro paint) —
// ganho direto de Core Web Vitals nas páginas públicas.
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn && import.meta.env.PROD) {
  void import('@sentry/react').then((Sentry) => {
    Sentry.init({
      dsn: sentryDsn,
      environment: import.meta.env.MODE,
      release: import.meta.env.VITE_RELEASE,
      integrations: [Sentry.browserTracingIntegration()],
      tracesSampleRate: 0.1,
    });
    setErrorReporter((error) => Sentry.captureException(error));
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
          <Toaster richColors position="top-right" />
        </BrowserRouter>
      </ThemeProvider>
    </RootErrorBoundary>
  </React.StrictMode>,
);
