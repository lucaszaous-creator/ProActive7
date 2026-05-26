import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

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
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

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
      return;
    }
    setProfile((data as Profile | null) ?? null);
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
    isPlatformAdmin: profile?.role === 'master' || profile?.role === 'platform_admin',
    isNutritionist: profile?.role === 'nutritionist',
    refreshProfile: async () => {
      if (session?.user) await loadProfile(session.user.id);
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
