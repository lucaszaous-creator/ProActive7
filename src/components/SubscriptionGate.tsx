import { type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Lock, AlertOctagon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { moduleForPath, MODULE_LABEL } from '@/lib/modules';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

function AccountSuspended() {
  const { signOut } = useAuth();
  return (
    <div className="mx-auto max-w-md">
      <Card>
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            <AlertOctagon size={24} />
          </span>
          <h1 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
            Conta suspensa
          </h1>
          <p className="max-w-sm text-sm text-neutral-600 dark:text-neutral-300">
            O acesso da sua organização está temporariamente suspenso. Fale com
            o suporte para reativar a assinatura. Seus dados estão preservados.
          </p>
          <Button variant="secondary" onClick={signOut}>
            Sair
          </Button>
        </div>
      </Card>
    </div>
  );
}

function ModuleUpsell({ moduleKey }: { moduleKey: string }) {
  const { isNutritionist } = useAuth();
  return (
    <div className="mx-auto max-w-md">
      <Card>
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 dark:bg-slate-800 dark:text-neutral-300">
            <Lock size={24} />
          </span>
          <h1 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
            {MODULE_LABEL[moduleKey] ?? 'Recurso'} não incluso no seu plano
          </h1>
          <p className="max-w-sm text-sm text-neutral-600 dark:text-neutral-300">
            Este recurso faz parte de um plano superior. Faça upgrade para
            liberar.
          </p>
          {isNutritionist ? (
            <Link to="/admin/assinatura">
              <Button>Ver minha assinatura</Button>
            </Link>
          ) : (
            <p className="text-xs text-neutral-400">
              Peça ao nutricionista responsável para liberar este módulo.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

// Envolve o conteúdo das rotas internas. platform_admin nunca é gateado.
export function SubscriptionGate({ children }: { children: ReactNode }) {
  const { isPlatformAdmin, subscription, hasModule, subscriptionActive } =
    useAuth();
  const { pathname } = useLocation();

  if (isPlatformAdmin) return <>{children}</>;
  if (subscription && !subscriptionActive) return <AccountSuspended />;

  const mod = moduleForPath(pathname);
  if (mod && !hasModule(mod)) return <ModuleUpsell moduleKey={mod} />;

  return <>{children}</>;
}
