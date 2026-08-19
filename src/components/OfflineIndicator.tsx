import { useState } from 'react';
import { toast } from 'sonner';
import { CloudOff, RefreshCw, TriangleAlert, UploadCloud } from 'lucide-react';
import { useOffline } from '@/lib/useOffline';
import { retryStuck, syncNow } from '@/lib/offlineSync';

/**
 * Barra de estado da fila offline.
 *
 * Aparece só quando há o que dizer: sem sinal, com escrita pendente ou com
 * envio travado. Online e fila vazia = nada na tela.
 *
 * O tom importa: quem está sem sinal na cozinha precisa saber que o
 * trabalho NÃO se perdeu. Por isso o texto fala do que foi salvo, não do
 * erro de rede.
 */
export function OfflineIndicator() {
  const { online, pending, stuck, syncing } = useOffline();
  const [retrying, setRetrying] = useState(false);

  if (online && pending === 0) return null;

  const tone = stuck > 0
    ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300'
    : online
      ? 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300'
      : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300';

  async function handleSync() {
    const result = await syncNow();
    if (result.sent > 0) toast.success('Trabalho sincronizado.');
    else if (result.remaining > 0) toast.error('Ainda não foi possível enviar.');
  }

  async function handleRetry() {
    setRetrying(true);
    await retryStuck();
    setRetrying(false);
  }

  return (
    <div
      role="status"
      className={`flex flex-wrap items-center gap-2 border-b px-4 py-2 text-xs ${tone}`}
    >
      {stuck > 0 ? (
        <TriangleAlert size={14} className="shrink-0" />
      ) : online ? (
        <UploadCloud size={14} className="shrink-0" />
      ) : (
        <CloudOff size={14} className="shrink-0" />
      )}

      <span className="min-w-0 flex-1">
        {stuck > 0
          ? `${stuck} envio(s) não passaram. O trabalho continua salvo neste aparelho.`
          : !online
            ? pending > 0
              ? `Sem conexão. ${pending} alteração(ões) salvas aqui e serão enviadas quando o sinal voltar.`
              : 'Sem conexão. O que você preencher fica salvo neste aparelho.'
            : `Enviando ${pending} alteração(ões) pendente(s)...`}
      </span>

      {online && pending > 0 ? (
        <button
          type="button"
          onClick={() => void (stuck > 0 ? handleRetry() : handleSync())}
          disabled={syncing || retrying}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-current px-2 py-1 font-medium disabled:opacity-60"
        >
          <RefreshCw
            size={12}
            className={syncing || retrying ? 'animate-spin' : ''}
          />
          {stuck > 0 ? 'Tentar de novo' : 'Sincronizar agora'}
        </button>
      ) : null}
    </div>
  );
}
