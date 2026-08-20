import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { isNetworkError } from '@/lib/offlineSync';
import { resetCompanyScope } from '@/lib/companyScopeStore';
import { clearReadCache } from '@/lib/offlineQueue';
import type { OrgSubscription, Profile } from '@/lib/types';

/**
 * Cópia local do perfil, para o app ABRIR sem sinal.
 *
 * Sem isto, entrar no app offline caía na tela "Conta sem perfil": a
 * sessão é lida do armazenamento local e funciona, mas o SELECT em
 * `profiles` falha na rede e o perfil virava null — o app dizia que a
 * conta estava quebrada quando o problema era o sinal da cozinha.
 *
 * localStorage e não IndexedDB de propósito: é leitura síncrona, disponível
 * antes do primeiro render, e o perfil é minúsculo. Ele NÃO concede acesso
 * a nada: toda leitura e escrita continua passando pela RLS com o JWT. Isto
 * decide apenas o que a interface desenha enquanto não há rede.
 */
const PROFILE_CACHE_KEY = 'pa7.profileCache';

interface ProfileCache {
  userId: string;
  profile: Profile;
  subscription: OrgSubscription | null;
}

function readProfileCache(userId: string): ProfileCache | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProfileCache;
    // Cópia de OUTRA conta nunca serve: trocar de usuário no mesmo
    // aparelho não pode ressuscitar o perfil de quem saiu.
    return parsed?.profile && parsed.userId === userId ? parsed : null;
  } catch {
    return null;
  }
}

function writeProfileCache(cache: ProfileCache) {
  try {
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* cota cheia / modo privado: seguir sem cache é melhor que quebrar */
  }
}

function clearProfileCache() {
  try {
    localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {
    /* noop */
  }
}

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  /**
   * Tem privilegios de gestao no escopo visivel (platform_admin: tudo;
   * nutritionist: empresas da propria org). Em todo o codigo o flag e
   * usado para gatear botoes/telas de escrita. Para diferenciar entre
   * platform_admin e nutritionist, use isPlatformAdmin / isNutritionist.
   *
   * NOTA: `property_manager` NÃO é "master" — ele gerencia só a própria
   * empresa, sem privilégios técnicos (não avalia visita, não cria
   * empresa). Use isPropertyManager para gateá-lo.
   */
  isMaster: boolean;
  isPlatformAdmin: boolean;
  isNutritionist: boolean;
  /** Gerente da própria empresa — pode criar/editar usuários `property`. */
  isPropertyManager: boolean;
  /**
   * Pode gerenciar usuários da própria empresa (criar/editar `property`).
   * true para platform_admin, nutritionist e property_manager.
   */
  canManageUsers: boolean;
  /** Assinatura da org do usuário (null para platform_admin ou até carregar). */
  subscription: OrgSubscription | null;
  /** true se o módulo está liberado no plano (platform_admin sempre true). */
  hasModule: (key: string) => boolean;
  /** false só quando a assinatura da org está suspensa. */
  subscriptionActive: boolean;
  refreshProfile: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [subscription, setSubscription] = useState<OrgSubscription | null>(
    null,
  );

  /**
   * Devolve a assinatura carregada. `undefined` significa "não deu para
   * saber" (erro de rede) — diferente de `null`, que é "não tem plano".
   * Quem grava o cache precisa dessa diferença para não apagar uma
   * assinatura boa por causa de uma consulta que falhou.
   */
  const loadSubscription = useCallback(
    async (
      loadedProfile: Profile | null,
    ): Promise<OrgSubscription | null | undefined> => {
      // platform_admin não pertence a uma org-cliente — nunca é gateado.
      if (
        !loadedProfile ||
        loadedProfile.role === 'platform_admin' ||
        loadedProfile.role === 'master' ||
        !loadedProfile.organization_id
      ) {
        setSubscription(null);
        return null;
      }
      const { data, error } = await supabase.rpc('my_subscription');
      if (error) {
        // Fail-open: erro de rede não pode trancar a cozinha fora do sistema.
        console.error('Erro ao carregar assinatura:', error.message);
        setSubscription(null);
        return undefined;
      }
      const row = (data as OrgSubscription[] | null)?.[0] ?? null;
      setSubscription(row);
      return row;
    },
    [],
  );

  const loadProfile = useCallback(
    async (userId: string) => {
      setProfileLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      setProfileLoading(false);
      if (error) {
        console.error('Erro ao carregar perfil:', error.message);
        // Queda de rede não é conta inválida. Sem sinal, o app segue com a
        // última cópia conhecida em vez de acusar "conta sem perfil".
        const offline = typeof navigator !== 'undefined' && !navigator.onLine;
        const cached =
          offline || isNetworkError(error) ? readProfileCache(userId) : null;
        if (cached) {
          setProfile(cached.profile);
          setSubscription(cached.subscription);
          return;
        }
        setProfile(null);
        setSubscription(null);
        return;
      }
      const loaded = (data as Profile | null) ?? null;
      // Conta desativada: desloga na hora. Reforço em app do ban no Auth —
      // se `active` for setado false direto no banco (sem ban), o usuário
      // não continua com sessão viva.
      if (loaded && loaded.active === false) {
        setProfile(null);
        setSubscription(null);
        clearProfileCache();
        await supabase.auth.signOut();
        toast.error('Sua conta está desativada. Fale com o administrador.');
        return;
      }
      setProfile(loaded);
      const sub = await loadSubscription(loaded);
      if (loaded) {
        writeProfileCache({
          userId,
          profile: loaded,
          // Consulta de assinatura que falhou não apaga a que já estava
          // guardada — só uma resposta do servidor muda o plano.
          subscription:
            sub === undefined
              ? (readProfileCache(userId)?.subscription ?? null)
              : sub,
        });
      } else {
        // Servidor respondeu que não existe perfil: é verdade, não falta de
        // sinal. A cópia local tem de morrer junto.
        clearProfileCache();
      }
    },
    [loadSubscription],
  );

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        setSession(data.session);
        if (data.session?.user) {
          await loadProfile(data.session.user.id);
        }
        setLoading(false);
      })
      .catch((e) => {
        console.error('Erro ao obter sessão:', e);
        setLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        setSession(newSession);
        // TOKEN_REFRESHED dispara sempre que o navegador volta para a aba
        // e renova o JWT. O profile não muda nesses casos — recarregar
        // causaria spinner cheio e desmontaria a rota atual, perdendo
        // estado de formulário e scroll. Mesmo para USER_UPDATED, o
        // session em si já tem os metadados, sem precisar refetch do
        // profile aqui.
        if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          return;
        }
        if (newSession?.user) {
          // Marcamos profileLoading=true imediatamente para evitar o
          // flash de "Conta sem perfil" entre o session set e o profile
          // chegar do banco.
          setProfileLoading(true);
          void loadProfile(newSession.user.id);
        } else {
          setProfile(null);
          setSubscription(null);
        }
      },
    );

    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const isPropertyManager = profile?.role === 'property_manager';

  const value: AuthState = {
    session,
    profile,
    loading,
    profileLoading,
    isMaster:
      profile?.role === 'master' ||
      profile?.role === 'platform_admin' ||
      profile?.role === 'nutritionist',
    isPlatformAdmin:
      profile?.role === 'master' || profile?.role === 'platform_admin',
    isNutritionist: profile?.role === 'nutritionist',
    isPropertyManager,
    canManageUsers:
      profile?.role === 'master' ||
      profile?.role === 'platform_admin' ||
      profile?.role === 'nutritionist' ||
      profile?.role === 'property_manager',
    subscription,
    hasModule: (key: string) => {
      // platform_admin/master: tudo liberado.
      if (profile?.role === 'platform_admin' || profile?.role === 'master')
        return true;
      // Sem assinatura carregada (loading / fail-open): não bloqueia.
      if (!subscription) return true;
      return subscription.allowed_modules.includes(key);
    },
    subscriptionActive: !subscription || subscription.status === 'active',
    refreshProfile: async () => {
      if (session?.user) await loadProfile(session.user.id);
    },
    refreshSubscription: async () => {
      await loadSubscription(profile);
    },
    signOut: async () => {
      // Sair apaga a cópia local do perfil e a empresa ativa: o próximo a
      // usar o aparelho não pode abrir offline com a identidade de quem
      // saiu, nem cair na empresa que a pessoa anterior estava vendo.
      clearProfileCache();
      resetCompanyScope();
      // Cache de leitura é cópia do servidor: apagar não perde nada e
      // evita que a próxima pessoa no mesmo aparelho veja a visita desta.
      // A fila de escrita NÃO é apagada — é trabalho que ainda não subiu,
      // e ela já fica carimbada com o dono (ver lib/offlineQueue).
      void clearReadCache();
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
