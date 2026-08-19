import { useMemo, useState } from 'react';
import { Building2, Check, ChevronsUpDown, Search } from 'lucide-react';
import { useCompanyScope } from '@/lib/useCompanyScope';
import { Modal } from '@/components/ui/Modal';

/**
 * Seletor da empresa ATIVA — uma por vez, como no app do concorrente.
 *
 * A nutricionista atende uma carteira, mas trabalha numa empresa de cada
 * vez: está NA cozinha da Japa Food, não olhando as sete ao mesmo tempo.
 * Deixar a empresa escolhida sempre visível no topo responde a pergunta
 * que antes ficava no ar em toda tela — "isto que estou vendo é de quem?".
 *
 * Aparece só para quem tem mais de uma empresa. Gerente e cozinha estão
 * presos à própria empresa: para eles um seletor de um item só seria
 * ruído.
 */
export function CompanySwitcher({ variant }: { variant: 'bar' | 'sidebar' }) {
  const {
    companies,
    companyId,
    setCompanyId,
    selectedCompany,
    companyLogoUrl,
  } = useCompanyScope();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');

  const filtered = useMemo(() => {
    const needle = term.trim().toLowerCase();
    if (!needle) return companies;
    return companies.filter((c) => c.name.toLowerCase().includes(needle));
  }, [companies, term]);

  if (companies.length < 2) return null;

  const label = selectedCompany?.name ?? 'Escolher empresa';

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setTerm('');
          setOpen(true);
        }}
        aria-label={`Empresa atual: ${label}. Tocar para trocar.`}
        className={
          variant === 'sidebar'
            ? 'flex w-full items-center gap-2 border-b border-neutral-200 px-4 py-3 text-left hover:bg-neutral-50'
            : 'flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-neutral-100'
        }
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-100">
          {companyLogoUrl ? (
            <img
              src={companyLogoUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <Building2 size={16} className="text-neutral-500" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] uppercase tracking-wide text-neutral-500">
            Empresa
          </span>
          <span className="block truncate text-sm font-semibold text-neutral-800">
            {label}
          </span>
        </span>
        <ChevronsUpDown size={16} className="shrink-0 text-neutral-400" />
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Trocar de empresa"
      >
        <div className="flex flex-col gap-3">
          {/* A busca só aparece quando a lista já incomoda sem ela. */}
          {companies.length > 6 ? (
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <input
                type="text"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="Buscar empresa..."
                aria-label="Buscar empresa"
                className="min-h-[44px] w-full rounded-lg border border-neutral-300 pl-9 pr-3 text-base outline-none focus:border-neutral-800 sm:text-sm"
              />
            </div>
          ) : null}

          <ul className="flex max-h-[60vh] flex-col gap-1 overflow-y-auto">
            {filtered.map((c) => {
              const active = c.id === companyId;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setCompanyId(c.id);
                      setOpen(false);
                    }}
                    className={`flex min-h-[52px] w-full items-center gap-3 rounded-lg border px-3 py-2 text-left ${
                      active
                        ? 'border-neutral-800 bg-neutral-50'
                        : 'border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-xs font-semibold text-neutral-600">
                      {c.name.trim().charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-neutral-800">
                      {c.name}
                    </span>
                    {active ? (
                      <Check size={16} className="shrink-0 text-neutral-800" />
                    ) : null}
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 ? (
              <li className="py-6 text-center text-sm text-neutral-500">
                Nenhuma empresa encontrada.
              </li>
            ) : null}
          </ul>
        </div>
      </Modal>
    </>
  );
}
