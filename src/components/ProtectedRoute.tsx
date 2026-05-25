import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { FullPageSpinner } from './ui/Spinner';
import { Button } from './ui/Button';

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
}: {
  masterOnly?: boolean;
  platformAdminOnly?: boolean;
  nutritionistOrAdmin?: boolean;
}) {
  const { session, profile, loading, isPlatformAdmin, isNutritionist, signOut } = useAuth();

  if (loading) return <FullPageSpinner />;
  if (!session) return <Navigate to="/login" replace />;
  if (!profile) return <ProfileMissing onSignOut={signOut} />;
  if (!profile.active) return <ProfileInactive onSignOut={signOut} />;
  if ((masterOnly || platformAdminOnly) && !isPlatformAdmin) return <Navigate to="/painel" replace />;
  if (nutritionistOrAdmin && !isPlatformAdmin && !isNutritionist) return <Navigate to="/painel" replace />;

  return <Outlet />;
}
