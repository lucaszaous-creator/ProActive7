import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { jsPDF } from 'jspdf';
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Download,
  Eye,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { checkDeleteResult } from '@/lib/supabaseHelpers';
import { usePageTitle } from '@/lib/usePageTitle';
import { useAuth } from '@/context/AuthContext';
import { useCompanyScope } from '@/lib/useCompanyScope';
import { formatDateTime } from '@/lib/dates';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';
import type {
  ComplianceDocument,
  DocumentStatus,
  DocumentType,
} from '@/lib/types';
import {
  DOCUMENT_TYPE_LABELS,
  POP_TEMPLATES,
  fillPopPlaceholders,
  getPopTemplate,
} from '@/lib/popTemplates';
import { formatDate } from '@/lib/dates';
import {
  drawPdfFooter,
  drawPdfHeader,
  plainTextFromMarkdown,
  urlToDataUrl,
} from '@/lib/pdfHelpers';

const STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: 'Rascunho',
  published: 'Publicado',
  archived: 'Arquivado',
};

const STATUS_COLOR: Record<DocumentStatus, string> = {
  draft: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200',
  published:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200',
  archived:
    'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
};

export function DocumentsPage() {
  usePageTitle('Documentos');
  const { isMaster, profile } = useAuth();
  const {
    companies,
    companyId,
    setCompanyId,
    selectedCompany,
    companyLogoUrl,
  } = useCompanyScope();

  const [docs, setDocs] = useState<ComplianceDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ComplianceDocument | null>(null);
  const [docType, setDocType] = useState<DocumentType>('mbp');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [deleting, setDeleting] = useState<ComplianceDocument | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) {
      setDocs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('company_id', companyId)
      .order('type')
      .order('version', { ascending: false });
    setLoading(false);
    if (error) {
      toast.error('Erro ao carregar documentos: ' + error.message);
      return;
    }
    setDocs((data as ComplianceDocument[] | null) ?? []);
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate(type: DocumentType) {
    setEditing(null);
    setDocType(type);
    const template = getPopTemplate(type);
    const filled = template?.content
      ? fillPopPlaceholders(template.content, {
          empresa: selectedCompany?.name,
          rt_nome: profile?.full_name,
          rt_crn: profile?.crn,
          data: formatDate(new Date()),
        })
      : '';
    setTitle(template?.title ?? DOCUMENT_TYPE_LABELS[type]);
    setContent(filled);
    setShowPreview(false);
    setModalOpen(true);
  }

  function openEdit(doc: ComplianceDocument) {
    setEditing(doc);
    setDocType(doc.type);
    setTitle(doc.title);
    setContent(doc.content_md);
    setShowPreview(false);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!companyId) {
      toast.error('Selecione uma empresa.');
      return;
    }
    if (!title.trim()) {
      toast.error('Informe o titulo.');
      return;
    }
    setSaving(true);
    if (editing) {
      const { error } = await supabase
        .from('documents')
        .update({
          title: title.trim(),
          content_md: content,
        })
        .eq('id', editing.id);
      if (!error) {
        await supabase.from('document_versions').insert({
          document_id: editing.id,
          version: editing.version,
          content_md: content,
          saved_by: profile?.id,
        });
      }
      setSaving(false);
      if (error) {
        toast.error('Erro ao salvar: ' + error.message);
        return;
      }
      toast.success('Documento atualizado.');
    } else {
      const { error } = await supabase.from('documents').insert({
        company_id: companyId,
        type: docType,
        title: title.trim(),
        content_md: content,
        created_by: profile?.id,
      });
      setSaving(false);
      if (error) {
        toast.error('Erro ao salvar: ' + error.message);
        return;
      }
      toast.success('Documento criado.');
    }
    setModalOpen(false);
    void load();
  }

  async function handleApprove(doc: ComplianceDocument) {
    if (!isMaster) {
      toast.error('Apenas a RT pode aprovar documentos.');
      return;
    }
    const { error } = await supabase
      .from('documents')
      .update({
        status: 'published',
        approved_by: profile?.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', doc.id);
    if (error) {
      toast.error('Erro ao aprovar: ' + error.message);
      return;
    }
    toast.success('Documento aprovado.');
    void load();
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    const result = await supabase
      .from('documents')
      .delete()
      .eq('id', deleting.id)
      .select('id');
    setDeleteBusy(false);
    const err = checkDeleteResult(result);
    if (err) {
      toast.error(err);
      return;
    }
    toast.success('Documento excluido.');
    setDeleting(null);
    void load();
  }

  async function handleExportPdf(doc: ComplianceDocument) {
    const logoDataUrl = companyLogoUrl
      ? await urlToDataUrl(companyLogoUrl)
      : null;
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    let y = drawPdfHeader(pdf, {
      companyName: selectedCompany?.name ?? '',
      companyCnpj: selectedCompany?.cnpj,
      companyAddress: selectedCompany?.address,
      companyPhone: selectedCompany?.phone,
      companyLogoDataUrl: logoDataUrl,
      rtName: profile?.full_name,
      rtCrn: profile?.crn,
      rtEmail: profile?.email,
      rtPhone: profile?.phone,
    });

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text(doc.title, 14, y);
    y += 6;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(120);
    pdf.text(
      `Versao ${doc.version} - ${STATUS_LABELS[doc.status]}` +
        (doc.approved_at
          ? ` - Aprovado em ${formatDateTime(doc.approved_at)}`
          : ''),
      14,
      y,
    );
    pdf.setTextColor(0);
    y += 6;

    pdf.setFontSize(10);
    const plainText = plainTextFromMarkdown(doc.content_md);
    const split = pdf.splitTextToSize(plainText, 180);
    const pageHeight = pdf.internal.pageSize.getHeight();
    for (const line of split as string[]) {
      if (y > pageHeight - 20) {
        pdf.addPage();
        y = 14;
      }
      pdf.text(line, 14, y);
      y += 5;
    }

    drawPdfFooter(pdf);
    pdf.save(`${doc.title.replace(/\s+/g, '_')}_v${doc.version}.pdf`);
  }

  const existingTypes = useMemo(() => new Set(docs.map((d) => d.type)), [docs]);
  const missingTemplates = useMemo(
    () => POP_TEMPLATES.filter((t) => !existingTypes.has(t.type)),
    [existingTypes],
  );

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100 sm:text-2xl">
            Documentos
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Manual de Boas Praticas e POPs (RDC 216 + RDC 275).
          </p>
        </div>
      </div>

      {isMaster && companies.length > 0 ? (
        <div className="mb-4">
          <Select
            id="company-scope"
            label="Empresa"
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      {missingTemplates.length > 0 ? (
        <Card className="mb-4">
          <p className="mb-3 text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Templates pendentes (clique para iniciar com modelo da ANVISA):
          </p>
          <div className="flex flex-wrap gap-2">
            {missingTemplates.map((t) => (
              <Button
                key={t.type}
                size="sm"
                variant="secondary"
                onClick={() => openCreate(t.type)}
              >
                <Plus size={14} />
                {DOCUMENT_TYPE_LABELS[t.type]}
              </Button>
            ))}
          </div>
        </Card>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : docs.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <FileText
              size={32}
              className="text-neutral-300 dark:text-neutral-600"
            />
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Nenhum documento ainda. Use os templates acima para comecar.
            </p>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {docs.map((d) => (
            <Card key={d.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h2 className="min-w-0 max-w-full truncate text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                      {d.title}
                    </h2>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[d.status]}`}
                    >
                      {STATUS_LABELS[d.status]}
                    </span>
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                      v{d.version}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-500">
                    {DOCUMENT_TYPE_LABELS[d.type]} - Atualizado{' '}
                    {formatDateTime(d.updated_at)}
                    {d.approved_at
                      ? ` - Aprovado em ${formatDateTime(d.approved_at)}`
                      : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => openEdit(d)}
                    aria-label="Editar"
                    className="rounded-lg p-2.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => void handleExportPdf(d)}
                    aria-label="Exportar PDF"
                    className="rounded-lg p-2.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    <Download size={16} />
                  </button>
                  {isMaster && d.status === 'draft' ? (
                    <button
                      onClick={() => void handleApprove(d)}
                      aria-label="Aprovar"
                      className="rounded-lg p-2.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                    >
                      <CheckCircle2 size={16} />
                    </button>
                  ) : null}
                  <button
                    onClick={() => setDeleting(d)}
                    aria-label="Excluir"
                    className="rounded-lg p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    <Trash2 size={16} />
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
        title={
          editing ? `Editar documento (v${editing.version})` : 'Novo documento'
        }
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setShowPreview((v) => !v)}
            >
              <Eye size={14} />
              {showPreview ? 'Editar' : 'Pre-visualizar'}
            </Button>
            <Button
              variant="ghost"
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
        <div className="flex flex-col gap-3">
          {!editing ? (
            <Select
              id="doc-type"
              label="Tipo"
              value={docType}
              onChange={(e) => {
                const t = e.target.value as DocumentType;
                setDocType(t);
                const tpl = getPopTemplate(t);
                if (tpl) {
                  setTitle(tpl.title);
                  setContent(
                    fillPopPlaceholders(tpl.content, {
                      empresa: selectedCompany?.name,
                      rt_nome: profile?.full_name,
                      rt_crn: profile?.crn,
                      data: formatDate(new Date()),
                    }),
                  );
                }
              }}
            >
              {Object.entries(DOCUMENT_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          ) : null}
          <Input
            id="doc-title"
            label="Titulo"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          {showPreview ? (
            <div className="prose prose-sm max-w-none rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-slate-800 dark:prose-invert">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="doc-content"
                className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
              >
                Conteudo (Markdown)
              </label>
              <textarea
                id="doc-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={20}
                className="rounded-lg border border-neutral-300 bg-white px-3 py-2 font-mono text-xs text-neutral-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-neutral-700 dark:bg-slate-800 dark:text-neutral-100"
              />
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Excluir documento"
        message={`Tem certeza que deseja excluir "${deleting?.title}"?`}
        confirmLabel="Excluir"
        loading={deleteBusy}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
