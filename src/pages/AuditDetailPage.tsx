import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import SignatureCanvas from 'react-signature-canvas';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  ArrowLeft,
  Check,
  X as XIcon,
  MinusCircle,
  Download,
  PenLine,
  Eraser,
  Save,
  Lock,
  CalendarClock,
  XCircle,
} from 'lucide-react';
import { toLocalInputValue } from '@/lib/dates';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useCompanyScope } from '@/lib/useCompanyScope';
import { formatDateTime } from '@/lib/dates';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageHeader } from '@/components/ui/PageHeader';
import type {
  Audit,
  AuditItem,
  AuditResponse,
  AuditResult,
  AuditTemplate,
} from '@/lib/types';
import { calculateAuditScore, scoresByCategory } from '@/lib/auditScore';
import { logFeatureEvent } from '@/lib/platformMetrics';
import {
  drawPdfFooter,
  drawPdfHeader,
  drawSectionTitle,
  drawScoreHero,
  drawKpiRow,
  storageObjectToDataUrl,
  urlToDataUrl,
} from '@/lib/pdfHelpers';
import { PRINT_RGB } from '@/lib/printTheme';

const RESULT_OPTIONS: {
  value: AuditResult;
  label: string;
  icon: typeof Check;
  classes: string;
  activeClasses: string;
}[] = [
  {
    value: 'C',
    label: 'C',
    icon: Check,
    classes:
      'border-neutral-200 bg-white text-neutral-500 dark:text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800',
    activeClasses:
      'border-neutral-500 bg-neutral-50 dark:bg-neutral-800/60 text-neutral-700 dark:text-neutral-200',
  },
  {
    value: 'NC',
    label: 'NC',
    icon: XIcon,
    classes:
      'border-neutral-200 bg-white text-neutral-500 dark:text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800',
    activeClasses:
      'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-200',
  },
  {
    value: 'NA',
    label: 'NA',
    icon: MinusCircle,
    classes:
      'border-neutral-200 bg-white text-neutral-500 dark:text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800',
    activeClasses:
      'border-neutral-500 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200',
  },
];

export function AuditDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isMaster, profile } = useAuth();
  const { selectedCompany, companyLogoUrl, companies, setCompanyId } =
    useCompanyScope();

  const [audit, setAudit] = useState<Audit | null>(null);
  const [template, setTemplate] = useState<AuditTemplate | null>(null);
  const [responses, setResponses] = useState<AuditResponse[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signOpen, setSignOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [newScheduledAt, setNewScheduledAt] = useState('');
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  /** Quem executou a visita — pode não ser quem está lendo agora. */
  const [auditorName, setAuditorName] = useState<string | null>(null);

  const sigRef = useRef<SignatureCanvas | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    // `auditor` é embed explícito pelo nome da FK: `audits` só referencia
    // `profiles` por auditor_id hoje, mas o padrão do projeto é nomear a
    // constraint para não quebrar se outra FK aparecer.
    const { data, error } = await supabase
      .from('audits')
      .select('*, auditor:profiles!audits_auditor_id_fkey(full_name)')
      .eq('id', id)
      .single();
    if (error || !data) {
      toast.error('Visita nao encontrada.');
      setLoading(false);
      return;
    }
    const withAuditor = data as Audit & {
      auditor: { full_name: string | null } | null;
    };
    setAuditorName(withAuditor.auditor?.full_name ?? null);
    const a = data as Audit;
    setAudit(a);
    setResponses(a.responses ?? []);
    setNotes(a.notes ?? '');
    setCompanyId(a.company_id);
    if (a.template_id) {
      const { data: tpl } = await supabase
        .from('audit_templates')
        .select('*')
        .eq('id', a.template_id)
        .maybeSingle();
      if (tpl) setTemplate(tpl as AuditTemplate);
    }
    setLoading(false);
  }, [id, setCompanyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const items: AuditItem[] = useMemo(() => template?.items ?? [], [template]);
  const score = useMemo(
    () => calculateAuditScore(items, responses),
    [items, responses],
  );
  const categories = useMemo(
    () => scoresByCategory(items, responses),
    [items, responses],
  );

  const groupedByCategory = useMemo(() => {
    const map = new Map<string, AuditItem[]>();
    for (const it of items) {
      const arr = map.get(it.category) ?? [];
      arr.push(it);
      map.set(it.category, arr);
    }
    return Array.from(map.entries());
  }, [items]);

  function setResult(itemId: string, result: AuditResult) {
    setResponses((prev) => {
      const next = prev.filter((r) => r.itemId !== itemId);
      next.push({
        ...(prev.find((r) => r.itemId === itemId) ?? { itemId, result }),
        result,
      });
      return next;
    });
  }

  function setNote(itemId: string, note: string) {
    setResponses((prev) => {
      const existing = prev.find((r) => r.itemId === itemId);
      if (!existing) {
        return [...prev, { itemId, result: 'NC', note }];
      }
      return prev.map((r) => (r.itemId === itemId ? { ...r, note } : r));
    });
  }

  function openSchedule() {
    if (!audit) return;
    setNewScheduledAt(
      audit.scheduled_at
        ? toLocalInputValue(new Date(audit.scheduled_at))
        : toLocalInputValue(new Date()),
    );
    setScheduleOpen(true);
  }

  async function handleSaveSchedule() {
    if (!audit) return;
    if (!newScheduledAt) {
      toast.error('Informe a data e hora.');
      return;
    }
    setSavingSchedule(true);
    // Reagendar uma visita cancelada a reabre (volta para "agendada").
    const reopen = audit.status === 'cancelled';
    const { error } = await supabase
      .from('audits')
      .update({
        scheduled_at: new Date(newScheduledAt).toISOString(),
        ...(reopen ? { status: 'scheduled' as const } : {}),
      })
      .eq('id', audit.id);
    setSavingSchedule(false);
    if (error) {
      toast.error('Erro ao reagendar: ' + error.message);
      return;
    }
    toast.success(
      reopen ? 'Visita reaberta e reagendada.' : 'Visita reagendada.',
    );
    setScheduleOpen(false);
    void load();
  }

  async function handleCancel() {
    if (!audit) return;
    setCancelling(true);
    const { error } = await supabase
      .from('audits')
      .update({ status: 'cancelled' })
      .eq('id', audit.id);
    setCancelling(false);
    if (error) {
      toast.error('Erro ao cancelar: ' + error.message);
      return;
    }
    toast.success('Visita cancelada.');
    setCancelOpen(false);
    void load();
  }

  async function handleSaveDraft() {
    if (!audit) return;
    setSaving(true);
    const { error } = await supabase
      .from('audits')
      .update({
        responses,
        notes,
        status: audit.status === 'scheduled' ? 'in_progress' : audit.status,
        started_at: audit.started_at ?? new Date().toISOString(),
        score,
        // Quem agendou nem sempre e quem vai a campo. A partir do momento
        // em que alguem comeca a preencher, a visita passa a ser dessa
        // pessoa — e e o nome dela que sai no laudo.
        auditor_id: profile?.id ?? audit.auditor_id,
      })
      .eq('id', audit.id);
    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
      return;
    }
    toast.success('Rascunho salvo.');
    void load();
  }

  async function handleFinalize() {
    if (!audit) return;
    if (!agreed) {
      toast.error('Marque "li e revisei" antes de finalizar.');
      return;
    }
    const sig = sigRef.current;
    if (!sig || sig.isEmpty()) {
      toast.error('Assine antes de finalizar.');
      return;
    }
    setFinalizing(true);
    const dataUrl = sig.toDataURL('image/png');
    const blob = await (await fetch(dataUrl)).blob();
    const path = `${audit.company_id}/${audit.id}.png`;
    const { error: upErr } = await supabase.storage
      .from('signatures')
      .upload(path, blob, { contentType: 'image/png', upsert: true });
    if (upErr) {
      setFinalizing(false);
      toast.error('Erro ao salvar assinatura: ' + upErr.message);
      return;
    }
    const { error } = await supabase
      .from('audits')
      .update({
        responses,
        notes,
        signature_path: path,
        status: 'completed',
        completed_at: new Date().toISOString(),
        score,
        // Quem assina e quem responde pela visita.
        auditor_id: profile?.id ?? audit.auditor_id,
      })
      .eq('id', audit.id);
    setFinalizing(false);
    if (error) {
      // Remove a assinatura orfa do bucket.
      const { error: rmErr } = await supabase.storage
        .from('signatures')
        .remove([path]);
      if (rmErr)
        console.warn('Falha ao remover assinatura órfã:', rmErr.message);
      toast.error('Erro ao finalizar: ' + error.message);
      return;
    }
    toast.success('Visita finalizada.');
    void logFeatureEvent('audit_completed');
    setSignOpen(false);

    // Gera NCs a partir dos itens marcados como NC
    const rMap = new Map(responses.map((r) => [r.itemId, r]));
    const ncItems = items.filter((it) => rMap.get(it.id)?.result === 'NC');
    if (ncItems.length > 0) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      const inserts = ncItems.map((it) => ({
        company_id: audit.company_id,
        audit_id: audit.id,
        source: 'audit' as const,
        category: it.category,
        description: it.text,
        severity:
          it.weight >= 3
            ? ('high' as const)
            : it.weight >= 2
              ? ('medium' as const)
              : ('low' as const),
        what: it.text,
        when_due: dueDate.toISOString().slice(0, 10),
        opened_by: profile?.id,
      }));
      const { error: ncError } = await supabase
        .from('non_conformities')
        .insert(inserts);
      if (ncError) {
        toast.error('Atencao: NCs nao foram criadas: ' + ncError.message);
      } else {
        toast.success(`${inserts.length} nao-conformidade(s) abertas.`);
      }
    }

    // Recorrencia: agenda automaticamente a proxima visita.
    // Base = quando ESTA visita foi finalizada (mais correto que o
    // scheduled_at, que pode estar no passado se houve atraso). Se
    // ainda assim a proxima data calculada cair no passado (visita
    // muito atrasada + recurrencia curta), avanca em ciclos ate
    // passar de hoje.
    if (audit.recurrence_months && audit.recurrence_months > 0) {
      const baseDate = new Date(
        audit.completed_at ?? audit.scheduled_at ?? new Date().toISOString(),
      );
      let nextDate = new Date(
        baseDate.getFullYear(),
        baseDate.getMonth() + audit.recurrence_months,
        baseDate.getDate(),
        baseDate.getHours(),
        baseDate.getMinutes(),
      );
      const now = new Date();
      while (nextDate < now) {
        nextDate = new Date(
          nextDate.getFullYear(),
          nextDate.getMonth() + audit.recurrence_months,
          nextDate.getDate(),
          nextDate.getHours(),
          nextDate.getMinutes(),
        );
      }
      const { error: nextErr } = await supabase.from('audits').insert({
        company_id: audit.company_id,
        template_id: audit.template_id,
        scheduled_at: nextDate.toISOString(),
        auditor_id: audit.auditor_id,
        status: 'scheduled' as const,
        recurrence_months: audit.recurrence_months,
        parent_audit_id: audit.id,
      });
      if (nextErr) {
        toast.error(
          'Proxima visita recorrente nao foi criada: ' + nextErr.message,
        );
      } else {
        toast.success('Proxima visita agendada automaticamente.');
      }
    }

    void load();
  }

  async function handleExportPdf() {
    if (!audit || !template) return;
    const logoDataUrl = companyLogoUrl
      ? await urlToDataUrl(companyLogoUrl)
      : null;
    // Bucket 'signatures' eh privado — download autenticado.
    const sigDataUrl = audit.signature_path
      ? await storageObjectToDataUrl('signatures', audit.signature_path)
      : null;

    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    let y = drawPdfHeader(pdf, {
      documentTitle: 'Relatório de Visita Técnica',
      companyName: selectedCompany?.name ?? '',
      companyCnpj: selectedCompany?.cnpj,
      companyAddress: selectedCompany?.address,
      companyPhone: selectedCompany?.phone,
      companyLogoDataUrl: logoDataUrl,
      rtName: profile?.full_name,
      rtCrn: profile?.crn,
      rtEmail: profile?.email,
      rtPhone: profile?.phone,
      documentId: audit.id.slice(0, 8).toUpperCase(),
    });

    // Hero de score
    y = drawScoreHero(pdf, score, y);

    // Metadados da visita
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(...PRINT_RGB.body);
    const metaLine = [
      `Modelo: ${template.name}`,
      audit.scheduled_at
        ? `Agendada: ${formatDateTime(audit.scheduled_at)}`
        : '',
      audit.completed_at
        ? `Finalizada: ${formatDateTime(audit.completed_at)}`
        : '',
      // Com equipe, quem vai a campo nem sempre e a RT do cabecalho.
      auditorName ? `Executada por: ${auditorName}` : '',
    ]
      .filter(Boolean)
      .join('     ·     ');
    pdf.text(metaLine, 14, y);
    pdf.setTextColor(...PRINT_RGB.ink);
    y += 8;

    // KPIs de conformidade
    const responseMap = new Map(responses.map((r) => [r.itemId, r]));
    const norm = (s: string) => s.toLowerCase();
    let conforme = 0;
    let naoConforme = 0;
    let na = 0;
    for (const it of items) {
      const r = responseMap.get(it.id)?.result;
      if (!r) continue;
      const rn = norm(r);
      if (rn.includes('conforme') && !rn.includes('não') && !rn.includes('nao'))
        conforme++;
      else if (rn.includes('não') || rn.includes('nao') || rn.includes('nc'))
        naoConforme++;
      else na++;
    }
    y = drawKpiRow(
      pdf,
      [
        { label: 'Itens avaliados', value: String(items.length), tone: 'ink' },
        { label: 'Conformes', value: String(conforme), tone: 'green' },
        { label: 'Não conformes', value: String(naoConforme), tone: 'red' },
        { label: 'N/A', value: String(na), tone: 'ink' },
      ],
      y,
    );

    // Itens avaliados
    y = drawSectionTitle(pdf, 'Itens avaliados', y);
    autoTable(pdf, {
      startY: y,
      head: [['Categoria', 'Item', 'Resultado', 'Ref. legal', 'Observação']],
      body: items.map((it) => {
        const r = responseMap.get(it.id);
        return [
          it.category,
          it.text,
          r?.result ?? '—',
          it.legal_ref ?? '',
          r?.note ?? '',
        ];
      }),
      theme: 'grid',
      headStyles: {
        fillColor: [...PRINT_RGB.brandDeep],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        cellPadding: 2,
      },
      styles: {
        fontSize: 8,
        cellPadding: 1.8,
        textColor: [...PRINT_RGB.body],
        lineColor: [...PRINT_RGB.hair],
        lineWidth: 0.2,
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 24 },
        2: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
        3: { cellWidth: 24 },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 2) {
          const v = norm(String(data.cell.raw ?? ''));
          if (v.includes('não') || v.includes('nao') || v === 'nc')
            data.cell.styles.textColor = [...PRINT_RGB.red];
          else if (v.includes('conforme'))
            data.cell.styles.textColor = [...PRINT_RGB.green];
        }
      },
      margin: { left: 14, right: 14 },
    });

    const pageHeight = pdf.internal.pageSize.getHeight();
    let currentY =
      (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
        ?.finalY ?? y;

    if (notes) {
      currentY += 8;
      if (currentY > pageHeight - 30) {
        pdf.addPage();
        currentY = 16;
      }
      currentY = drawSectionTitle(pdf, 'Observações gerais', currentY);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9.5);
      pdf.setTextColor(...PRINT_RGB.body);
      const split = pdf.splitTextToSize(notes, 182);
      pdf.text(split, 14, currentY);
      pdf.setTextColor(...PRINT_RGB.ink);
      currentY += split.length * 4.4;
    }

    // Assinatura — bloco com filete e nome/CRN/data.
    if (sigDataUrl && profile) {
      const SIG_BLOCK_HEIGHT = 50;
      const FOOTER_MARGIN = 14;
      if (currentY + SIG_BLOCK_HEIGHT > pageHeight - FOOTER_MARGIN) {
        pdf.addPage();
        currentY = 20;
      } else {
        currentY += 8;
      }
      currentY = drawSectionTitle(
        pdf,
        'Assinatura do Responsável Técnico',
        currentY,
      );
      try {
        pdf.addImage(sigDataUrl, 'PNG', 14, currentY, 58, 22);
      } catch {
        /* ignore */
      }
      // Linha de assinatura
      pdf.setDrawColor(...PRINT_RGB.faint);
      pdf.setLineWidth(0.3);
      pdf.line(14, currentY + 24, 86, currentY + 24);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(...PRINT_RGB.ink);
      const who = profile.full_name ?? profile.email ?? '';
      pdf.text(who, 14, currentY + 28);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(...PRINT_RGB.muted);
      const dataStr = audit.completed_at
        ? formatDateTime(audit.completed_at)
        : formatDateTime(new Date().toISOString());
      const sub = [profile.crn ? `CRN ${profile.crn}` : '', dataStr]
        .filter(Boolean)
        .join('  ·  ');
      pdf.text(sub, 14, currentY + 32);
      pdf.setTextColor(...PRINT_RGB.ink);
    }

    drawPdfFooter(pdf);
    pdf.save(
      `visita_${selectedCompany?.name?.replace(/\s+/g, '_') ?? 'empresa'}_${audit.id.slice(0, 8)}.pdf`,
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!audit) {
    return (
      <Card>
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Visita nao encontrada.
        </p>
      </Card>
    );
  }

  const isCompleted = audit.status === 'completed';
  const isCancelled = audit.status === 'cancelled';
  // Só a RT (nutricionista) e o platform_admin avaliam a visita — competência
  // técnica perante a ANVISA. `isMaster` aqui = master/platform_admin/nutri
  // (ver AuthContext); o `property` NÃO avalia. RLS reforça no banco.
  const canEvaluate = isMaster;
  // Controles de avaliação ficam travados quando a visita está concluída
  // OU quando o usuário não tem competência para avaliar.
  const locked = isCompleted || !canEvaluate;
  const responseMap = new Map(responses.map((r) => [r.itemId, r]));

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        to="/visitas"
        className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-600 hover:underline dark:text-neutral-400"
      >
        <ArrowLeft size={14} />
        Voltar
      </Link>

      <PageHeader
        title={
          selectedCompany?.name ??
          companies.find((c) => c.id === audit.company_id)?.name ??
          ''
        }
        subtitle={template?.name}
        actions={
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            {score != null ? (
              <span
                className={`rounded-full px-3 py-1 text-base font-bold ${
                  score >= 85
                    ? 'bg-neutral-100 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-200'
                    : score >= 70
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200'
                      : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200'
                }`}
              >
                Score: {score.toFixed(1)}%
              </span>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {!isCompleted && !isCancelled && isMaster ? (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={openSchedule}
                    disabled={saving || finalizing}
                    title="Alterar data e hora agendada"
                  >
                    <CalendarClock size={14} />
                    Reagendar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCancelOpen(true)}
                    disabled={saving || finalizing}
                    title="Cancelar esta visita"
                    className="text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    <XCircle size={14} />
                    Cancelar
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleSaveDraft}
                    loading={saving}
                  >
                    <Save size={14} />
                    Salvar rascunho
                  </Button>
                  <Button size="sm" onClick={() => setSignOpen(true)}>
                    <PenLine size={14} />
                    Finalizar
                  </Button>
                </>
              ) : null}
              {isCancelled && isMaster ? (
                <>
                  <span className="inline-flex items-center gap-1 rounded-full bg-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                    <XCircle size={12} />
                    Visita cancelada
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={openSchedule}
                    title="Reagendar reabre a visita"
                  >
                    <CalendarClock size={14} />
                    Reagendar
                  </Button>
                </>
              ) : null}
              {isCompleted ? (
                <>
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
                    title="O status de uma visita finalizada não pode ser revertido — assinada pela RT, ela passa a fazer parte da trilha de auditoria."
                  >
                    <Lock size={12} />
                    Status travado (finalizada)
                  </span>
                  <Button size="sm" onClick={handleExportPdf}>
                    <Download size={14} />
                    Exportar PDF
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        }
      />

      {!canEvaluate ? (
        <Card className="mb-4 border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40">
          <p className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-200">
            <Lock size={16} className="mt-0.5 shrink-0" />
            <span>
              <b>Acesso de leitura.</b> A avaliação da visita técnica é
              responsabilidade do nutricionista (RT) da empresa — apenas ele
              pode preencher e finalizar. Você pode acompanhar o resultado.
            </span>
          </p>
        </Card>
      ) : null}

      {categories.length > 0 ? (
        <Card className="mb-4">
          <p className="mb-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            Score por categoria
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
            {categories.map((c) => (
              <div
                key={c.category}
                className="rounded-lg border border-neutral-200 p-2 dark:border-neutral-800"
              >
                <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                  {c.category}
                </p>
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                  {c.scorePercent.toFixed(0)}%
                </p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="flex flex-col gap-4">
        {groupedByCategory.map(([category, catItems]) => (
          <Card key={category}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-400">
              {category}
            </h2>
            <div className="flex flex-col gap-3">
              {catItems.map((it) => {
                const r = responseMap.get(it.id);
                return (
                  <div
                    key={it.id}
                    className="rounded-lg border border-neutral-100 p-3 dark:border-neutral-800"
                  >
                    <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <p className="min-w-0 flex-1 text-sm text-neutral-800 dark:text-neutral-200">
                        {it.text}
                        {it.legal_ref ? (
                          <span className="ml-1 text-xs text-neutral-400">
                            ({it.legal_ref})
                          </span>
                        ) : null}
                      </p>
                      <div className="flex shrink-0 flex-wrap gap-1">
                        {RESULT_OPTIONS.map((opt) => {
                          const Icon = opt.icon;
                          const active = r?.result === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              disabled={locked}
                              onClick={() => setResult(it.id, opt.value)}
                              className={`inline-flex h-11 w-14 items-center justify-center gap-1 rounded-lg border text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                active ? opt.activeClasses : opt.classes
                              }`}
                            >
                              <Icon size={14} />
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    {r?.result === 'NC' || r?.note ? (
                      <textarea
                        value={r?.note ?? ''}
                        disabled={locked}
                        onChange={(e) => setNote(it.id, e.target.value)}
                        placeholder="Observacao / plano de acao..."
                        rows={2}
                        className="w-full rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-900 outline-none focus:border-neutral-800 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </Card>
        ))}

        <Card>
          <label
            htmlFor="notes"
            className="mb-2 block text-sm font-semibold text-neutral-700 dark:text-neutral-300"
          >
            Observacoes gerais
          </label>
          <textarea
            id="notes"
            value={notes}
            disabled={locked}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-800 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          />
        </Card>
      </div>

      <Modal
        open={signOpen}
        onClose={() => setSignOpen(false)}
        title="Assinar e finalizar"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => sigRef.current?.clear()}
              disabled={finalizing}
            >
              <Eraser size={14} />
              Limpar
            </Button>
            <Button
              variant="secondary"
              onClick={() => setSignOpen(false)}
              disabled={finalizing}
            >
              Cancelar
            </Button>
            <Button onClick={handleFinalize} loading={finalizing}>
              Finalizar visita
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Assine no campo abaixo. A assinatura ficara registrada no PDF junto
            com seus dados profissionais ({profile?.full_name}
            {profile?.crn ? ` - CRN ${profile.crn}` : ''}).
          </p>
          <div className="overflow-hidden rounded-lg border border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-800">
            <SignatureCanvas
              ref={sigRef}
              penColor="black"
              backgroundColor="white"
              canvasProps={{
                width: 320,
                height: 160,
                className: 'block rounded-lg max-w-full',
              }}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="h-5 w-5 accent-neutral-600"
            />
            Li e revisei todas as respostas e observacoes.
          </label>
        </div>
      </Modal>

      <Modal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        title="Reagendar visita"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setScheduleOpen(false)}
              disabled={savingSchedule}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveSchedule} loading={savingSchedule}>
              Salvar nova data
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Altere a data e hora agendada para esta visita. Visitas já
            finalizadas não podem ser reagendadas.
          </p>
          <Input
            id="resched"
            label="Nova data e hora"
            type="datetime-local"
            value={newScheduledAt}
            onChange={(e) => setNewScheduledAt(e.target.value)}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={cancelOpen}
        title="Cancelar visita"
        message="Tem certeza que deseja cancelar esta visita? Ela ficará marcada como cancelada — você pode reabri-la depois reagendando."
        confirmLabel="Cancelar visita"
        loading={cancelling}
        onConfirm={handleCancel}
        onCancel={() => setCancelOpen(false)}
      />
    </div>
  );
}
