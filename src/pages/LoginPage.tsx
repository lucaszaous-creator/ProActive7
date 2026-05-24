import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FullPageSpinner } from '@/components/ui/Spinner';

export function LoginPage() {
  usePageTitle('Entrar');
  const { session, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  if (loading) return <FullPageSpinner />;
  if (session) return <Navigate to="/" replace />;

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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-600 text-lg font-bold text-white">
            P7
          </span>
          <h1 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100 sm:text-2xl">
            ProActive7
          </h1>
          <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
            Consultoria Nutricional · Segurança Alimentar
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-slate-900 sm:p-6"
        >
          <Input
            id="email"
            label="E-mail"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <Input
            id="password"
            label="Senha"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <Button type="submit" loading={submitting}>
            Entrar
          </Button>
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={sendingReset}
            className="text-center text-xs text-emerald-700 hover:underline disabled:opacity-60"
          >
            {sendingReset ? 'Enviando...' : 'Esqueci minha senha'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-neutral-400 dark:text-neutral-500">
          Acesso fornecido pelo administrador.
        </p>
      </div>
    </div>
  );
}
