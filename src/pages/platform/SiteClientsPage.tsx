import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Building2, ImageIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { siteAssetUrl, type SiteClient } from '@/lib/siteCms';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';

const fieldCls =
  'w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-neutral-800 focus:ring-2 focus:ring-neutral-800/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100';

export function SiteClientsPage() {
  usePageTitle('Clientes do site');
  const [rows, setRows] = useState<SiteClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SiteClient | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [name, setName] = useState('');
  const [segment, setSegment] = useState('');
  const [city, setCity] = useState('');
  const [testimonial, setTestimonial] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState('0');
  const [active, setActive] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('site_clients')
      .select('*')
      .order('sort_order')
      .order('created_at');
    setLoading(false);
    if (error) {
      toast.error('Erro ao carregar clientes: ' + error.message);
      return;
    }
    setRows((data as SiteClient[] | null) ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setName('');
    setSegment('');
    setCity('');
    setTestimonial('');
    setWebsiteUrl('');
    setLogoPath(null);
    setSortOrder(String(rows.length));
    setActive(true);
    setModalOpen(true);
  }

  function openEdit(c: SiteClient) {
    setEditing(c);
    setName(c.name);
    setSegment(c.segment ?? '');
    setCity(c.city ?? '');
    setTestimonial(c.testimonial ?? '');
    setWebsiteUrl(c.website_url ?? '');
    setLogoPath(c.logo_path);
    setSortOrder(String(c.sort_order));
    setActive(c.active);
    setModalOpen(true);
  }

  async function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('O logo deve ter no máximo 2 MB.');
      return;
    }
    setUploading(true);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const path = `clients/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from('site-assets')
      .upload(path, file, { contentType: file.type, upsert: true });
    setUploading(false);
    if (error) {
      toast.error('Erro no upload: ' + error.message);
      return;
    }
    setLogoPath(path);
    toast.success('Logo carregado.');
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error('Informe o nome do cliente.');
      return;
    }
    setSaving(true);
    const payload = {
      name: name.trim(),
      segment: segment.trim() || null,
      city: city.trim() || null,
      testimonial: testimonial.trim() || null,
      website_url: websiteUrl.trim() || null,
      logo_path: logoPath,
      sort_order: Number(sortOrder) || 0,
      active,
    };
    const { error } = editing
      ? await supabase.from('site_clients').update(payload).eq('id', editing.id)
      : await supabase.from('site_clients').insert(payload);
    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
      return;
    }
    toast.success(editing ? 'Cliente atualizado.' : 'Cliente criado.');
    setModalOpen(false);
    void load();
  }

  async function handleDelete() {
    if (!editing) return;
    if (!window.confirm(`Remover o cliente "${editing.name}"?`)) return;
    setSaving(true);
    const { error } = await supabase
      .from('site_clients')
      .delete()
      .eq('id', editing.id);
    setSaving(false);
    if (error) {
      toast.error('Erro ao remover: ' + error.message);
      return;
    }
    if (editing.logo_path)
      await supabase.storage.from('site-assets').remove([editing.logo_path]);
    toast.success('Cliente removido.');
    setModalOpen(false);
    void load();
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Clientes do site"
        subtitle={
          <>
            Empresas atendidas exibidas na página pública{' '}
            <span className="font-medium">/clientes</span>, com logo e
            depoimento.
          </>
        }
        actions={
          <Button onClick={openCreate}>
            <Plus size={18} />
            Novo cliente
          </Button>
        }
      />

      {loading ? (
        <ListSkeleton rows={4} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Nenhum cliente cadastrado"
          description="Adicione as empresas atendidas — com logo — para exibir a prova social no site."
          action={
            <Button onClick={openCreate}>
              <Plus size={18} />
              Novo cliente
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {rows.map((c) => {
            const logo = siteAssetUrl(c.logo_path);
            return (
              <button
                key={c.id}
                onClick={() => openEdit(c)}
                className="fx-lift fx-press flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 text-left hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-white p-1 dark:border-neutral-700">
                  {logo ? (
                    <img
                      src={logo}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <Building2 size={18} className="text-neutral-400" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-neutral-800 dark:text-neutral-100">
                      {c.name}
                    </p>
                    {!c.active && (
                      <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                        inativo
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                    {[c.segment, c.city].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
                <Pencil size={15} className="shrink-0 text-neutral-400" />
              </button>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Editar: ${editing.name}` : 'Novo cliente'}
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
          <div className="flex items-center gap-3">
            <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-neutral-200 bg-white p-1.5 dark:border-neutral-700">
              {siteAssetUrl(logoPath) ? (
                <img
                  src={siteAssetUrl(logoPath)!}
                  alt=""
                  className="h-full w-full object-contain"
                />
              ) : (
                <ImageIcon size={22} className="text-neutral-400" />
              )}
            </span>
            <div className="flex flex-col gap-1.5">
              <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                <ImageIcon size={16} />
                {uploading ? 'Enviando…' : 'Logo do cliente'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogo}
                  disabled={uploading}
                />
              </label>
              {logoPath ? (
                <button
                  type="button"
                  onClick={() => setLogoPath(null)}
                  className="w-fit text-xs text-neutral-500 dark:text-neutral-400 hover:text-red-600"
                >
                  Remover logo
                </button>
              ) : null}
            </div>
          </div>

          <Input
            id="client-name"
            label="Nome do cliente"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex.: Restaurante Maré Alta"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="client-segment"
              label="Segmento"
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              placeholder="ex.: Restaurante"
            />
            <Input
              id="client-city"
              label="Cidade"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="ex.: Macaé / RJ"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Depoimento (opcional)
            </label>
            <textarea
              className={`${fieldCls} min-h-[80px] resize-y`}
              value={testimonial}
              onChange={(e) => setTestimonial(e.target.value)}
              placeholder="Frase do cliente sobre o trabalho da ProActive7"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="client-site"
              label="Site / Instagram (opcional)"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://…"
            />
            <Input
              id="client-order"
              label="Ordem"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-5 w-5 accent-neutral-600"
            />
            Cliente ativo (visível no site)
          </label>
        </div>
      </Modal>
    </div>
  );
}
