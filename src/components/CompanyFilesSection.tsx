import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  FileText,
  Upload,
  Pencil,
  Trash2,
  Download,
  Plus,
  Check,
  CircleDashed,
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
  COMPANY_FILE_GROUPS,
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

/**
 * Aba "Documentos" da empresa — checklist da Vigilância Sanitária 2026
 * (lista enviada pela RT). Cada item é uma "gaveta" de upload: a nutri/
 * gerente carrega o arquivo do estabelecimento ali, sem edição de texto.
 * Persistido em `company_files` + bucket privado `company-docs` (RLS por
 * empresa). Mostra progresso (itens entregues x pendentes).
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

  // Edit modal
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

  const byCategory = useMemo(() => {
    const map = new Map<string, CompanyFile[]>();
    for (const f of files) {
      const key = f.category ?? OUTRO;
      const arr = map.get(key) ?? [];
      arr.push(f);
      map.set(key, arr);
    }
    return map;
  }, [files]);

  // Progresso: quantos itens obrigatórios (todos menos "outros") têm
  // ao menos um arquivo. Carro-pipa é condicional, mas conta no total
  // só para dar visibilidade — a cliente sabe o que se aplica.
  const progress = useMemo(() => {
    const required = COMPANY_FILE_CATEGORIES.filter((c) => c.key !== OUTRO);
    const done = required.filter((c) => (byCategory.get(c.key)?.length ?? 0) > 0);
    return { total: required.length, done: done.length };
  }, [byCategory]);

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

  // Categorias desconhecidas (legado) que não estão no catálogo atual.
  const unknownKeys = useMemo(() => {
    const known = new Set(COMPANY_FILE_CATEGORIES.map((c) => c.key));
    return [...byCategory.keys()].filter((k) => k !== OUTRO && !known.has(k));
  }, [byCategory]);

  function FileRow({ f }: { f: CompanyFile }) {
    return (
      <li className="flex items-center justify-between gap-2 py-1.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <FileText size={13} className="shrink-0 text-neutral-400" />
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-neutral-700 dark:text-neutral-300">
              {f.title}
            </p>
            <p className="text-[10px] text-neutral-400">
              {humanBytes(f.size_bytes)} · {formatDateTime(f.uploaded_at)}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-0.5">
          <button
            onClick={() => void openFile(f)}
            aria-label="Abrir"
            title="Abrir"
            className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-950"
          >
            <Download size={14} />
          </button>
          <button
            onClick={() => openEdit(f)}
            aria-label="Editar"
            title="Renomear / mudar categoria"
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => setDeleting(f)}
            aria-label="Excluir"
            title="Excluir"
            className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </li>
    );
  }

  function ChecklistItem({
    catKey,
    label,
    hint,
  }: {
    catKey: string;
    label: string;
    hint?: string;
  }) {
    const items = byCategory.get(catKey) ?? [];
    const has = items.length > 0;
    return (
      <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2">
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                has
                  ? 'bg-neutral-100 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300'
                  : 'bg-neutral-100 text-neutral-400 dark:bg-neutral-800'
              }`}
            >
              {has ? <Check size={12} /> : <CircleDashed size={12} />}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                {label}
              </p>
              {hint ? (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {hint}
                </p>
              ) : null}
            </div>
          </div>
          <button
            onClick={() => openUpload(catKey)}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-neutral-50 px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 dark:bg-neutral-950 dark:text-neutral-400 dark:hover:bg-neutral-900"
          >
            <Plus size={12} />
            {has ? 'Adicionar' : 'Carregar'}
          </button>
        </div>
        {has ? (
          <ul className="mt-2 divide-y divide-neutral-100 border-t border-neutral-100 pt-1 dark:divide-neutral-800 dark:border-neutral-800">
            {items.map((f) => (
              <FileRow key={f.id} f={f} />
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  return (
    <>
      {/* Progresso */}
      <Card className="mb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Carregue cada documento do estabelecimento na gaveta certa. PDF
              ou imagem, até 20 MB.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Entregues
              </p>
              <p className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
                {progress.done}
                <span className="text-sm font-normal text-neutral-400">
                  {' '}
                  / {progress.total}
                </span>
              </p>
            </div>
            <Button onClick={() => openUpload()} size="sm" disabled={!companyId}>
              <Plus size={14} />
              Adicionar
            </Button>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
          <div
            className="h-full rounded-full bg-neutral-500 transition-all"
            style={{
              width: `${
                progress.total > 0
                  ? (progress.done / progress.total) * 100
                  : 0
              }%`,
            }}
          />
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner className="h-6 w-6" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {COMPANY_FILE_GROUPS.map((g) => (
            <Card key={g.group}>
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                  {g.group}
                </h3>
                {g.note ? (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {g.note}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {g.items.map((c) => (
                  <ChecklistItem
                    key={c.key}
                    catKey={c.key}
                    label={c.label}
                    hint={c.hint}
                  />
                ))}
              </div>

              {/* Documentos legados sem categoria conhecida vão no grupo Outros */}
              {g.group === 'Outros' && unknownKeys.length > 0
                ? unknownKeys.map((k) => (
                    <div key={k} className="mt-2">
                      <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                        {(byCategory.get(k) ?? []).map((f) => (
                          <FileRow key={f.id} f={f} />
                        ))}
                      </ul>
                    </div>
                  ))
                : null}
            </Card>
          ))}
        </div>
      )}

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
            {COMPANY_FILE_GROUPS.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.items.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </optgroup>
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
            placeholder={
              pickedFile?.name ??
              COMPANY_FILE_CATEGORY_LABELS[category] ??
              'Ex.: Manual de Boas Práticas 2026'
            }
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
            {COMPANY_FILE_GROUPS.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.items.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </optgroup>
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
