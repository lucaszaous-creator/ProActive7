import { supabase } from './supabase';
import type { Company } from './types';

/**
 * Empresa ATIVA do aplicativo — uma por vez.
 *
 * Antes disto, cada página chamava `useCompanyScope()` e guardava o
 * `companyId` no próprio `useState`. Eram 30 estados independentes: a
 * nutricionista escolhia a empresa numa tela e a seguinte voltava para a
 * primeira da lista. Não existia "empresa ativa" — existia "empresa desta
 * tela". E cada página ainda repetia a mesma consulta de empresas.
 *
 * Aqui a escolha vira uma só, compartilhada por todas as telas e guardada
 * no aparelho, e a lista é buscada uma vez. O hook `useCompanyScope`
 * manteve a mesma API de saída, então nenhuma das 30 páginas precisou
 * mudar.
 *
 * Isto é escopo de INTERFACE, não de segurança: quem decide o que cada
 * pessoa enxerga continua sendo a RLS. Trocar a empresa ativa à força não
 * abre dado nenhum — a consulta volta vazia.
 */

const ACTIVE_KEY = 'pa7.activeCompany';

export interface CompanyScopeState {
  companies: Company[];
  companyId: string;
  loading: boolean;
  /** Contador de invalidações — muda para o hook recarregar a lista. */
  stale: number;
}

let state: CompanyScopeState = {
  companies: [],
  companyId: readStored(),
  loading: false,
  stale: 0,
};

const listeners = new Set<() => void>();

function readStored(): string {
  try {
    return localStorage.getItem(ACTIVE_KEY) ?? '';
  } catch {
    return '';
  }
}

function persist(companyId: string) {
  try {
    if (companyId) localStorage.setItem(ACTIVE_KEY, companyId);
    else localStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* modo privado: a escolha vale só nesta sessão */
  }
}

function emit(next: Partial<CompanyScopeState>) {
  state = { ...state, ...next };
  for (const l of listeners) l();
}

export function subscribeCompanyScope(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCompanyScope(): CompanyScopeState {
  return state;
}

export function setActiveCompany(companyId: string) {
  if (companyId === state.companyId) return;
  persist(companyId);
  emit({ companyId });
}

/**
 * A empresa guardada precisa existir na lista que a RLS devolveu. Cobre
 * empresa apagada, empresa desativada e — o caso que importa — troca de
 * conta no mesmo aparelho, quando a guardada é de outra organização.
 */
export function resolveActive(companies: Company[], current: string): string {
  if (current && companies.some((c) => c.id === current)) return current;
  return companies[0]?.id ?? '';
}

let inFlight: Promise<void> | null = null;
let loadedFor: string | null = null;

/**
 * Carrega a lista uma vez por escopo. As 30 páginas montam e desmontam o
 * tempo todo; sem esta trava elas disparariam a mesma consulta em cada
 * navegação.
 */
export function loadCompanies(
  showAllCompanies: boolean,
  ownCompanyId: string | null | undefined,
  options?: { force?: boolean },
): Promise<void> {
  const scopeKey = showAllCompanies ? 'all' : (ownCompanyId ?? 'none');
  if (!options?.force) {
    if (loadedFor === scopeKey) return Promise.resolve();
    if (inFlight) return inFlight;
  }
  if (!showAllCompanies && !ownCompanyId) {
    loadedFor = scopeKey;
    emit({ companies: [], companyId: '', loading: false });
    return Promise.resolve();
  }

  emit({ loading: true });
  const query = showAllCompanies
    ? supabase
        .from('companies')
        .select('*')
        .eq('active', true)
        .is('deleted_at', null)
        .order('name')
    : supabase.from('companies').select('*').eq('id', ownCompanyId!);

  const run = (async () => {
    const { data, error } = await query;
    inFlight = null;
    if (error) {
      emit({ loading: false });
      throw new Error(error.message);
    }
    loadedFor = scopeKey;
    const companies = (data as Company[] | null) ?? [];
    const companyId = showAllCompanies
      ? resolveActive(companies, state.companyId)
      : (ownCompanyId ?? '');
    if (companyId !== state.companyId) persist(companyId);
    emit({ companies, companyId, loading: false });
  })();
  inFlight = run;
  return run;
}

/**
 * Marca a lista como velha E avisa quem está ouvindo, para o hook
 * recarregar na hora. Só limpar a trava não bastaria: o `useEffect` do
 * hook depende do perfil, não do estado da lista, então a tela ficaria
 * com a lista antiga até uma navegação que remontasse tudo.
 */
export function invalidateCompanies() {
  loadedFor = null;
  emit({ stale: state.stale + 1 });
}

/** Logout: a próxima conta não herda a empresa ativa de quem saiu. */
export function resetCompanyScope() {
  loadedFor = null;
  inFlight = null;
  persist('');
  emit({
    companies: [],
    companyId: '',
    loading: false,
    stale: state.stale + 1,
  });
}
