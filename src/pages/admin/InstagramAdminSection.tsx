import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Eye, EyeOff, Instagram } from 'lucide-react';
import {
  adminListInstagramPosts,
  addInstagramPost,
  setInstagramPostActive,
  deleteInstagramPost,
  normalizeInstagramUrl,
  type AdminInstagramPost,
} from '@/lib/instagramApi';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export function InstagramAdminSection() {
  const [list, setList] = useState<AdminInstagramPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState('');
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<AdminInstagramPost | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setList(await adminListInstagramPosts());
    } catch (e) {
      toast.error('Erro ao carregar posts: ' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAdd() {
    const normalized = normalizeInstagramUrl(url);
    if (!normalized) {
      toast.error(
        'Cole o link de um post do Instagram (ex.: instagram.com/p/...).',
      );
      return;
    }
    setAdding(true);
    try {
      const nextOrder = list.length
        ? Math.max(...list.map((p) => p.sort_order)) + 1
        : 0;
      await addInstagramPost(normalized, nextOrder);
      toast.success('Post adicionado.');
      setUrl('');
      void load();
    } catch (e) {
      toast.error('Erro ao adicionar: ' + (e as Error).message);
    } finally {
      setAdding(false);
    }
  }

  async function toggleActive(p: AdminInstagramPost) {
    try {
      await setInstagramPostActive(p.id, !p.active);
      void load();
    } catch (e) {
      toast.error('Erro ao atualizar: ' + (e as Error).message);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    try {
      await deleteInstagramPost(confirmDelete.id);
      toast.success('Post removido.');
      setConfirmDelete(null);
      void load();
    } catch (e) {
      toast.error('Erro ao remover: ' + (e as Error).message);
    }
  }

  return (
    <section className="space-y-4 border-t border-neutral-200 pt-6 dark:border-neutral-800">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-neutral-800 dark:text-neutral-100">
          <Instagram size={18} /> Posts do Instagram
        </h2>
        <p className="text-sm text-neutral-500">
          Cole o link de um post do @proactive.7 para exibir a foto/carrossel
          real na página Novidades do site.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            label="Link do post"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.instagram.com/p/XXXXXXXX/"
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleAdd();
            }}
          />
        </div>
        <Button onClick={handleAdd} disabled={adding}>
          {adding ? <Spinner /> : <Plus size={16} />} Adicionar
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      ) : list.length === 0 ? (
        <Card>
          <p className="text-sm text-neutral-500">
            Nenhum post adicionado. Cole um link acima para começar.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {list.map((p) => (
            <Card key={p.id}>
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                    p.active
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-neutral-100 text-neutral-500'
                  }`}
                >
                  {p.active ? <Eye size={12} /> : <EyeOff size={12} />}
                  {p.active ? 'Visível' : 'Oculto'}
                </span>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 truncate text-sm text-[#2F5D3F] hover:underline"
                >
                  {p.url}
                </a>
                <button
                  onClick={() => void toggleActive(p)}
                  className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  aria-label={p.active ? 'Ocultar' : 'Exibir'}
                >
                  {p.active ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button
                  onClick={() => setConfirmDelete(p)}
                  className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                  aria-label="Remover"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Remover post do Instagram?"
        message="Ele deixará de aparecer no site."
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        confirmLabel="Remover"
      />
    </section>
  );
}
