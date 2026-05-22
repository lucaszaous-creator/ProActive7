import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Bell, BellOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  isPushSupported,
  getCurrentEndpoint,
  subscribePush,
  unsubscribePush,
} from '@/lib/push';

export function PushToggle() {
  const { profile } = useAuth();
  const [supported] = useState(isPushSupported);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supported) return;
    getCurrentEndpoint().then((ep) => setEnabled(Boolean(ep)));
  }, [supported]);

  if (!supported || !profile) return null;

  async function toggle() {
    if (!profile) return;
    setBusy(true);
    try {
      if (enabled) {
        await unsubscribePush();
        setEnabled(false);
        toast.success('Notificações desativadas.');
      } else {
        await subscribePush(profile.id);
        setEnabled(true);
        toast.success('Notificações ativadas.');
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
        enabled
          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          : 'text-neutral-600 hover:bg-neutral-100'
      } disabled:opacity-60`}
    >
      {enabled ? <Bell size={18} /> : <BellOff size={18} />}
      {enabled ? 'Notificações ativas' : 'Ativar notificações'}
    </button>
  );
}
