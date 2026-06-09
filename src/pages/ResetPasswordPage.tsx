import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Tag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session));
    });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('A senha deve ter ao menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      toast.error('As senhas não coincidem.');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setSubmitting(false);
      toast.error('Não foi possível atualizar a senha: ' + error.message);
      return;
    }
    await supabase.auth.signOut();
    setSubmitting(false);
    toast.success('Senha atualizada. Entre novamente.');
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900 text-white">
            <Tag size={24} />
          </span>
          <h1 className="text-xl font-semibold text-neutral-800 sm:text-2xl">
            Redefinir senha
          </h1>
          <p className="text-sm text-neutral-500">Escolha uma nova senha.</p>
        </div>

        {hasSession === false ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600 sm:p-6">
            Este link expirou ou é inválido. Volte ao{' '}
            <button
              onClick={() => navigate('/login')}
              className="font-medium text-emerald-700 underline"
            >
              login
            </button>{' '}
            e solicite uma nova recuperação.
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-4 sm:p-6"
          >
            <Input
              id="new-pass"
              label="Nova senha"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
            />
            <Input
              id="confirm-pass"
              label="Confirme a nova senha"
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
            <Button type="submit" loading={submitting}>
              Atualizar senha
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
