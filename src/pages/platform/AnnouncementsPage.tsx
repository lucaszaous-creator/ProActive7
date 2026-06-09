import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  Info,
  Wrench,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { usePageTitle } from '@/lib/usePageTitle';

interface Announcement {
  id: string;
  message: string;
  severity: 'info' | 'warning' | 'maintenance';
  starts_at: string;
  ends_at: string | null;
  active: boolean;
  created_at: string;
}

function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 16);
}

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

const SEVERITY_LABEL = {
  info: 'Informação',
  warning: 'Aviso',
  maintenance: 'Manutenção',
} as const;

const SEVERITY_ICON = {
  info: Info,
  warning: AlertTriangle,
  maintenance: Wrench,
} as const;

export function AnnouncementsPage() {
  usePageTitle('Comunicados');
  // Snapshot único de "agora" por sessão da página — lazy initializer
  // do useState para satisfazer a regra react-hooks/purity.
  const [renderNow] = useState(() => Date.now());
  const [list, setList] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Announcement | null>(null);

  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<Announcement['severity']>('info');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [active, setActive] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('platform_announcements')
      .select('*')
      .order('created_at', { ascending: false });
    setLoading(false);
    if (error) {
      toast.error('Erro ao carregar comunicados: ' + error.message);
      return;
    }
    setList((data as Announcement[] | null) ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setMessage('');
    setSeverity('info');
    setStartsAt(toLocalInput(new Date().toISOString()));
    setEndsAt('');
    setActive(true);
    setModalOpen(true);
  }

  function openEdit(a: Announcement) {
    setEditing(a);
    setMessage(a.message);
    setSeverity(a.severity);
    setStartsAt(toLocalInput(a.starts_at));
    setEndsAt(toLocalInput(a.ends_at));
    setActive(a.active);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!message.trim()) {
      toast.error('Mensagem é obrigatória.');
      return;
    }
    setSaving(true);
    const payload = {
      message: message.trim(),
      severity,
      starts_at: fromLocalInput(startsAt) ?? new Date().toISOString(),
      ends_at: fromLocalInput(endsAt),
      active,
    };
    const { error } = editing
      ? await supabase
          .from('platform_announcements')
          .update(payload)
          .eq('id', editing.id)
      : await supabase.from('platform_announcements').insert(payload);
    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
      return;
    }
    toast.success(editing ? 'Comunicado atualizado.' : 'Comunicado criado.');
    setModalOpen(false);
    void load();
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    const { error } = await supabase
      .from('platform_announcements')
      .delete()
      .eq('id', confirmDelete.id);
    if (error) {
      toast.error('Erro ao remover: ' + error.message);
      return;
    }
    toast.success('Comunicado removido.');
    setConfirmDelete(null);
    void load();
  }

  if (loading) {
    return <ListSkeleton rows={4} />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Comunicados"
        subtitle="Banner exibido no topo do app para todos os usuários autenticados."
        actions={
          <Button onClick={openCreate}>
            <Plus size={16} /> Novo
          </Button>
        }
      />

      {list.length === 0 ? (
        <Card>
          <p className="text-sm text-neutral-500">
            Nenhum comunicado cadastrado.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((a) => {
            const Icon = SEVERITY_ICON[a.severity];
            const within =
              new Date(a.starts_at).getTime() <= renderNow &&
              (!a.ends_at || new Date(a.ends_at).getTime() > renderNow);
            const showing = a.active && within;
            return (
              <Card key={a.id}>
                <div className="flex items-start gap-3">
                  <Icon size={18} className="mt-1 shrink-0 text-neutral-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-neutral-800 dark:text-neutral-200">
                      {a.message}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {SEVERITY_LABEL[a.severity]} ·{' '}
                      {new Date(a.starts_at).toLocaleString('pt-BR')}
                      {a.ends_at
                        ? ` → ${new Date(a.ends_at).toLocaleString('pt-BR')}`
                        : ' (sem prazo)'}
                      {' · '}
                      <span
                        className={
                          showing
                            ? 'font-medium text-neutral-600'
                            : 'text-neutral-500'
                        }
                      >
                        {showing
                          ? 'Visível agora'
                          : a.active
                            ? 'Agendado/expirado'
                            : 'Desativado'}
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(a)}
                      className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      aria-label="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(a)}
                      className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                      aria-label="Remover"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar comunicado' : 'Novo comunicado'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Spinner /> : 'Salvar'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">
              Mensagem
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-neutral-800 focus:outline-none dark:border-neutral-700 dark:bg-slate-800"
            />
          </div>
          <Select
            label="Severidade"
            value={severity}
            onChange={(e) =>
              setSeverity(e.target.value as Announcement['severity'])
            }
          >
            <option value="info">Informação</option>
            <option value="warning">Aviso</option>
            <option value="maintenance">Manutenção</option>
          </Select>
          <Input
            label="Inicia em"
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
          />
          <Input
            label="Termina em (opcional)"
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            Ativo
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Remover comunicado?"
        message="Esta ação é permanente."
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        confirmLabel="Remover"
      />
    </div>
  );
}
