import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  HardHat,
  Plus,
  Pencil,
  Trash2,
  FileCheck2,
  GraduationCap,
  Upload,
  FileText as FileTextIcon,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { softDelete } from '@/lib/supabaseHelpers';
import { usePageTitle } from '@/lib/usePageTitle';
import { useAuth } from '@/context/AuthContext';
import { useCompanyScope } from '@/lib/useCompanyScope';
import { formatDate } from '@/lib/dates';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import type {
  Manipulator,
  ManipulatorAso,
  ManipulatorTraining,
} from '@/lib/types';
import {
  ASO_STATUS_COLOR,
  ASO_STATUS_LABELS,
  asoStatusFromList,
} from '@/lib/asoStatus';

interface ManipulatorWithDocs extends Manipulator {
  asos: ManipulatorAso[];
  trainings: ManipulatorTraining[];
}

interface Form {
  full_name: string;
  cpf: string;
  role: string;
  hired_at: string;
  active: boolean;
  notes: string;
}

const emptyForm: Form = {
  full_name: '',
  cpf: '',
  role: '',
  hired_at: '',
  active: true,
  notes: '',
};

export function ManipulatorsPage() {
  usePageTitle('Manipuladores');
  const { isMaster } = useAuth();
  const { companies, companyId, setCompanyId } = useCompanyScope();

  const [list, setList] = useState<ManipulatorWithDocs[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Manipulator | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState<Manipulator | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [asoModalFor, setAsoModalFor] = useState<Manipulator | null>(null);
  const [asoIssuedAt, setAsoIssuedAt] = useState('');
  const [asoExpiresAt, setAsoExpiresAt] = useState('');
  const [asoDoctor, setAsoDoctor] = useState('');
  const [asoCrm, setAsoCrm] = useState('');
  const [asoFile, setAsoFile] = useState<File | null>(null);
  const [asoSaving, setAsoSaving] = useState(false);

  const [trainingModalFor, setTrainingModalFor] = useState<Manipulator | null>(
    null,
  );
  const [trTopic, setTrTopic] = useState('');
  const [trHours, setTrHours] = useState('');
  const [trCompletedAt, setTrCompletedAt] = useState('');
  const [trExpiresAt, setTrExpiresAt] = useState('');
  const [trInstructor, setTrInstructor] = useState('');
  const [trFile, setTrFile] = useState<File | null>(null);
  const [trSaving, setTrSaving] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) {
      setList([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('manipulators')
      .select('*, asos:manipulator_asos(*), trainings:manipulator_trainings(*)')
      .eq('company_id', companyId)
      .order('full_name');
    setLoading(false);
    if (error) {
      toast.error('Erro ao carregar manipuladores: ' + error.message);
      return;
    }
    setList((data as unknown as ManipulatorWithDocs[] | null) ?? []);
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(m: Manipulator) {
    setEditing(m);
    setForm({
      full_name: m.full_name,
      cpf: m.cpf ?? '',
      role: m.role ?? '',
      hired_at: m.hired_at ?? '',
      active: m.active,
      notes: m.notes ?? '',
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!companyId) {
      toast.error('Selecione uma empresa.');
      return;
    }
    if (!form.full_name.trim()) {
      toast.error('Informe o nome.');
      return;
    }
    setSaving(true);
    const payload = {
      company_id: companyId,
      full_name: form.full_name.trim(),
      cpf: form.cpf.trim() || null,
      role: form.role.trim() || null,
      hired_at: form.hired_at || null,
      active: form.active,
      notes: form.notes.trim() || null,
    };
    const { error } = editing
      ? await supabase.from('manipulators').update(payload).eq('id', editing.id)
      : await supabase.from('manipulators').insert(payload);
    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
      return;
    }
    toast.success(editing ? 'Manipulador atualizado.' : 'Manipulador criado.');
    setModalOpen(false);
    void load();
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    const err = await softDelete('manipulators', deleting.id);
    setDeleteBusy(false);
    if (err) {
      toast.error(err);
      return;
    }
    toast.success('Manipulador movido para a lixeira.');
    setDeleting(null);
    void load();
  }

  function openAsoModal(m: Manipulator) {
    setAsoModalFor(m);
    setAsoIssuedAt(new Date().toISOString().slice(0, 10));
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    setAsoExpiresAt(d.toISOString().slice(0, 10));
    setAsoDoctor('');
    setAsoCrm('');
    setAsoFile(null);
  }

  async function handleSaveAso() {
    if (!asoModalFor || !companyId) return;
    if (!asoIssuedAt || !asoExpiresAt) {
      toast.error('Preencha emissao e vencimento.');
      return;
    }
    setAsoSaving(true);
    let filePath: string | null = null;
    if (asoFile) {
      const ext = asoFile.name.split('.').pop()?.toLowerCase() ?? 'pdf';
      const path = `${companyId}/aso_${asoModalFor.id}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('employee-docs')
        .upload(path, asoFile, {
          contentType: asoFile.type || 'application/octet-stream',
        });
      if (upErr) {
        setAsoSaving(false);
        toast.error('Erro no upload: ' + upErr.message);
        return;
      }
      filePath = path;
    }
    const { error } = await supabase.from('manipulator_asos').insert({
      manipulator_id: asoModalFor.id,
      issued_at: asoIssuedAt,
      expires_at: asoExpiresAt,
      doctor_name: asoDoctor.trim() || null,
      doctor_crm: asoCrm.trim() || null,
      file_path: filePath,
    });
    setAsoSaving(false);
    if (error) {
      // Insert falhou — remover o arquivo orfao do bucket.
      if (filePath) {
        const { error: rmErr } = await supabase.storage
          .from('employee-docs')
          .remove([filePath]);
        if (rmErr)
          console.warn('Falha ao remover ASO órfão:', rmErr.message);
      }
      toast.error('Erro ao salvar ASO: ' + error.message);
      return;
    }
    toast.success('ASO registrado.');
    setAsoModalFor(null);
    void load();
  }

  function openTrainingModal(m: Manipulator) {
    setTrainingModalFor(m);
    setTrTopic('');
    setTrHours('');
    setTrCompletedAt(new Date().toISOString().slice(0, 10));
    setTrExpiresAt('');
    setTrInstructor('');
    setTrFile(null);
  }

  async function handleSaveTraining() {
    if (!trainingModalFor || !companyId) return;
    if (!trTopic.trim() || !trCompletedAt) {
      toast.error('Informe topico e data.');
      return;
    }
    setTrSaving(true);
    let certPath: string | null = null;
    if (trFile) {
      const ext = trFile.name.split('.').pop()?.toLowerCase() ?? 'pdf';
      const path = `${companyId}/cert_${trainingModalFor.id}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('employee-docs')
        .upload(path, trFile, {
          contentType: trFile.type || 'application/octet-stream',
        });
      if (upErr) {
        setTrSaving(false);
        toast.error('Erro no upload: ' + upErr.message);
        return;
      }
      certPath = path;
    }
    const { error } = await supabase.from('manipulator_trainings').insert({
      manipulator_id: trainingModalFor.id,
      topic: trTopic.trim(),
      hours: trHours ? Number(trHours) : null,
      completed_at: trCompletedAt,
      expires_at: trExpiresAt || null,
      instructor: trInstructor.trim() || null,
      certificate_path: certPath,
    });
    setTrSaving(false);
    if (error) {
      if (certPath) {
        const { error: rmErr } = await supabase.storage
          .from('employee-docs')
          .remove([certPath]);
        if (rmErr)
          console.warn('Falha ao remover certificado órfão:', rmErr.message);
      }
      toast.error('Erro ao salvar: ' + error.message);
      return;
    }
    toast.success('Treinamento registrado.');
    setTrainingModalFor(null);
    void load();
  }

  async function openSignedFile(path: string) {
    const { data, error } = await supabase.storage
      .from('employee-docs')
      .createSignedUrl(path, 60);
    if (error || !data) {
      toast.error('Erro ao abrir arquivo: ' + (error?.message ?? ''));
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener');
  }

  const summary = useMemo(() => {
    const total = list.filter((m) => m.active).length;
    let valid = 0;
    let expiring = 0;
    let expired = 0;
    let missing = 0;
    for (const m of list) {
      if (!m.active) continue;
      const r = asoStatusFromList(m.asos);
      if (r.status === 'valid') valid++;
      else if (r.status === 'expiring') expiring++;
      else if (r.status === 'expired') expired++;
      else missing++;
    }
    return { total, valid, expiring, expired, missing };
  }, [list]);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Manipuladores"
        subtitle="Funcionários, ASO (RDC 216 art. 4.6.7) e treinamentos."
        actions={
          isMaster ? (
            <Button onClick={openCreate}>
              <Plus size={18} />
              Novo manipulador
            </Button>
          ) : null
        }
      />

      {!isMaster ? (
        <Card className="mb-4 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
          <p className="text-xs text-amber-800 dark:text-amber-200">
            Somente a nutricionista responsável técnica pode adicionar, editar
            ou remover manipuladores, ASOs e treinamentos.
          </p>
        </Card>
      ) : null}

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

      {list.length > 0 ? (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          <Card>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Ativos
            </p>
            <p className="text-2xl font-semibold text-neutral-800 dark:text-neutral-100">
              {summary.total}
            </p>
          </Card>
          <Card>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              ASO em dia
            </p>
            <p className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">
              {summary.valid}
            </p>
          </Card>
          <Card>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Vencendo
            </p>
            <p className="text-2xl font-semibold text-amber-700 dark:text-amber-200">
              {summary.expiring}
            </p>
          </Card>
          <Card>
            <p className="text-xs text-red-600 dark:text-red-400">Vencidos</p>
            <p className="text-2xl font-semibold text-red-700 dark:text-red-200">
              {summary.expired}
            </p>
          </Card>
          <Card>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Sem ASO
            </p>
            <p className="text-2xl font-semibold text-neutral-700 dark:text-neutral-300">
              {summary.missing}
            </p>
          </Card>
        </div>
      ) : null}

      {isMaster && companies.length === 0 ? (
        <Card>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Nenhuma empresa cadastrada. Crie uma empresa em{' '}
            <a
              href="/admin/empresas"
              className="font-medium text-neutral-700 hover:underline dark:text-neutral-400"
            >
              Empresas
            </a>{' '}
            para começar.
          </p>
        </Card>
      ) : loading ? (
        <ListSkeleton rows={5} />
      ) : list.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <HardHat
              size={32}
              className="text-neutral-300 dark:text-neutral-600"
            />
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Nenhum manipulador cadastrado.
            </p>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((m) => {
            const aso = asoStatusFromList(m.asos);
            return (
              <Card key={m.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <h2 className="min-w-0 max-w-full truncate text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                        {m.full_name}
                      </h2>
                      {m.role ? (
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">
                          {m.role}
                        </span>
                      ) : null}
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${ASO_STATUS_COLOR[aso.status]}`}
                      >
                        ASO: {ASO_STATUS_LABELS[aso.status]}
                        {aso.latest
                          ? ` (vence ${formatDate(aso.latest.expires_at)})`
                          : ''}
                      </span>
                      {!m.active ? (
                        <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                          Inativo
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-500">
                      {m.cpf ? `CPF ${m.cpf} - ` : ''}
                      {m.hired_at
                        ? `admitido em ${formatDate(m.hired_at)}`
                        : 'sem data de admissao'}
                    </p>
                    {m.trainings.length > 0 ? (
                      <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
                        <GraduationCap size={12} className="mr-1 inline" />
                        {m.trainings.length} treinamento
                        {m.trainings.length === 1 ? '' : 's'}; ultimo:{' '}
                        {formatDate(
                          [...m.trainings].sort((a, b) =>
                            b.completed_at.localeCompare(a.completed_at),
                          )[0].completed_at,
                        )}
                      </p>
                    ) : null}
                    {aso.latest?.file_path ? (
                      <button
                        type="button"
                        onClick={() =>
                          void openSignedFile(aso.latest!.file_path!)
                        }
                        className="mt-2 inline-flex items-center gap-1 text-xs text-neutral-700 hover:underline dark:text-neutral-400"
                      >
                        <FileTextIcon size={12} />
                        Abrir ASO atual
                      </button>
                    ) : null}
                  </div>
                  {isMaster ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => openAsoModal(m)}
                        aria-label="Registrar ASO"
                        title="Registrar ASO"
                        className="rounded-lg p-2.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-950"
                      >
                        <FileCheck2 size={16} />
                      </button>
                      <button
                        onClick={() => openTrainingModal(m)}
                        aria-label="Registrar treinamento"
                        title="Registrar treinamento"
                        className="rounded-lg p-2.5 text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950"
                      >
                        <GraduationCap size={16} />
                      </button>
                      <button
                        onClick={() => openEdit(m)}
                        aria-label="Editar"
                        className="rounded-lg p-2.5 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => setDeleting(m)}
                        aria-label="Excluir"
                        className="rounded-lg p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar manipulador' : 'Novo manipulador'}
        footer={
          <>
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
        <div className="flex flex-col gap-3">
          <Input
            id="m-name"
            label="Nome completo"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              id="m-cpf"
              label="CPF (opcional)"
              value={form.cpf}
              onChange={(e) => setForm({ ...form, cpf: e.target.value })}
            />
            <Input
              id="m-role"
              label="Cargo"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            />
          </div>
          <Input
            id="m-hired"
            label="Admissão"
            type="date"
            value={form.hired_at}
            onChange={(e) => setForm({ ...form, hired_at: e.target.value })}
          />
          <Input
            id="m-notes"
            label="Observações"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="h-5 w-5 accent-neutral-600"
            />
            Ativo
          </label>
        </div>
      </Modal>

      <Modal
        open={asoModalFor !== null}
        onClose={() => setAsoModalFor(null)}
        title={`ASO - ${asoModalFor?.full_name ?? ''}`}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setAsoModalFor(null)}
              disabled={asoSaving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveAso} loading={asoSaving}>
              Salvar ASO
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              id="aso-issued"
              label="Emissão"
              type="date"
              value={asoIssuedAt}
              onChange={(e) => setAsoIssuedAt(e.target.value)}
            />
            <Input
              id="aso-expires"
              label="Vencimento"
              type="date"
              value={asoExpiresAt}
              onChange={(e) => setAsoExpiresAt(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              id="aso-doctor"
              label="Médico"
              value={asoDoctor}
              onChange={(e) => setAsoDoctor(e.target.value)}
            />
            <Input
              id="aso-crm"
              label="CRM"
              value={asoCrm}
              onChange={(e) => setAsoCrm(e.target.value)}
            />
          </div>
          <div>
            <p className="mb-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Arquivo (PDF ou imagem)
            </p>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700">
              <Upload size={14} />
              {asoFile ? asoFile.name : 'Selecionar arquivo'}
              <input
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(e) => setAsoFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </div>
      </Modal>

      <Modal
        open={trainingModalFor !== null}
        onClose={() => setTrainingModalFor(null)}
        title={`Treinamento - ${trainingModalFor?.full_name ?? ''}`}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setTrainingModalFor(null)}
              disabled={trSaving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveTraining} loading={trSaving}>
              Salvar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input
            id="tr-topic"
            label="Tópico"
            placeholder="Ex.: Boas Práticas, Higiene, NR-7"
            value={trTopic}
            onChange={(e) => setTrTopic(e.target.value)}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              id="tr-hours"
              label="Carga (h)"
              type="number"
              step="0.5"
              value={trHours}
              onChange={(e) => setTrHours(e.target.value)}
            />
            <Input
              id="tr-instructor"
              label="Instrutor"
              value={trInstructor}
              onChange={(e) => setTrInstructor(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              id="tr-completed"
              label="Data"
              type="date"
              value={trCompletedAt}
              onChange={(e) => setTrCompletedAt(e.target.value)}
            />
            <Input
              id="tr-expires"
              label="Validade (opcional)"
              type="date"
              value={trExpiresAt}
              onChange={(e) => setTrExpiresAt(e.target.value)}
            />
          </div>
          <div>
            <p className="mb-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Certificado (opcional)
            </p>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700">
              <Upload size={14} />
              {trFile ? trFile.name : 'Selecionar arquivo'}
              <input
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(e) => setTrFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Excluir manipulador"
        message={`Excluir ${deleting?.full_name}? Esta acao remove ASOs e treinamentos vinculados.`}
        confirmLabel="Excluir"
        loading={deleteBusy}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
