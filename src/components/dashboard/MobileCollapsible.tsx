import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Recolhe um bloco NO CELULAR e o deixa sempre aberto no desktop.
 *
 * A tela inicial da nutricionista empilha oito blocos. No monitor isso é
 * um painel; no telefone vira uma rolagem longa antes de chegar no que a
 * pessoa veio fazer. Aqui os blocos analíticos (indicadores, curva,
 * carteira, atividade) saem da frente sem sair do produto: um toque e
 * estão lá.
 *
 * Não é `<details>` porque o conteúdo precisa continuar montado no
 * desktop, e alternar isso por media query em CSS não dá para fazer com
 * o estado do <details>.
 */
export function MobileCollapsible({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section className="mb-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left lg:hidden"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-neutral-800">
            {title}
          </span>
          {subtitle ? (
            <span className="block truncate text-xs text-neutral-500">
              {subtitle}
            </span>
          ) : null}
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-neutral-500 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* `hidden lg:block` mantém tudo montado e visível no desktop; no
          celular o mesmo conteúdo só aparece depois do toque. */}
      <div className={`${open ? 'mt-3 block' : 'hidden'} lg:mt-0 lg:block`}>
        {children}
      </div>
    </section>
  );
}
