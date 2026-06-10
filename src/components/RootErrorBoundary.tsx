import { Component, type ReactNode } from 'react';
import { reportError } from '@/lib/errorReporter';

/**
 * ErrorBoundary raiz sem dependência estática do Sentry, para mantê-lo fora
 * do caminho crítico de carregamento (o bundle inicial não precisa do SDK).
 * Quando o Sentry é inicializado de forma assíncrona em produção
 * (ver main.tsx), ele registra um reporter global usado em reportError().
 */

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
}

export class RootErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown): void {
    reportError(error);
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
          Algo deu errado.
        </h1>
        <p className="max-w-sm text-sm text-neutral-600 dark:text-neutral-300">
          Já registramos o erro. Recarregue a página para tentar novamente.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Recarregar
        </button>
      </div>
    );
  }
}
