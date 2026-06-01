import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { OrgSubscription, Profile } from '@/lib/types';

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
   */
  isMaster: boolean;
  isPlatformAdmin: boolean;
  isNutritionist: boolean;
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
  const [subscription, setSubscription] = useState<OrgSubscription | null>(null);

  async function loadSubscription(loadedProfile: Profile | null) {
    // platform_admin não pertence a uma org-cliente — nunca é gateado.
    if (
      !loadedProfile ||
      loadedProfile.role === 'platform_admin' ||
      loadedProfile.role === 'master' ||
      !loadedProfile.organization_id
    ) {
      setSubscription(null);
      return;
    }
    const { data, error } = await supabase.rpc('my_subscription');
    if (error) {
      // Fail-open: erro de rede não pode trancar a cozinha fora do sistema.
      console.error('Erro ao carregar assinatura:', error.message);
      setSubscription(null);
      return;
    }
    const row = (data as OrgSubscription[] | null)?.[0] ?? null;
    setSubscription(row);
  }

  async function loadProfile(userId: string) {
    setProfileLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    setProfileLoading(false);
    if (error) {
      console.error('Erro ao carregar perfil:', error.message);
      setProfile(null);
      setSubscription(null);
      return;
    }
    const loaded = (data as Profile | null) ?? null;
    setProfile(loaded);
    await loadSubscription(loaded);
  }

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
  }, []);

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
