import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Printer, Stethoscope } from 'lucide-react';
import { usePageTitle } from '@/lib/usePageTitle';
import { useAuth } from '@/context/AuthContext';
import { PORTAL_FEATURES, postLoginDest } from '@/lib/portals';
import { FullPageSpinner } from '@/components/ui/Spinner';

/**
 * Porta de entrada do sistema (pedido da Ariane): antes de logar, a pessoa
 * escolhe qual sistema quer acessar — a empresa entra no programa de
 * etiquetas, a nutricionista entra no sistema de checklists/rotinas.
 * A escolha só personaliza o login; quem manda no acesso é o role do perfil.
 */
export function AccessPortalPage() {
  usePageTitle('Acessar o sistema');
  const { session, loading, profile, isNutritionist } = useAuth();

  if (loading) return <FullPageSpinner />;
  if (session) {
    return (
      <Navigate
        to={postLoginDest(isNutritionist, profile?.company_id)}
        replace
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#171717]">
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

      <main className="mx-auto max-w-5xl px-5 py-12 md:py-16">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Como você quer entrar?
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#171717]/60">
            O ProActive7 tem dois sistemas: o programa de etiquetas da empresa e
            o sistema de rotinas da nutricionista. Escolha o seu perfil.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {/* Cliente / empresa — programa de etiquetas */}
          <Link
            to="/login/cliente"
            className="group relative flex flex-col overflow-hidden rounded-3xl border border-[#e5e5e5] bg-white p-8 shadow-[0_24px_60px_-40px_rgba(0,0,0,0.3)] transition hover:-translate-y-1 hover:shadow-[0_30px_70px_-40px_rgba(0,0,0,0.4)]"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f0f0ee] text-[#262626] ring-1 ring-[#171717]/10">
              <Printer className="h-6 w-6" />
            </span>
            <h2 className="mt-5 text-xl font-semibold tracking-tight">
              Sou cliente
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-[#171717]/60">
              Para a equipe da empresa: o programa de etiquetas e a rotina da
              cozinha.
            </p>
            <ul className="mt-5 flex-1 space-y-2.5 text-sm text-[#171717]/75">
              {PORTAL_FEATURES.cliente.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 shrink-0 text-[#737373]" />
                  {label}
                </li>
              ))}
            </ul>
            <span className="mt-7 inline-flex items-center gap-1.5 text-sm font-semibold text-[#262626]">
              Entrar como cliente
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>

          {/* Nutricionista — checklists, rotinas e auditorias */}
          <Link
            to="/login/nutricionista"
            className="group relative flex flex-col overflow-hidden rounded-3xl bg-[#111111] p-8 text-white shadow-[0_24px_60px_-40px_rgba(0,0,0,0.55)] ring-1 ring-white/10 transition hover:-translate-y-1 hover:shadow-[0_30px_70px_-40px_rgba(0,0,0,0.65)]"
          >
            <div
              aria-hidden
              className="absolute inset-0 -z-0 bg-[radial-gradient(70%_55%_at_30%_0%,#262626_0%,#111111_60%)]"
            />
            <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/15">
              <Stethoscope className="h-6 w-6" />
            </span>
            <h2 className="relative mt-5 text-xl font-semibold tracking-tight">
              Sou nutricionista
            </h2>
            <p className="relative mt-1.5 text-sm leading-relaxed text-white/65">
              Para a responsável técnica: checklists, rotinas e auditorias das
              suas empresas.
            </p>
            <ul className="relative mt-5 flex-1 space-y-2.5 text-sm text-white/80">
              {PORTAL_FEATURES.nutricionista.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 shrink-0 text-white/55" />
                  {label}
                </li>
              ))}
            </ul>
            <span className="relative mt-7 inline-flex items-center gap-1.5 text-sm font-semibold text-white">
              Entrar como nutricionista
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        </div>

        <p className="mt-8 text-center text-xs text-[#171717]/45">
          O acesso é o mesmo e-mail e senha fornecidos pelo administrador — a
          escolha acima só leva você direto ao sistema certo.
        </p>
      </main>
    </div>
  );
}
