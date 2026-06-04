import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  FileText,
  Upload,
  Pencil,
  Trash2,
  Download,
  Plus,
  FolderOpen,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatDateTime } from '@/lib/dates';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Modal } from './ui/Modal';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { Spinner } from './ui/Spinner';
import {
  COMPANY_FILE_CATEGORIES,
  COMPANY_FILE_CATEGORY_LABELS,
  type CompanyFile,
} from '@/lib/types';

interface Props {
  companyId: string;
}

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB
const OUTRO = 'outro';

function humanBytes(n: number | null | undefined): string {
  if (!n) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function categoryLabel(cat: string | null): string {
  if (!cat) return COMPANY_FILE_CATEGORY_LABELS[OUTRO];
  return (
    COMPANY_FILE_CATEGORY_LABELS[cat] ?? COMPANY_FILE_CATEGORY_LABELS[OUTRO]
  );
}

/**
 * Aba "Documentos" da empresa — agora 100% por upload (sem edição de
 * texto). A nutri/gerente carrega o arquivo na categoria certa: Manual
 * de Boas Práticas, POPs, ASO, laudo de controle de pragas, alvarás
 * etc. Persistido em `company_files` + bucket privado `company-docs`,
 * com RLS por empresa.
 */
export function CompanyFilesSection({ companyId }: Props) {
  const { profile } = useAuth();
  const [files, setFiles] = useState<CompanyFile[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload modal
  const [uploadOpen, setUploadOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(OUTRO);
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Edit modal (rename / re-describe / recategorize)
  const [editing, setEditing] = useState<CompanyFile | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editCategory, setEditCategory] = useState<string>(OUTRO);
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete confirm
  const [deleting, setDeleting] = useState<CompanyFile | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('company_files')
      .select('*')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('uploaded_at', { ascending: false });
    setLoading(false);
    if (error) {
      toast.error('Erro ao carregar documentos: ' + error.message);
      return;
    }
    setFiles((data as CompanyFile[] | null) ?? []);
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Agrupa por categoria, na ordem de COMPANY_FILE_CATEGORIES.
  const grouped = useMemo(() => {
    const map = new Map<string, CompanyFile[]>();
    for (const f of files) {
      const key = f.category ?? OUTRO;
      const arr = map.get(key) ?? [];
      arr.push(f);
      map.set(key, arr);
    }
    const ordered: { key: string; label: string; items: CompanyFile[] }[] = [];
    for (const { key, label } of COMPANY_FILE_CATEGORIES) {
      const items = map.get(key);
      if (items && items.length > 0) ordered.push({ key, label, items });
    }
    // Categorias desconhecidas (legados) vão para o fim.
    for (const [key, items] of map) {
      if (!COMPANY_FILE_CATEGORY_LABELS[key] && key !== OUTRO) {
        ordered.push({ key, label: categoryLabel(key), items });
      }
    }
    return ordered;
  }, [files]);

  function openUpload(presetCategory?: string) {
    setTitle('');
    setDescription('');
    setCategory(presetCategory ?? OUTRO);
    setPickedFile(null);
    setUploadOpen(true);
  }

  async function handleUpload() {
    if (!pickedFile) {
      toast.error('Escolha um arquivo.');
      return;
    }
    if (pickedFile.size > MAX_UPLOAD_BYTES) {
      toast.error('Arquivo acima de 20 MB.');
      return;
    }
    const finalTitle = title.trim() || pickedFile.name;
    setSaving(true);
    const ext = pickedFile.name.split('.').pop()?.toLowerCase() ?? 'bin';
    const path = `${companyId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('company-docs')
      .upload(path, pickedFile, {
        contentType: pickedFile.type || 'application/octet-stream',
      });
    if (upErr) {
      setSaving(false);
      toast.error('Erro no upload: ' + upErr.message);
      return;
    }
    const { error: insErr } = await supabase.from('company_files').insert({
      company_id: companyId,
      title: finalTitle,
      description: description.trim() || null,
      category,
      file_path: path,
      mime_type: pickedFile.type || null,
      size_bytes: pickedFile.size,
      uploaded_by: profile?.id ?? null,
    });
    setSaving(false);
    if (insErr) {
      await supabase.storage.from('company-docs').remove([path]);
      toast.error('Erro ao registrar: ' + insErr.message);
      return;
    }
    toast.success('Documento adicionado.');
    setUploadOpen(false);
    void load();
  }

  function openEdit(f: CompanyFile) {
    setEditing(f);
    setEditTitle(f.title);
    setEditDesc(f.description ?? '');
    setEditCategory(f.category ?? OUTRO);
  }

  async function handleSaveEdit() {
    if (!editing) return;
    if (!editTitle.trim()) {
      toast.error('Informe um nome.');
      return;
    }
    setSavingEdit(true);
    const { error } = await supabase
      .from('company_files')
      .update({
        title: editTitle.trim(),
        description: editDesc.trim() || null,
        category: editCategory,
      })
      .eq('id', editing.id);
    setSavingEdit(false);
    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
      return;
    }
    toast.success('Documento atualizado.');
    setEditing(null);
    void load();
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    const { error: updErr } = await supabase
      .from('company_files')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', deleting.id);
    if (!updErr) {
      const { error: rmErr } = await supabase.storage
        .from('company-docs')
        .remove([deleting.file_path]);
      if (rmErr) {
        console.warn('Falha ao remover arquivo do storage:', rmErr.message);
      }
    }
    setDeleteBusy(false);
    if (updErr) {
      toast.error('Erro ao excluir: ' + updErr.message);
      return;
    }
    toast.success('Documento excluído.');
    setDeleting(null);
    void load();
  }

  async function openFile(f: CompanyFile) {
    const { data, error } = await supabase.storage
      .from('company-docs')
      .createSignedUrl(f.file_path, 60);
    if (error || !data) {
      toast.error('Erro ao abrir: ' + (error?.message ?? ''));
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener');
  }

  function FileRow({ f }: { f: CompanyFile }) {
    return (
      <li className="flex items-start justify-between gap-3 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <FileText size={14} className="shrink-0 text-neutral-400" />
            <p className="min-w-0 truncate text-sm font-medium text-neutral-800 dark:text-neutral-200">
              {f.title}
            </p>
          </div>
          {f.description ? (
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              {f.description}
            </p>
          ) : null}
          <p className="mt-0.5 text-[11px] text-neutral-400 dark:text-neutral-500">
            {humanBytes(f.size_bytes)} · adicionado{' '}
            {formatDateTime(f.uploaded_at)}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            onClick={() => void openFile(f)}
            aria-label="Abrir"
            title="Abrir"
            className="rounded-lg p-2.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
          >
            <Download size={16} />
          </button>
          <button
            onClick={() => openEdit(f)}
            aria-label="Editar"
            title="Renomear / mudar categoria"
            className="rounded-lg p-2.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => setDeleting(f)}
            aria-label="Excluir"
            title="Excluir"
            className="rounded-lg p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </li>
    );
  }

  return (
    <>
      <Card className="mb-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              <FolderOpen size={16} className="text-emerald-600" />
              Documentos da empresa
            </h2>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Carregue os documentos do estabelecimento — Manual de Boas
              Práticas, POPs, ASO, laudos de controle de pragas, alvarás. PDF
              ou imagem, até 20 MB.
            </p>
          </div>
          <Button onClick={() => openUpload()} size="sm" disabled={!companyId}>
            <Plus size={14} />
            Adicionar
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-6">
            <Spinner className="h-5 w-5" />
          </div>
        ) : files.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-200 px-4 py-8 text-center dark:border-neutral-700">
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              Nenhum documento ainda.
            </p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Comece adicionando o Manual de Boas Práticas ou um POP.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {COMPANY_FILE_CATEGORIES.slice(0, 4).map((c) => (
                <Button
                  key={c.key}
                  size="sm"
                  variant="secondary"
                  onClick={() => openUpload(c.key)}
                >
                  <Plus size={14} />
                  {c.label}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {grouped.map((g) => (
              <div key={g.key}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                    {g.label}
                    <span className="ml-1.5 font-normal text-neutral-400">
                      ({g.items.length})
                    </span>
                  </h3>
                  <button
                    onClick={() => openUpload(g.key)}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950"
                  >
                    <Plus size={12} />
                    Adicionar
                  </button>
                </div>
                <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {g.items.map((f) => (
                    <FileRow key={f.id} f={f} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Adicionar documento"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setUploadOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpload}
              loading={saving}
              disabled={!pickedFile}
            >
              <Upload size={14} />
              Enviar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Select
            id="cf-category"
            label="Categoria"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {COMPANY_FILE_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </Select>
          <div>
            <p className="mb-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Arquivo (PDF, imagem ou documento — até 20 MB)
            </p>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700">
              <Upload size={14} />
              {pickedFile ? pickedFile.name : 'Selecionar arquivo'}
              <input
                type="file"
                accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx"
                className="hidden"
                onChange={(e) => setPickedFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {pickedFile ? (
              <p className="mt-1 text-xs text-neutral-500">
                {humanBytes(pickedFile.size)}
              </p>
            ) : null}
          </div>
          <Input
            id="cf-title"
            label="Nome do documento"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={pickedFile?.name ?? 'Ex.: Manual de Boas Práticas 2026'}
          />
          <Input
            id="cf-desc"
            label="Descrição (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex.: Vence em 12/2026"
          />
        </div>
      </Modal>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="Editar documento"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setEditing(null)}
              disabled={savingEdit}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} loading={savingEdit}>
              Salvar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Select
            id="cf-edit-category"
            label="Categoria"
            value={editCategory}
            onChange={(e) => setEditCategory(e.target.value)}
          >
            {COMPANY_FILE_CATEGORIES.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </Select>
          <Input
            id="cf-edit-title"
            label="Nome"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
          />
          <Input
            id="cf-edit-desc"
            label="Descrição (opcional)"
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Excluir documento"
        message={`Excluir "${deleting?.title}"? O arquivo será removido permanentemente.`}
        confirmLabel="Excluir"
        loading={deleteBusy}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
