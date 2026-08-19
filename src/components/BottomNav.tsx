import { NavLink, useLocation } from 'react-router-dom';
import {
  CalendarDays,
  Home,
  MoreHorizontal,
  Network,
  Printer,
  CalendarClock,
  Stethoscope,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

/**
 * Barra inferior do celular.
 *
 * No telefone, o menu lateral escondido atrás do hambúrguer cobra dois
 * toques e um passeio por seis grupos para chegar no que a pessoa usa o
 * dia inteiro. A barra inferior põe os destinos do dia a UM toque, e o
 * resto continua inteiro atrás de "Mais".
 *
 * A lista muda por perfil de propósito: o que a nutricionista abre todo
 * dia (agenda, vistoria) não é o que a cozinha abre (etiqueta, validade).
 * Trocar um destino aqui é uma linha.
 *
 * Só no celular (`lg:hidden`) — no desktop o menu lateral fixo já resolve.
 */

interface Tab {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Marca ativo também nas rotas filhas (ex.: /visitas/:id). */
  match?: (path: string) => boolean;
}

function tabsFor(isPlatformAdmin: boolean, isNutritionist: boolean): Tab[] {
  if (isPlatformAdmin) {
    return [
      { to: '/painel', label: 'Início', icon: Home },
      {
        to: '/platform/organizacoes',
        label: 'Orgs',
        icon: Network,
        match: (p) => p.startsWith('/platform'),
      },
      { to: '/agenda', label: 'Agenda', icon: CalendarDays },
    ];
  }
  if (isNutritionist) {
    return [
      { to: '/painel', label: 'Início', icon: Home },
      { to: '/agenda', label: 'Agenda', icon: CalendarDays },
      {
        to: '/vistorias/nova',
        label: 'Vistoria',
        icon: Stethoscope,
        // A vistoria começa em /vistorias/nova e continua em /visitas/:id:
        // para quem está usando, é a mesma tarefa.
        match: (p) => p.startsWith('/vistorias') || p.startsWith('/visitas'),
      },
    ];
  }
  // Cozinha e gerente da empresa.
  return [
    { to: '/painel', label: 'Início', icon: Home },
    {
      to: '/imprimir/novo',
      label: 'Etiqueta',
      icon: Printer,
      match: (p) => p.startsWith('/imprimir'),
    },
    { to: '/validades', label: 'Validades', icon: CalendarClock },
  ];
}

const ITEM_CLASS =
  'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition';

export function BottomNav({ onMore }: { onMore: () => void }) {
  const { isPlatformAdmin, isNutritionist } = useAuth();
  const { pathname } = useLocation();
  const tabs = tabsFor(isPlatformAdmin, isNutritionist);

  return (
    <nav
      aria-label="Navegação principal"
      // pb da barra de gestos do iPhone: sem isso o rótulo do último item
      // fica atrás dela.
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-neutral-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `${ITEM_CLASS} ${
                isActive || tab.match?.(pathname)
                  ? 'text-neutral-900'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {/* Pílula atrás do ícone ativo: dá o alvo de toque grande
                    sem precisar de texto maior. */}
                <span
                  className={`flex h-8 w-14 items-center justify-center rounded-full transition ${
                    isActive || tab.match?.(pathname)
                      ? 'bg-neutral-900 text-white'
                      : ''
                  }`}
                >
                  <Icon size={18} />
                </span>
                {tab.label}
              </>
            )}
          </NavLink>
        );
      })}

      {/* "Mais" abre o menu completo que já existe — nada some da navegação,
          só sai da frente. */}
      <button
        type="button"
        onClick={onMore}
        className={`${ITEM_CLASS} text-neutral-500 hover:text-neutral-700`}
      >
        <span className="flex h-8 w-14 items-center justify-center rounded-full">
          <MoreHorizontal size={18} />
        </span>
        Mais
      </button>
    </nav>
  );
}
