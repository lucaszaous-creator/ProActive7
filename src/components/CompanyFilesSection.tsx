import { useCallback, useEffect, useState } from 'react';
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
import { Modal } from './ui/Modal';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { Spinner } from './ui/Spinner';
import type { CompanyFile } from '@/lib/types';

interface Props {
  companyId: string;
}

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB

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
 * Lista e gerencia documentos arbitrários (alvarás, contratos,
 * comprovantes, laudos etc.) de UMA empresa. Persistido em
 * `company_files` + bucket privado `company-docs`.
 * Apenas usuários com escopo na empresa veem (RLS faz cumprir).
 */
export function CompanyFilesSection({ companyId }: Props) {
  const { profile } = useAuth();
  const [files, setFiles] = useState<CompanyFile[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload modal
  const [uploadOpen, setUploadOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // Edit modal (rename / re-describe)
  const [editing, setEditing] = useState<CompanyFile | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
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
      toast.error('Erro ao carregar arquivos: ' + error.message);
      return;
    }
    setFiles((data as CompanyFile[] | null) ?? []);
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  function openUpload() {
    setTitle('');
    setDescription('');
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
      file_path: path,
      mime_type: pickedFile.type || null,
      size_bytes: pickedFile.size,
      uploaded_by: profile?.id ?? null,
    });
    setSaving(false);
    if (insErr) {
      // Cleanup do arquivo órfão.
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
    // Soft delete: marca deleted_at (a tela já filtra por is null).
    // O arquivo no Storage é removido pra liberar espaço — se um dia
    // quisermos "restaurar", precisaria refazer upload.
    const { error: updErr } = await supabase
      .from('company_files')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', deleting.id);
    if (!updErr) {
      const { error: rmErr } = await supabase.storage
        .from('company-docs')
        .remove([deleting.file_path]);
      if (rmErr) {
        // Soft delete já passou — apenas avisa. Não bloqueia a UX.
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

  return (
    <>
      <Card className="mb-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              <FolderOpen size={16} className="text-emerald-600" />
              Arquivos da empresa
            </h2>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Suba PDF/imagem de qualquer documento operacional (alvará,
              contrato, laudo, comprovante etc.). Apenas usuários desta
              empresa podem abrir.
            </p>
          </div>
          <Button onClick={openUpload} size="sm" disabled={!companyId}>
            <Plus size={14} />
            Adicionar
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-6">
            <Spinner className="h-5 w-5" />
          </div>
        ) : files.length === 0 ? (
          <p className="rounded-lg border border-dashed border-neutral-200 px-4 py-6 text-center text-xs text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
            Nenhum documento ainda. Clique em "Adicionar" para subir o
            primeiro.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {files.map((f) => (
              <li
                key={f.id}
                className="flex items-start justify-between gap-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <FileText
                      size={14}
                      className="shrink-0 text-neutral-400"
                    />
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
                    aria-label="Renomear"
                    title="Renomear"
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
            ))}
          </ul>
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
            placeholder={pickedFile?.name ?? 'Ex.: Alvará sanitário 2026'}
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
        title="Renomear documento"
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
