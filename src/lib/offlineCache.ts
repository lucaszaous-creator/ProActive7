import {
  hasIndexedDb,
  isNetworkError,
  readDraft,
  saveDraft,
} from './offlineQueue';

/**
 * Cache de LEITURA para as telas de campo.
 *
 * A fila de escrita (offlineQueue/offlineSync) resolve "o que eu preencho
 * sem sinal não se perde". Isto resolve o outro lado, que faltava: "eu
 * consigo ABRIR a tela sem sinal". Sem cache de leitura, entrar na cozinha
 * sem rede mostrava lista vazia — o trabalho estava salvo mas invisível.
 *
 * A regra é read-through: com rede, busca e guarda; sem rede, devolve o que
 * guardou da última vez. Nunca devolve cache quando a rede respondeu — dado
 * velho não pode competir com dado fresco.
 */

export interface CachedResult<T> {
  data: T | null;
  error: { message: string } | null;
  /** true quando veio do aparelho porque a rede falhou. */
  fromCache: boolean;
  /** Quando esta cópia local foi gravada (ISO). */
  cachedAt: string | null;
}

interface Envelope<T> {
  data: T;
  cachedAt: string;
}

/**
 * Executa a consulta e mantém uma cópia local do resultado.
 *
 * Só cai no cache em falha de REDE. Erro de permissão (RLS) ou de sintaxe
 * volta como erro mesmo: servir cache nesse caso esconderia um problema
 * real e mostraria dado que o servidor acabou de recusar.
 */
export async function readThrough<T>(
  key: string,
  run: () => PromiseLike<{ data: T | null; error: { message: string } | null }>,
): Promise<CachedResult<T>> {
  let result: { data: T | null; error: { message: string } | null };
  try {
    result = await run();
  } catch (e) {
    // supabase-js rejeita em vez de resolver quando o fetch morre.
    result = { data: null, error: { message: (e as Error).message } };
  }

  if (!result.error) {
    if (result.data != null && hasIndexedDb()) {
      const envelope: Envelope<T> = {
        data: result.data,
        cachedAt: new Date().toISOString(),
      };
      // Gravar cache não pode derrubar a tela: cota estourada, modo
      // privado, IndexedDB bloqueado — nada disso importa para quem só
      // queria ver a lista.
      void saveDraft(cacheKey(key), envelope).catch(() => undefined);
    }
    return {
      data: result.data,
      error: null,
      fromCache: false,
      cachedAt: null,
    };
  }

  const offline = typeof navigator !== 'undefined' && !navigator.onLine;
  if (!offline && !isNetworkError(result.error)) {
    return {
      data: null,
      error: result.error,
      fromCache: false,
      cachedAt: null,
    };
  }

  const cached = await readDraft<Envelope<T>>(cacheKey(key)).catch(() => null);
  if (!cached) {
    return {
      data: null,
      error: result.error,
      fromCache: false,
      cachedAt: null,
    };
  }
  return {
    data: cached.data,
    error: null,
    fromCache: true,
    cachedAt: cached.cachedAt,
  };
}

function cacheKey(key: string): string {
  return `cache:${key}`;
}

/** Texto para a tela avisar que aquilo é uma cópia local. */
export function cacheNotice(cachedAt: string | null): string {
  if (!cachedAt) return 'Mostrando dados salvos neste aparelho.';
  const when = new Date(cachedAt);
  const date = when.toLocaleDateString('pt-BR');
  const time = when.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `Sem conexão — mostrando o que foi carregado em ${date} às ${time}.`;
}
