import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Printer,
  Plus,
  Trash2,
  AlertTriangle,
  Download,
  RefreshCw,
  Plug,
  PlugZap,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { useAuth } from '@/context/AuthContext';
import { useCompanyScope } from '@/lib/useCompanyScope';
import type { PrintAgent } from '@/lib/printAgent';
import {
  QZ_TRAY_DOWNLOAD_URL,
  connectQz,
  isQzConnected,
  listLocalPrinters,
  printZpl,
} from '@/lib/qzTray';
import { buildLabelZpl } from '@/lib/zpl';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const LABEL_SIZES = [
  { w: 40, h: 40 },
  { w: 50, h: 30 },
  { w: 60, h: 40 },
  { w: 60, h: 60 },
  { w: 80, h: 60 },
];

export function PrintersPage() {
  usePageTitle('Impressoras térmicas');
  const { profile } = useAuth();
  const { companyId, setCompanyId, companyName, companies, showAllCompanies } =
    useCompanyScope();
  const [agents, setAgents] = useState<PrintAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [toDelete, setToDelete] = useState<PrintAgent | null>(null);

  // Estado da conexão com o QZ Tray local.
  const [qzReady, setQzReady] = useState(isQzConnected());
  const [qzConnecting, setQzConnecting] = useState(false);
  const [localPrinters, setLocalPrinters] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('print_agents')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    setLoading(false);
    if (error) {
      toast.error('Erro ao listar impressoras: ' + error.message);
      return;
    }
    setAgents((data as PrintAgent[]) ?? []);
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function connectAndList() {
    setQzConnecting(true);
    try {
      await connectQz();
      const list = await listLocalPrinters();
      setLocalPrinters(list);
      setQzReady(true);
      toast.success(`QZ Tray conectado — ${list.length} impressora(s).`);
    } catch (e) {
      const msg = (e as Error)?.message ?? String(e);
      toast.error(
        'Não consegui conectar no QZ Tray. Instale-o e abra o programa.',
      );
      console.error('QZ Tray:', msg);
      setQzReady(false);
    } finally {
      setQzConnecting(false);
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    const { error } = await supabase
      .from('print_agents')
      .delete()
      .eq('id', toDelete.id);
    setToDelete(null);
    if (error) return toast.error('Erro ao excluir: ' + error.message);
    toast.success('Impressora removida.');
    void load();
  }

  if (!companyId) {
    return (
      <Card>
        <p className="text-sm text-neutral-600">
          Selecione uma empresa primeiro.
        </p>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold text-neutral-800 sm:text-2xl">
            Impressoras térmicas
          </h1>
          <p className="text-sm text-neutral-500">
            {companyName} — impressão direta pelo QZ Tray.
          </p>
        </div>
        <Button
          onClick={() => setShowForm((v) => !v)}
          disabled={!qzReady && !showForm}
        >
          <Plus size={16} /> Nova impressora
        </Button>
      </header>

      {showAllCompanies && companies.length > 1 && (
        <Card>
          <Select
            label="Estabelecimento"
            value={companyId}
            onChange={(e) => {
              setCompanyId(e.target.value);
              setShowForm(false);
            }}
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Card>
      )}

      <Card>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            {qzReady ? (
              <PlugZap size={22} className="mt-1 text-emerald-600" />
            ) : (
              <Plug size={22} className="mt-1 text-neutral-400" />
            )}
            <div>
              <h2 className="text-sm font-semibold text-neutral-800">
                {qzReady ? 'QZ Tray conectado' : 'QZ Tray não conectado'}
              </h2>
              <p className="text-xs text-neutral-500">
                {qzReady
                  ? `${localPrinters.length} impressora(s) detectada(s) neste computador.`
                  : 'Instale o QZ Tray no PC ligado à impressora, abra-o, e clique em Conectar.'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {!qzReady && (
              <a
                href={QZ_TRAY_DOWNLOAD_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                <Download size={16} /> Baixar QZ Tray
              </a>
            )}
            <Button onClick={() => void connectAndList()} disabled={qzConnecting}>
              {qzConnecting ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <RefreshCw size={16} />
              )}
              {qzReady ? 'Atualizar lista' : 'Conectar QZ Tray'}
            </Button>
          </div>
        </div>

        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-neutral-600">
            Como funciona?
          </summary>
          <div className="mt-2 space-y-2 text-xs text-neutral-600">
            <p>
              <b>1.</b> No PC ligado à impressora térmica, baixe e instale o{' '}
              <a
                href={QZ_TRAY_DOWNLOAD_URL}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-700 underline"
              >
                QZ Tray
              </a>{' '}
              (gratuito, instalador oficial e assinado — sem alerta do Defender).
            </p>
            <p>
              <b>2.</b> Abra o QZ Tray (fica como ícone na barra do Windows).
            </p>
            <p>
              <b>3.</b> Aqui no app, clique em <b>Conectar QZ Tray</b>. Na
              primeira vez o QZ vai pedir permissão para o site — clique em{' '}
              <i>Allow</i> (permitir).
            </p>
            <p>
              <b>4.</b> Cadastre cada impressora escolhendo da lista detectada e
              o tamanho da etiqueta.
            </p>
          </div>
        </details>
      </Card>

      {showForm && (
        <AgentForm
          companyId={companyId}
          createdBy={profile?.id ?? null}
          localPrinters={localPrinters}
          existingNames={agents.map((a) => a.printer_name).filter(Boolean) as string[]}
          onCreated={() => {
            setShowForm(false);
            void load();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner className="h-6 w-6" />
        </div>
      ) : agents.length === 0 ? (
        <Card>
          <p className="text-sm text-neutral-600">
            Nenhuma impressora cadastrada.{' '}
            {qzReady
              ? 'Clique em “Nova impressora” para começar.'
              : 'Conecte o QZ Tray primeiro.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {agents.map((a) => (
            <AgentCard
              key={a.id}
              agent={a}
              qzReady={qzReady}
              onDelete={() => setToDelete(a)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Remover impressora"
        message={`Tem certeza que deseja remover "${toDelete?.name}"?`}
        confirmLabel="Remover"
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

/* ---------- Card de cada impressora cadastrada ---------- */
function AgentCard({
  agent,
  qzReady,
  onDelete,
}: {
  agent: PrintAgent;
  qzReady: boolean;
  onDelete: () => void;
}) {
  const [testing, setTesting] = useState(false);

  async function testPrint() {
    if (!agent.printer_name) {
      return toast.error('Impressora sem nome do Windows definido.');
    }
    setTesting(true);
    try {
      const now = new Date();
      const fmt = (d: Date) =>
        d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
      const zpl = buildLabelZpl(
        {
          companyName: '',
          productName: 'TESTE DE IMPRESSAO',
          storageConditionLabel: 'TESTE',
          manipulationText: fmt(now),
          expiryText: fmt(new Date(Date.now() + 86_400_000)),
          responsibleName: agent.name,
          printId: 'TST-' + Date.now().toString(36).toUpperCase(),
        },
        {
          widthMm: agent.label_width_mm,
          heightMm: agent.label_height_mm,
          dpi: agent.dpi,
          copies: 1,
        },
      );
      await printZpl(agent.printer_name, zpl, 1);
      toast.success('Etiqueta de teste enviada!');
    } catch (e) {
      toast.error('Falha ao imprimir: ' + (e as Error).message);
    } finally {
      setTesting(false);
    }
  }

  return (
    <Card>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Printer size={18} className="text-neutral-500" />
            <h2 className="truncate font-semibold text-neutral-800">
              {agent.name}
            </h2>
          </div>
          <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-xs text-neutral-600 sm:grid-cols-2">
            <div>
              <dt className="inline font-medium">Impressora (Windows): </dt>
              <dd className="inline">{agent.printer_name ?? '—'}</dd>
            </div>
            <div>
              <dt className="inline font-medium">Etiqueta: </dt>
              <dd className="inline">
                {agent.label_width_mm}×{agent.label_height_mm} mm · {agent.dpi}{' '}
                dpi
              </dd>
            </div>
          </dl>
          <div className="mt-3">
            <Button
              variant="secondary"
              onClick={() => void testPrint()}
              disabled={!qzReady || testing}
            >
              {testing ? <Spinner className="h-4 w-4" /> : <Printer size={14} />}
              Imprimir teste
            </Button>
          </div>
        </div>
        <Button variant="ghost" onClick={onDelete} aria-label="Remover">
          <Trash2 size={16} />
        </Button>
      </div>
    </Card>
  );
}

/* ---------- Formulário: cadastrar uma impressora a partir da lista do QZ ---------- */
function AgentForm({
  companyId,
  createdBy,
  localPrinters,
  existingNames,
  onCreated,
  onCancel,
}: {
  companyId: string;
  createdBy: string | null;
  localPrinters: string[];
  existingNames: string[];
  onCreated: () => void;
  onCancel: () => void;
}) {
  const available = localPrinters.filter((p) => !existingNames.includes(p));
  const [printerName, setPrinterName] = useState(available[0] ?? '');
  const [name, setName] = useState('');
  const [sizeKey, setSizeKey] = useState('40x40');
  const [dpi, setDpi] = useState(203);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!printerName) return toast.error('Escolha a impressora do Windows.');
    if (!name.trim()) return toast.error('Dê um nome de exibição.');
    setSaving(true);
    const [w, h] = sizeKey.split('x').map(Number);
    // O QZ Tray não usa token; mantemos a coluna por compat com o schema.
    const tokenHash = crypto.randomUUID();
    const { error } = await supabase.from('print_agents').insert({
      company_id: companyId,
      name: name.trim(),
      printer_name: printerName,
      token_hash: tokenHash,
      label_width_mm: w,
      label_height_mm: h,
      dpi,
      created_by: createdBy,
    });
    setSaving(false);
    if (error) return toast.error('Erro ao salvar: ' + error.message);
    toast.success('Impressora cadastrada.');
    onCreated();
  }

  if (localPrinters.length === 0) {
    return (
      <Card>
        <p className="flex items-start gap-2 text-sm text-amber-700">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          Nenhuma impressora detectada no Windows. Verifique se a impressora
          está instalada (Painel de Controle → Dispositivos e Impressoras) e
          clique em <b>Atualizar lista</b>.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-3">
        <h2 className="text-sm font-semibold text-neutral-700">
          Nova impressora
        </h2>
        <Select
          label="Impressora do Windows"
          value={printerName}
          onChange={(e) => {
            setPrinterName(e.target.value);
            if (!name) setName(e.target.value);
          }}
        >
          {available.length === 0 && (
            <option value="">Todas já cadastradas</option>
          )}
          {available.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
        <Input
          label="Apelido (como vai aparecer no app)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Cozinha"
          required
        />
        <div className="grid grid-cols-2 gap-2">
          <Select
            label="Tamanho da etiqueta"
            value={sizeKey}
            onChange={(e) => setSizeKey(e.target.value)}
          >
            {LABEL_SIZES.map((s) => (
              <option key={`${s.w}x${s.h}`} value={`${s.w}x${s.h}`}>
                {s.w} × {s.h} mm
              </option>
            ))}
          </Select>
          <Select
            label="Resolução"
            value={String(dpi)}
            onChange={(e) => setDpi(Number(e.target.value))}
          >
            <option value="203">203 dpi (padrão)</option>
            <option value="300">300 dpi</option>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={saving || !printerName}>
            {saving ? 'Salvando…' : 'Cadastrar'}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </form>
    </Card>
  );
}
