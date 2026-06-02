import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  Menu,
  X,
  Facebook,
  Instagram,
  MessageCircle,
  ArrowRight,
} from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Início' },
  { to: '/perfil', label: 'Perfil' },
  { to: '/servicos', label: 'Serviços' },
  { to: '/sistema', label: 'Sistema' },
  { to: '/cursos', label: 'Cursos' },
  { to: '/clientes', label: 'Clientes' },
  { to: '/novidades', label: 'Novidades' },
  { to: '/contato', label: 'Contato' },
];

const SOCIALS = {
  facebook: 'https://www.facebook.com/proactive7',
  instagram: 'https://www.instagram.com/proactive.7/',
  whatsapp: 'https://wa.me/5522997662669',
};

export function PublicLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAF7] text-[#1A2A22]">
      <PublicNav onOpenMenu={() => setMobileOpen(true)} />

      {/* Drawer fica FORA do header. O header tem backdrop-blur, que cria um
          containing block para descendentes 'fixed' — colocando o drawer
          aqui ele se posiciona em relacao ao viewport, nao a barra. */}
      <MobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}

function PublicNav({ onOpenMenu }: { onOpenMenu: () => void }) {
  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `text-sm transition ${
      isActive
        ? 'text-[#2F5D3F] font-medium'
        : 'text-[#1A2A22]/70 hover:text-[#2F5D3F]'
    }`;

  return (
    <header className="sticky top-0 z-30 border-b border-[#E8F1EA] bg-[#FAFAF7]/92 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3.5">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <img src="/proactive7-logo.svg" alt="" className="h-9 w-auto" />
          <span className="text-base font-semibold tracking-tight text-[#2F5D3F]">
            ProActive7
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 lg:flex">
          {NAV_ITEMS.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.to === '/'}
              className={linkCls}
            >
              {it.label}
            </NavLink>
          ))}
        </nav>

        {/* Right cluster: socials + login CTA */}
        <div className="flex items-center gap-1.5">
          <SocialIcons className="hidden md:flex" />
          <Link
            to="/login"
            className="ml-1 hidden items-center gap-1.5 rounded-full bg-[#2F5D3F] px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-[#234731] md:inline-flex"
          >
            Acessar sistema
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <button
            onClick={onOpenMenu}
            aria-label="Abrir menu"
            className="rounded-full p-2 text-[#2F5D3F] hover:bg-[#E8F1EA] lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

function MobileDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-[#1A2A22]/55 backdrop-blur-sm lg:hidden"
        onClick={onClose}
      />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-[82%] max-w-xs flex-col bg-[#2F5D3F] text-white shadow-2xl lg:hidden"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-white/12 px-5 py-4">
          <div className="flex items-center gap-2">
            <img
              src="/proactive7-logo.svg"
              alt=""
              className="h-7 w-auto brightness-0 invert"
            />
            <span className="text-sm font-semibold text-white">ProActive7</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar menu"
            className="rounded-full p-2 text-white/75 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 overflow-y-auto p-3">
          {NAV_ITEMS.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `rounded-xl px-4 py-3 text-sm transition ${
                  isActive
                    ? 'bg-white/15 font-medium text-white'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {it.label}
            </NavLink>
          ))}
          <Link
            to="/login"
            onClick={onClose}
            className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-full bg-white px-4 py-3 text-sm font-medium text-[#2F5D3F] shadow-sm transition hover:bg-[#E8F1EA]"
          >
            Acessar sistema
            <ArrowRight className="h-4 w-4" />
          </Link>
        </nav>

        <div className="mt-auto border-t border-white/12 px-5 py-4">
          <p className="mb-2 text-[11px] uppercase tracking-wider text-white/55">
            Acompanhe
          </p>
          <SocialIcons className="flex" dark />
        </div>
      </aside>
    </>
  );
}

function SocialIcons({
  className = '',
  dark = false,
}: {
  className?: string;
  dark?: boolean;
}) {
  const cls = dark
    ? 'flex h-9 w-9 items-center justify-center rounded-full text-white/65 transition hover:bg-white/10 hover:text-white'
    : 'flex h-9 w-9 items-center justify-center rounded-full text-[#1A2A22]/55 transition hover:bg-[#E8F1EA] hover:text-[#2F5D3F]';
  return (
    <div className={`items-center gap-0.5 ${className}`}>
      <a
        href={SOCIALS.facebook}
        target="_blank"
        rel="noreferrer"
        aria-label="Facebook"
        className={cls}
      >
        <Facebook className="h-4 w-4" />
      </a>
      <a
        href={SOCIALS.instagram}
        target="_blank"
        rel="noreferrer"
        aria-label="Instagram"
        className={cls}
      >
        <Instagram className="h-4 w-4" />
      </a>
      <a
        href={SOCIALS.whatsapp}
        target="_blank"
        rel="noreferrer"
        aria-label="WhatsApp"
        className={cls}
      >
        <MessageCircle className="h-4 w-4" />
      </a>
    </div>
  );
}

function PublicFooter() {
  return (
    <footer className="border-t border-[#E8F1EA] bg-[#FAFAF7]">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <img src="/proactive7-logo.svg" alt="" className="h-8 w-auto" />
            <span className="text-sm font-semibold text-[#2F5D3F]">
              ProActive7
            </span>
          </div>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#1A2A22]/65">
            Assessoria e consultoria em segurança alimentar para
            estabelecimentos comerciais on-shore e off-shore.
          </p>
          <SocialIcons className="mt-5 flex" />
        </div>
        <div>
          <h4 className="text-xs font-medium uppercase tracking-wider text-[#1A2A22]/50">
            Navegação
          </h4>
          <ul className="mt-3 space-y-2 text-sm text-[#1A2A22]/70">
            {NAV_ITEMS.map((it) => (
              <li key={it.to}>
                <Link to={it.to} className="hover:text-[#2F5D3F]">
                  {it.label}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/login" className="hover:text-[#2F5D3F]">
                Acesso ao sistema
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-medium uppercase tracking-wider text-[#1A2A22]/50">
            Contato
          </h4>
          <ul className="mt-3 space-y-2 text-sm text-[#1A2A22]/70">
            <li>
              Rua Dr. Luiz Belegard, 407 — sala 704
              <br />
              Imbetiba · Macaé — RJ
            </li>
            <li>
              <a
                href="mailto:contato@proactive7.com.br"
                className="hover:text-[#2F5D3F]"
              >
                contato@proactive7.com.br
              </a>
            </li>
            <li>
              <a
                href={SOCIALS.whatsapp}
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#2F5D3F]"
              >
                (22) 99766-2669
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[#E8F1EA]">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 px-5 py-5 text-xs text-[#1A2A22]/50 md:flex-row md:items-center">
          <span>
            © {new Date().getFullYear()} ProActive7 · Todos os direitos
            reservados
          </span>
          <span>Consultoria nutricional e segurança alimentar</span>
        </div>
      </div>
    </footer>
  );
}
