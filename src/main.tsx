import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import App from './App';
import { RootErrorBoundary } from './components/RootErrorBoundary';
import { setErrorReporter } from './lib/errorReporter';
import './index.css';

// Atualiza instalações antigas para o worker de desativação, sem instalar um novo PWA.
if ('serviceWorker' in navigator) {
  void navigator.serviceWorker
    .getRegistration('/')
    .then((registration) => {
      if (
        registration?.active?.scriptURL ===
        new URL('/sw.js', location.origin).href
      ) {
        return registration.update();
      }
    })
    .catch(() => {
      /* Sem rede: a atualização será tentada na próxima visita. */
    });
}

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
      <BrowserRouter>
        <App />
        <Toaster
          richColors
          closeButton
          position="top-right"
          toastOptions={{ duration: 4000 }}
        />
      </BrowserRouter>
    </RootErrorBoundary>
  </React.StrictMode>,
);
