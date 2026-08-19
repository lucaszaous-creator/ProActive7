import { Navigate, Outlet } from 'react-router-dom';
import { CloudOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useOffline } from '@/lib/useOffline';
import { FullPageSpinner } from './ui/Spinner';
import { Button } from './ui/Button';

/**
 * Sem rede e sem sessão/perfil utilizável. Mandar para /login seria pior:
 * a tela de login não autentica offline, e a pessoa acharia que perdeu o
 * acesso. Aqui ela lê o motivo real e sabe que o trabalho está guardado.
 */
function OfflineBlocked({ pending }: { pending: number }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <CloudOff className="text-neutral-400" size={32} />
      <h1 className="text-lg font-semibold text-neutral-800">Sem conexão</h1>
      <p className="max-w-sm text-sm text-neutral-600">
        Não dá para entrar sem internet desta vez. Assim que o sinal voltar,
        abra o app de novo.
      </p>
      {pending > 0 ? (
        <p className="max-w-sm text-sm font-medium text-neutral-800">
          {pending} alteração(ões) continuam guardadas neste aparelho e serão
          enviadas quando você entrar.
        </p>
      ) : null}
    </div>
  );
}

function ProfileMissing({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-lg font-semibold text-neutral-800">
        Conta sem perfil
      </h1>
      <p className="max-w-sm text-sm text-neutral-600">
        Seu usuário foi autenticado, mas ainda não está vinculado a uma empresa.
        Peça ao administrador para concluir o cadastro.
      </p>
      <Button variant="secondary" onClick={onSignOut}>
        Sair
      </Button>
    </div>
  );
}

function ProfileInactive({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-lg font-semibold text-neutral-800">
        Acesso desativado
      </h1>
      <p className="max-w-sm text-sm text-neutral-600">
        Seu usuário foi desativado. Procure o administrador para reativar o
        acesso.
      </p>
      <Button variant="secondary" onClick={onSignOut}>
        Sair
      </Button>
    </div>
  );
}

export function ProtectedRoute({
  masterOnly = false,
  platformAdminOnly = false,
  nutritionistOrAdmin = false,
  canManageUsersOnly = false,
}: {
  masterOnly?: boolean;
  platformAdminOnly?: boolean;
  nutritionistOrAdmin?: boolean;
  /** Gateia rotas de gestão de usuários da empresa — aceita property_manager. */
  canManageUsersOnly?: boolean;
}) {
  const {
    session,
    profile,
    loading,
    profileLoading,
    isPlatformAdmin,
    isNutritionist,
    canManageUsers,
    signOut,
  } = useAuth();
  const { online, pending } = useOffline();
  const offline = !online;

  if (loading) return <FullPageSpinner />;
  // Sessão expirada offline não é logout: o refresh do token precisa de
  // rede. Explica em vez de jogar numa tela de login que não vai funcionar.
  if (!session)
    return offline ? (
      <OfflineBlocked pending={pending} />
    ) : (
      <Navigate to="/login" replace />
    );
  // Spinner apenas no carregamento INICIAL do profile. Recarregar o
  // profile com um perfil ja em memoria nao deve desmontar a rota
  // (preserva estado de formulario, scroll, modais abertos).
  if (profileLoading && !profile) return <FullPageSpinner />;
  // Perfil ausente COM rede é conta incompleta de verdade. Sem rede é só
  // um aparelho que nunca guardou a cópia local — não acuse a conta.
  if (!profile)
    return offline ? (
      <OfflineBlocked pending={pending} />
    ) : (
      <ProfileMissing onSignOut={signOut} />
    );
  if (!profile.active) return <ProfileInactive onSignOut={signOut} />;
  if ((masterOnly || platformAdminOnly) && !isPlatformAdmin)
    return <Navigate to="/painel" replace />;
  if (nutritionistOrAdmin && !isPlatformAdmin && !isNutritionist)
    return <Navigate to="/painel" replace />;
  if (canManageUsersOnly && !canManageUsers)
    return <Navigate to="/painel" replace />;

  return <Outlet />;
}
