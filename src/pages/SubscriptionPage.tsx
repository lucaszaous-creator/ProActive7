import { Check, Lock, Building2, CreditCard } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { usePageTitle } from '@/lib/usePageTitle';
import { MODULES } from '@/lib/modules';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';

function fmtDate(s: string | null): string | null {
  if (!s) return null;
  try {
    return new Date(s).toLocaleDateString('pt-BR');
  } catch {
    return null;
  }
}

export function SubscriptionPage() {
  usePageTitle('Minha assinatura');
  const { subscription, profileLoading } = useAuth();

  if (profileLoading && !subscription) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="mx-auto max-w-3xl">
        <Card>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            Não foi possível carregar os dados da assinatura. Recarregue a
            página ou fale com o suporte.
          </p>
        </Card>
      </div>
    );
  }

  const sub = subscription;
  const allowed = new Set(sub.allowed_modules);
  const renews = fmtDate(sub.plan_renews_at);
  const trial = fmtDate(sub.trial_ends_at);
  const limit = sub.company_limit;
  const overLimit = limit !== null && sub.company_count > limit;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-neutral-800 sm:text-2xl dark:text-neutral-100">
          Minha assinatura
        </h1>
        <p className="text-sm text-neutral-500">
          Plano atual da sua organização e recursos liberados.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
            <CreditCard size={14} /> Plano
          </div>
          <p className="mt-1 text-lg font-semibold text-neutral-800 dark:text-neutral-100">
            {sub.plan_name ?? 'Sem plano'}
          </p>
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
              sub.status === 'active'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
            }`}
          >
            {sub.status === 'active' ? 'Ativa' : 'Suspensa'}
          </span>
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
            <Building2 size={14} /> Empresas
          </div>
          <p className="mt-1 text-lg font-semibold text-neutral-800 dark:text-neutral-100">
            {sub.company_count}
            {limit !== null ? (
              <span className="text-sm font-normal text-neutral-400">
                {' '}
                / {limit}
              </span>
            ) : (
              <span className="text-sm font-normal text-neutral-400">
                {' '}
                / ilimitado
              </span>
            )}
          </p>
          {overLimit && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              Acima do limite do plano.
            </p>
          )}
        </Card>

        <Card>
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
            Vigência
          </div>
          <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-200">
            {trial ? `Trial até ${trial}` : renews ? `Renova em ${renews}` : '—'}
          </p>
        </Card>
      </div>

      <Card className="mt-4">
        <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
          Recursos do plano
        </h2>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {MODULES.map((m) => {
            const on = allowed.has(m.key);
            return (
              <li
                key={m.key}
                className={`flex items-start gap-3 rounded-lg border p-3 ${
                  on
                    ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950'
                    : 'border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-slate-800'
                }`}
              >
                <span
                  className={`mt-0.5 shrink-0 ${on ? 'text-emerald-600' : 'text-neutral-400'}`}
                >
                  {on ? <Check size={16} /> : <Lock size={16} />}
                </span>
                <div className="min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      on
                        ? 'text-neutral-800 dark:text-neutral-100'
                        : 'text-neutral-500'
                    }`}
                  >
                    {m.label}
                  </p>
                  <p className="text-xs text-neutral-500">{m.description}</p>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-500 dark:bg-slate-800 dark:text-neutral-400">
          Para fazer upgrade do plano ou liberar mais empresas, fale com o
          suporte do ProActive7.
        </p>
      </Card>
    </div>
  );
}
