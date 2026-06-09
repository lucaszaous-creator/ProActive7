import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, ExternalLink, Eye, EyeOff } from 'lucide-react';
import {
  adminListArticles,
  saveArticle,
  deleteArticle,
  slugify,
  type AdminArticle,
} from '@/lib/articlesApi';
import { SITE_URL, usePageTitle } from '@/lib/usePageTitle';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageHeader } from '@/components/ui/PageHeader';

const textareaCls =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-neutral-800 focus:outline-none dark:border-neutral-700 dark:bg-neutral-800';

export function ArticlesAdminPage() {
  usePageTitle('Artigos do site');
  const [list, setList] = useState<AdminArticle[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminArticle | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<AdminArticle | null>(null);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [body, setBody] = useState('');
  const [published, setPublished] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setList(await adminListArticles());
    } catch (e) {
      toast.error('Erro ao carregar artigos: ' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setTitle('');
    setSlug('');
    setSlugTouched(false);
    setDescription('');
    setTags('');
    setCoverImage('');
    setBody('');
    setPublished(false);
    setModalOpen(true);
  }

  function openEdit(a: AdminArticle) {
    setEditing(a);
    setTitle(a.title);
    setSlug(a.slug);
    setSlugTouched(true);
    setDescription(a.description);
    setTags(a.tags.join(', '));
    setCoverImage(a.cover_image ?? '');
    setBody(a.body);
    setPublished(a.published);
    setModalOpen(true);
  }

  function onTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  async function handleSave() {
    const finalSlug = slugify(slug || title);
    if (!title.trim()) return toast.error('O título é obrigatório.');
    if (!finalSlug) return toast.error('O endereço (slug) é obrigatório.');
    if (!description.trim())
      return toast.error('A descrição (resumo) é obrigatória.');
    if (!body.trim()) return toast.error('O conteúdo é obrigatório.');

    setSaving(true);
    try {
      await saveArticle({
        id: editing?.id,
        slug: finalSlug,
        title: title.trim(),
        description: description.trim(),
        body,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        cover_image: coverImage.trim() || null,
        published,
      });
      toast.success(
        editing
          ? 'Artigo atualizado.'
          : published
            ? 'Artigo criado e publicado.'
            : 'Rascunho criado.',
      );
      setModalOpen(false);
      void load();
    } catch (e) {
      const msg = (e as Error).message;
      toast.error(
        msg.includes('duplicate') || msg.includes('unique')
          ? 'Já existe um artigo com esse endereço (slug). Escolha outro.'
          : 'Erro ao salvar: ' + msg,
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    try {
      await deleteArticle(confirmDelete.id);
      toast.success('Artigo removido.');
      setConfirmDelete(null);
      void load();
    } catch (e) {
      toast.error('Erro ao remover: ' + (e as Error).message);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Artigos do site"
        subtitle="Publique conteúdos na página Novidades do site público. Rascunhos não aparecem para o público."
        actions={
          <Button onClick={openCreate}>
            <Plus size={16} /> Novo artigo
          </Button>
        }
      />

      {list.length === 0 ? (
        <Card>
          <p className="text-sm text-neutral-500">
            Nenhum artigo ainda. Clique em “Novo artigo” para começar.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((a) => (
            <Card key={a.id}>
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                    a.published
                      ? 'bg-neutral-100 text-neutral-700'
                      : 'bg-neutral-100 text-neutral-500'
                  }`}
                >
                  {a.published ? <Eye size={12} /> : <EyeOff size={12} />}
                  {a.published ? 'Publicado' : 'Rascunho'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-200">
                    {a.title}
                  </p>
                  <p className="mt-1 truncate text-xs text-neutral-500">
                    /novidades/{a.slug} · atualizado em{' '}
                    {new Date(a.updated_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {a.published && (
                    <a
                      href={`${SITE_URL}/novidades/${a.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      aria-label="Abrir no site"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
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
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar artigo' : 'Novo artigo'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Spinner />
              ) : published ? (
                'Salvar e publicar'
              ) : (
                'Salvar rascunho'
              )}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="Título"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Ex.: Como organizar o recebimento de mercadorias"
          />
          <Input
            label="Endereço no site (slug)"
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugTouched(true);
            }}
            placeholder="organizar-recebimento"
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">
              Resumo (aparece no card e na busca do Google)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={textareaCls}
            />
          </div>
          <Input
            label="Tags (separadas por vírgula)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Boas Práticas, ANVISA"
          />
          <Input
            label="Imagem de capa (URL, opcional)"
            value={coverImage}
            onChange={(e) => setCoverImage(e.target.value)}
            placeholder="https://..."
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">
              Conteúdo (Markdown: ## título, **negrito**, - lista)
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={14}
              className={`${textareaCls} font-mono`}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            Publicar no site (deixe desmarcado para manter como rascunho)
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Remover artigo?"
        message="Esta ação é permanente."
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        confirmLabel="Remover"
      />
    </div>
  );
}
