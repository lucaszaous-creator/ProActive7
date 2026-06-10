import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, GraduationCap, ImageIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { siteAssetUrl, type SiteCourse } from '@/lib/siteCms';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';

const fieldCls =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-800 focus:ring-2 focus:ring-neutral-800/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100';

export function SiteCoursesPage() {
  usePageTitle('Cursos do site');
  const [rows, setRows] = useState<SiteCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SiteCourse | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('');
  const [level, setLevel] = useState('');
  const [priceLabel, setPriceLabel] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState('0');
  const [active, setActive] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('site_courses')
      .select('*')
      .order('sort_order')
      .order('created_at');
    setLoading(false);
    if (error) {
      toast.error('Erro ao carregar cursos: ' + error.message);
      return;
    }
    setRows((data as SiteCourse[] | null) ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setTitle('');
    setSummary('');
    setDescription('');
    setDuration('');
    setLevel('');
    setPriceLabel('');
    setCtaUrl('');
    setImagePath(null);
    setSortOrder(String(rows.length));
    setActive(true);
    setModalOpen(true);
  }

  function openEdit(c: SiteCourse) {
    setEditing(c);
    setTitle(c.title);
    setSummary(c.summary ?? '');
    setDescription(c.description ?? '');
    setDuration(c.duration ?? '');
    setLevel(c.level ?? '');
    setPriceLabel(c.price_label ?? '');
    setCtaUrl(c.cta_url ?? '');
    setImagePath(c.image_path);
    setSortOrder(String(c.sort_order));
    setActive(c.active);
    setModalOpen(true);
  }

  async function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 3 MB.');
      return;
    }
    setUploading(true);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `courses/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from('site-assets')
      .upload(path, file, { contentType: file.type, upsert: true });
    setUploading(false);
    if (error) {
      toast.error('Erro no upload: ' + error.message);
      return;
    }
    setImagePath(path);
    toast.success('Imagem carregada.');
  }

  async function handleSave() {
    if (!title.trim()) {
      toast.error('Informe o título do curso.');
      return;
    }
    setSaving(true);
    const payload = {
      title: title.trim(),
      summary: summary.trim() || null,
      description: description.trim() || null,
      duration: duration.trim() || null,
      level: level.trim() || null,
      price_label: priceLabel.trim() || null,
      cta_url: ctaUrl.trim() || null,
      image_path: imagePath,
      sort_order: Number(sortOrder) || 0,
      active,
      updated_at: new Date().toISOString(),
    };
    const { error } = editing
      ? await supabase.from('site_courses').update(payload).eq('id', editing.id)
      : await supabase.from('site_courses').insert(payload);
    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
      return;
    }
    toast.success(editing ? 'Curso atualizado.' : 'Curso criado.');
    setModalOpen(false);
    void load();
  }

  async function handleDelete() {
    if (!editing) return;
    if (!window.confirm(`Remover o curso "${editing.title}"?`)) return;
    setSaving(true);
    const { error } = await supabase
      .from('site_courses')
      .delete()
      .eq('id', editing.id);
    setSaving(false);
    if (error) {
      toast.error('Erro ao remover: ' + error.message);
      return;
    }
    if (editing.image_path)
      await supabase.storage.from('site-assets').remove([editing.image_path]);
    toast.success('Curso removido.');
    setModalOpen(false);
    void load();
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Cursos do site"
        subtitle={
          <>
            Gerencie os cursos exibidos na página pública{' '}
            <span className="font-medium">/cursos</span>. Adicione, edite e
            ordene — o site reflete na hora.
          </>
        }
        actions={
          <Button onClick={openCreate}>
            <Plus size={18} />
            Novo curso
          </Button>
        }
      />

      {loading ? (
        <ListSkeleton rows={4} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Nenhum curso cadastrado"
          description="Crie o primeiro curso para exibi-lo na página pública."
          action={
            <Button onClick={openCreate}>
              <Plus size={18} />
              Novo curso
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {rows.map((c) => {
            const img = siteAssetUrl(c.image_path);
            return (
              <button
                key={c.id}
                onClick={() => openEdit(c)}
                className="fx-lift fx-press flex gap-3 rounded-xl border border-neutral-200 bg-white p-3 text-left hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
              >
                <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
                  {img ? (
                    <img
                      src={img}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <GraduationCap size={20} className="text-neutral-400" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-neutral-800 dark:text-neutral-100">
                      {c.title}
                    </p>
                    {!c.active && (
                      <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                        inativo
                      </span>
                    )}
                  </div>
                  {c.summary ? (
                    <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">
                      {c.summary}
                    </p>
                  ) : null}
                  <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                    {c.duration ? (
                      <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-800">
                        {c.duration}
                      </span>
                    ) : null}
                    {c.price_label ? (
                      <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 dark:bg-neutral-800">
                        {c.price_label}
                      </span>
                    ) : null}
                  </div>
                </div>
                <Pencil size={15} className="mt-1 shrink-0 text-neutral-400" />
              </button>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Editar: ${editing.title}` : 'Novo curso'}
        footer={
          <>
            {editing ? (
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={saving}
                className="mr-auto"
              >
                <Trash2 size={16} />
                Remover
              </Button>
            ) : null}
            <Button
              variant="secondary"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} loading={saving}>
              Salvar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {/* Imagem */}
          <div className="flex items-center gap-3">
            <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800">
              {siteAssetUrl(imagePath) ? (
                <img
                  src={siteAssetUrl(imagePath)!}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <ImageIcon size={22} className="text-neutral-400" />
              )}
            </span>
            <div className="flex flex-col gap-1.5">
              <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                <ImageIcon size={16} />
                {uploading ? 'Enviando…' : 'Imagem do curso'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImage}
                  disabled={uploading}
                />
              </label>
              {imagePath ? (
                <button
                  type="button"
                  onClick={() => setImagePath(null)}
                  className="w-fit text-xs text-neutral-500 dark:text-neutral-400 hover:text-red-600"
                >
                  Remover imagem
                </button>
              ) : null}
            </div>
          </div>

          <Input
            id="course-title"
            label="Título"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="ex.: Boas Práticas de Manipulação"
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Resumo (1 linha no card)
            </label>
            <input
              className={fieldCls}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Frase curta que aparece no card"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Descrição completa
            </label>
            <textarea
              className={`${fieldCls} min-h-[96px] resize-y`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="O que o aluno aprende, conteúdo programático, etc."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="course-duration"
              label="Duração"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="ex.: 8 horas"
            />
            <Input
              id="course-level"
              label="Nível / público"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              placeholder="ex.: Manipuladores"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="course-price"
              label="Investimento (texto livre)"
              value={priceLabel}
              onChange={(e) => setPriceLabel(e.target.value)}
              placeholder="ex.: Sob consulta"
            />
            <Input
              id="course-order"
              label="Ordem"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </div>
          <Input
            id="course-cta"
            label="Link de inscrição / CTA (opcional)"
            value={ctaUrl}
            onChange={(e) => setCtaUrl(e.target.value)}
            placeholder="https:// ou wa.me/…"
          />
          <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-5 w-5 accent-neutral-600"
            />
            Curso ativo (visível no site)
          </label>
        </div>
      </Modal>
    </div>
  );
}
