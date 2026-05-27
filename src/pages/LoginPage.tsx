import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Leaf,
  ShieldCheck,
  Tag,
  ClipboardCheck,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { useAuth } from '@/context/AuthContext';
import { FullPageSpinner } from '@/components/ui/Spinner';

export function LoginPage() {
  usePageTitle('Entrar');
  const { session, loading, profile, isNutritionist } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  if (loading) return <FullPageSpinner />;
  if (session) {
    const dest =
      isNutritionist && !profile?.company_id ? '/admin/empresas' : '/painel';
    return <Navigate to={dest} replace />;
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

  return (
    <div className="min-h-screen bg-[#FAFAF7] text-[#1A2A22]">
      {/* Header minimal — "voltar ao site" */}
      <header className="border-b border-[#E8F1EA] bg-[#FAFAF7]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/proactive7-logo.svg" alt="" className="h-9 w-auto" />
            <span className="text-base font-semibold tracking-tight text-[#2F5D3F]">
              ProActive7
            </span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-[#1A2A22]/65 transition hover:bg-[#E8F1EA] hover:text-[#2F5D3F]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar ao site
          </Link>
        </div>
      </header>

      <main className="mx-auto grid min-h-[calc(100vh-65px)] max-w-6xl items-stretch gap-0 px-5 md:grid-cols-[1.1fr_1fr]">
        {/* Lado esquerdo — copy de boas-vindas (some no mobile) */}
        <section className="relative hidden flex-col justify-between py-14 pr-12 md:flex">
          <div
            aria-hidden
            className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-[#6FA68A]/15 blur-3xl"
          />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#6FA68A]/40 bg-white px-3 py-1 text-xs font-medium text-[#2F5D3F]">
              <Leaf className="h-3.5 w-3.5" />
              Bem-vinda de volta
            </span>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-tight text-[#1A2A22]">
              Sua consultoria,{' '}
              <span className="text-[#2F5D3F]">no controle</span>.
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-[#1A2A22]/65">
              Acesse o ProActive7 para acompanhar suas unidades, etiquetas,
              auditorias e tudo que mantém sua rotina em conformidade.
            </p>
          </div>

          <ul className="relative mt-10 space-y-3.5">
            {[
              { icon: Tag, label: 'Etiquetas RDC 216 em segundos' },
              {
                icon: ClipboardCheck,
                label: 'Auditorias com plano de ação automático',
              },
              { icon: ShieldCheck, label: 'Histórico completo por unidade' },
            ].map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-3 text-sm text-[#1A2A22]/75"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-[#2F5D3F] shadow-sm ring-1 ring-[#E8F1EA]">
                  <Icon className="h-4 w-4" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </section>

        {/* Lado direito — card de login */}
        <section className="flex items-center justify-center py-10 md:py-14">
          <div className="w-full max-w-sm">
            <div className="md:hidden mb-6 text-center">
              <h1 className="text-2xl font-semibold tracking-tight text-[#1A2A22]">
                Bem-vinda de volta
              </h1>
              <p className="mt-1 text-sm text-[#1A2A22]/60">
                Acesse o ProActive7
              </p>
            </div>

            <div className="rounded-2xl border border-[#E8F1EA] bg-white p-7 shadow-[0_24px_60px_-30px_rgba(47,93,63,0.25)]">
              <div className="mb-6">
                <h2 className="text-xl font-semibold tracking-tight text-[#1A2A22]">
                  Entrar
                </h2>
                <p className="mt-1 text-sm text-[#1A2A22]/60">
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
                  className="mt-1 inline-flex items-center justify-center rounded-full bg-[#2F5D3F] px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#234731] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'Entrando...' : 'Entrar'}
                </button>

                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={sendingReset}
                  className="-mt-1 text-center text-xs font-medium text-[#2F5D3F]/85 transition hover:text-[#2F5D3F] hover:underline disabled:opacity-60"
                >
                  {sendingReset ? 'Enviando...' : 'Esqueci minha senha'}
                </button>
              </form>
            </div>

            <p className="mt-6 text-center text-xs text-[#1A2A22]/45">
              Acesso fornecido pelo administrador da sua organização.
            </p>
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
        className="text-xs font-medium uppercase tracking-wider text-[#1A2A22]/55"
      >
        {label}
      </label>
      <input
        id={id}
        {...rest}
        className="rounded-xl border border-[#E8F1EA] bg-[#FAFAF7] px-3.5 py-2.5 text-sm text-[#1A2A22] outline-none transition placeholder:text-[#1A2A22]/35 focus:border-[#6FA68A] focus:bg-white focus:ring-2 focus:ring-[#6FA68A]/25"
      />
    </div>
  );
}
