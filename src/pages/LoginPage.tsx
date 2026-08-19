import { useState, type FormEvent } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ClipboardCheck,
  Leaf,
  LucideIcon,
  ShieldCheck,
  Stethoscope,
  Tag,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { useAuth } from '@/context/AuthContext';
import {
  PORTAL_FEATURES,
  postLoginDest,
  rememberLoginPortal,
  type PortalKey,
} from '@/lib/portals';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { Spotlight } from '@/components/public/Spotlight';

type PortalTheme = {
  badge: string;
  badgeIcon: LucideIcon;
  title: string;
  subtitle: string;
  features: { icon: LucideIcon; label: string }[];
  mobileTitle: string;
  mobileSubtitle: string;
};

/**
 * Temas da tela de login por portal (split pedido pela Ariane):
 * a empresa entra no programa de etiquetas, a nutricionista no sistema
 * de checklists/rotinas. O tema é só apresentação — o que libera cada
 * menu/rota continua sendo o role do perfil (RLS + ProtectedRoute).
 */
const PORTAL_THEMES: Record<PortalKey, PortalTheme> = {
  cliente: {
    badge: 'Portal da empresa',
    badgeIcon: Tag,
    title: 'A rotina de etiquetas, em ordem.',
    subtitle:
      'Acesse o programa de etiquetas da sua empresa: impressão, validades, produção, estoque e a rotina diária da cozinha.',
    features: PORTAL_FEATURES.cliente,
    mobileTitle: 'Portal da empresa',
    mobileSubtitle: 'Acesse o programa de etiquetas',
  },
  nutricionista: {
    badge: 'Portal da nutricionista',
    badgeIcon: Stethoscope,
    title: 'Sua consultoria, no controle.',
    subtitle:
      'Acesse o sistema da responsável técnica: checklists, rotinas, auditorias e o acompanhamento das suas empresas.',
    features: PORTAL_FEATURES.nutricionista,
    mobileTitle: 'Portal da nutricionista',
    mobileSubtitle: 'Acesse suas rotinas e auditorias',
  },
};

const GENERIC_THEME: PortalTheme = {
  badge: 'Bem-vinda de volta',
  badgeIcon: Leaf,
  title: 'Sua consultoria, no controle.',
  subtitle:
    'Acesse o ProActive7 para acompanhar suas unidades, etiquetas, auditorias e tudo que mantém sua rotina em conformidade.',
  features: [
    { icon: Tag, label: 'Etiquetas RDC 216 em segundos' },
    { icon: ClipboardCheck, label: 'Auditorias com plano de ação automático' },
    { icon: ShieldCheck, label: 'Histórico completo por unidade' },
  ],
  mobileTitle: 'Bem-vinda de volta',
  mobileSubtitle: 'Acesse o ProActive7',
};

export function LoginPage() {
  const params = useParams<{ portal?: string }>();
  const portal: PortalKey | null =
    params.portal === 'cliente' || params.portal === 'nutricionista'
      ? params.portal
      : null;
  const theme = portal ? PORTAL_THEMES[portal] : GENERIC_THEME;

  usePageTitle(
    portal === 'cliente'
      ? 'Entrar — Portal da empresa'
      : portal === 'nutricionista'
        ? 'Entrar — Portal da nutricionista'
        : 'Entrar',
  );
  const { session, loading, profile, isNutritionist } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  if (loading) return <FullPageSpinner />;
  if (session) {
    return (
      <Navigate
        to={postLoginDest(isNutritionist, profile?.company_id)}
        replace
      />
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      toast.error('Supabase não configurado. Preencha o arquivo .env');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setSubmitting(false);
    if (error) {
      toast.error('Não foi possível entrar. Verifique e-mail e senha.');
      return;
    }
    // O aviso de "portal trocado" é dado pelo Layout depois que o profile
    // carrega — esta página desmonta assim que a sessão existe.
    if (portal) rememberLoginPortal(portal);
    toast.success('Bem-vindo!');
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      toast.error('Informe o e-mail para receber o link de recuperação.');
      return;
    }
    setSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    setSendingReset(false);
    if (error) {
      toast.error('Não foi possível enviar o e-mail: ' + error.message);
      return;
    }
    toast.success('Enviamos um e-mail com o link para redefinir a senha.');
  }

  const BadgeIcon = theme.badgeIcon;

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#171717]">
      {/* Header minimal — "voltar ao site" */}
      <header className="border-b border-[#e5e5e5] bg-[#fafafa]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/proactive7-wordmark.png" alt="" className="h-9 w-auto" />
            <span className="text-base font-semibold tracking-tight text-[#262626]">
              ProActive7
            </span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-[#171717]/65 transition hover:bg-[#e5e5e5] hover:text-[#262626]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar ao site
          </Link>
        </div>
      </header>

      <main className="mx-auto grid min-h-[calc(100vh-65px)] max-w-6xl items-stretch gap-0 px-5 md:grid-cols-[1.1fr_1fr]">
        {/* Lado esquerdo — hero escuro com spotlight (some no mobile) */}
        <Spotlight className="fx-grain relative my-6 hidden flex-col justify-between overflow-hidden rounded-3xl bg-[#111111] p-12 text-white md:flex">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[radial-gradient(70%_55%_at_30%_20%,#1f1f1f_0%,#111111_60%,#050505_100%)]"
          />
          <div aria-hidden className="fx-grid absolute inset-0 -z-10" />
          <div className="relative z-[2]">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur">
              <BadgeIcon className="h-3.5 w-3.5" />
              {theme.badge}
            </span>
            <h1 className="fx-shimmer mt-5 text-4xl font-semibold leading-[1.1] tracking-tight">
              {theme.title}
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-white/70">
              {theme.subtitle}
            </p>
          </div>

          <ul className="relative z-[2] mt-10 space-y-3.5">
            {theme.features.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-3 text-sm text-white/80"
              >
                <span className="fx-lift flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white shadow-sm ring-1 ring-white/15">
                  <Icon className="h-4 w-4" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </Spotlight>

        {/* Lado direito — card de login */}
        <section className="flex items-center justify-center py-10 md:py-14">
          <div className="w-full max-w-sm">
            <div className="md:hidden mb-6 text-center">
              <h1 className="text-2xl font-semibold tracking-tight text-[#171717]">
                {theme.mobileTitle}
              </h1>
              <p className="mt-1 text-sm text-[#171717]/60">
                {theme.mobileSubtitle}
              </p>
            </div>

            <div className="rounded-2xl border border-[#e5e5e5] bg-white p-7 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.25)]">
              <div className="mb-6">
                <h2 className="text-xl font-semibold tracking-tight text-[#171717]">
                  Entrar
                </h2>
                <p className="mt-1 text-sm text-[#171717]/60">
                  Use o e-mail e a senha cadastrados.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <LoginField
                  id="email"
                  label="E-mail"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  placeholder="voce@email.com"
                />
                <LoginField
                  id="password"
                  label="Senha"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••"
                />

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-1 inline-flex items-center justify-center rounded-full bg-[#262626] px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#404040] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'Entrando...' : 'Entrar'}
                </button>

                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={sendingReset}
                  className="-mt-1 text-center text-xs font-medium text-[#262626]/85 transition hover:text-[#262626] hover:underline disabled:opacity-60"
                >
                  {sendingReset ? 'Enviando...' : 'Esqueci minha senha'}
                </button>
              </form>
            </div>

            <p className="mt-6 text-center text-xs text-[#171717]/45">
              Acesso fornecido pelo administrador da sua organização.
            </p>
            {portal && (
              <p className="mt-2 text-center text-xs text-[#171717]/45">
                Não é o seu perfil?{' '}
                <Link
                  to="/acessar"
                  className="font-medium text-[#262626]/85 hover:text-[#262626] hover:underline"
                >
                  Trocar de portal
                </Link>
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

/* ---------------------------------------------------------------------
 * Campo de input com estilo do design system da landing
 * ------------------------------------------------------------------- */
function LoginField({
  id,
  label,
  ...rest
}: {
  id: string;
  label: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-xs font-medium uppercase tracking-wider text-[#171717]/55"
      >
        {label}
      </label>
      <input
        id={id}
        {...rest}
        className="rounded-xl border border-[#e5e5e5] bg-[#fafafa] px-3.5 py-2.5 text-sm text-[#171717] outline-none transition placeholder:text-[#171717]/35 focus:border-[#737373] focus:bg-white focus:ring-2 focus:ring-[#737373]/25"
      />
    </div>
  );
}
