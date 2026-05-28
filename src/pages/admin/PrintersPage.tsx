import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Printer,
  Plus,
  Trash2,
  Copy,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { useAuth } from '@/context/AuthContext';
import { useCompanyScope } from '@/lib/useCompanyScope';
import {
  generateAgentToken,
  isAgentOnline,
  sha256Hex,
  type PrintAgent,
} from '@/lib/printAgent';
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
  const [pendingToken, setPendingToken] = useState<{
    agent: PrintAgent;
    token: string;
  } | null>(null);
  const [toDelete, setToDelete] = useState<PrintAgent | null>(null);

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
    const t = setInterval(() => void load(), 15_000);
    return () => clearInterval(t);
  }, [load]);

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
        <p className="text-sm text-neutral-600">Selecione uma empresa primeiro.</p>
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
            {companyName} — impressão direta sem diálogo, via agente local.
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
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
          <p className="mt-1 text-xs text-neutral-500">
            Cada estabelecimento tem suas próprias impressoras. Escolha a empresa
            para configurar as impressoras dela.
          </p>
        </Card>
      )}

      <Card>
        <details>
          <summary className="cursor-pointer text-sm font-medium text-neutral-700">
            Como funciona?
          </summary>
          <div className="mt-3 space-y-2 text-sm text-neutral-600">
            <p>
              Cadastre cada impressora aqui. Você recebe um <b>token único</b>{' '}
              (mostrado uma vez). Instale o <b>agente</b> num PC ligado à
              impressora (Node 18+), cole o token, e a impressão direta passa a
              funcionar sem diálogo.
            </p>
            <p>
              Agente:{' '}
              <code className="rounded bg-neutral-100 px-1">
                agent/print-agent.mjs
              </code>{' '}
              no repositório. Funciona com impressoras de rede (Wi-Fi/Ethernet)
              via TCP 9100 — ex.: Elgin L42PRO FULL.
            </p>
          </div>
        </details>
      </Card>

      {pendingToken && (
        <TokenReveal
          agent={pendingToken.agent}
          token={pendingToken.token}
          onClose={() => setPendingToken(null)}
        />
      )}

      {showForm && (
        <AgentForm
          companyId={companyId}
          createdBy={profile?.id ?? null}
          onCreated={(agent, token) => {
            setShowForm(false);
            setPendingToken({ agent, token });
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
            Nenhuma impressora cadastrada. Clique em “Nova impressora” para
            começar.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {agents.map((a) => (
            <AgentCard key={a.id} agent={a} onDelete={() => setToDelete(a)} />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Remover impressora"
        message={`Tem certeza que deseja remover "${toDelete?.name}"? Todos os jobs pendentes desta impressora serão apagados.`}
        confirmLabel="Remover"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}

/* ---------- Card de cada agente ---------- */
function AgentCard({
  agent,
  onDelete,
}: {
  agent: PrintAgent;
  onDelete: () => void;
}) {
  const online = isAgentOnline(agent);
  return (
    <Card>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Printer size={18} className="text-neutral-500" />
            <h2 className="truncate font-semibold text-neutral-800">
              {agent.name}
            </h2>
            {online ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                <CheckCircle2 size={12} /> Online
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">
                <XCircle size={12} /> Offline
              </span>
            )}
          </div>
          <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-xs text-neutral-600 sm:grid-cols-2">
            <div>
              <dt className="inline font-medium">Computador: </dt>
              <dd className="inline">{agent.computer_name ?? '—'}</dd>
            </div>
            <div>
              <dt className="inline font-medium">Impressora: </dt>
              <dd className="inline">
                {agent.printer_host
                  ? `${agent.printer_host}:${agent.printer_port}`
                  : 'USB (local)'}
              </dd>
            </div>
            <div>
              <dt className="inline font-medium">Etiqueta: </dt>
              <dd className="inline">
                {agent.label_width_mm}×{agent.label_height_mm} mm · {agent.dpi}{' '}
                dpi
              </dd>
            </div>
            <div>
              <dt className="inline font-medium">Última atividade: </dt>
              <dd className="inline">
                {agent.last_seen_at
                  ? new Date(agent.last_seen_at).toLocaleString('pt-BR')
                  : '—'}
              </dd>
            </div>
          </dl>
        </div>
        <Button variant="ghost" onClick={onDelete} aria-label="Remover">
          <Trash2 size={16} />
        </Button>
      </div>
    </Card>
  );
}

/* ---------- Formulário de criação ---------- */
function AgentForm({
  companyId,
  createdBy,
  onCreated,
  onCancel,
}: {
  companyId: string;
  createdBy: string | null;
  onCreated: (agent: PrintAgent, token: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [computerName, setComputerName] = useState('');
  const [printerHost, setPrinterHost] = useState('');
  const [printerPort, setPrinterPort] = useState(9100);
  const [sizeKey, setSizeKey] = useState('40x40');
  const [dpi, setDpi] = useState(203);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error('Nome obrigatório');
    setSaving(true);
    const token = generateAgentToken();
    const tokenHash = await sha256Hex(token);
    const [w, h] = sizeKey.split('x').map(Number);
    const { data, error } = await supabase
      .from('print_agents')
      .insert({
        company_id: companyId,
        name: name.trim(),
        computer_name: computerName.trim() || null,
        token_hash: tokenHash,
        printer_host: printerHost.trim() || null,
        printer_port: printerPort,
        label_width_mm: w,
        label_height_mm: h,
        dpi,
        created_by: createdBy,
      })
      .select('*')
      .single();
    setSaving(false);
    if (error) return toast.error('Erro ao salvar: ' + error.message);
    onCreated(data as PrintAgent, token);
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-3">
        <h2 className="text-sm font-semibold text-neutral-700">
          Nova impressora
        </h2>
        <Input
          label="Nome (como vai aparecer na impressão)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Elgin L42PRO — Cozinha"
          required
        />
        <Input
          label="Nome do computador (informativo)"
          value={computerName}
          onChange={(e) => setComputerName(e.target.value)}
          placeholder="PC-COZINHA"
        />
        <div className="grid grid-cols-3 gap-2">
          <Input
            label="IP / Host da impressora"
            value={printerHost}
            onChange={(e) => setPrinterHost(e.target.value)}
            placeholder="192.168.0.50"
            className="col-span-2"
          />
          <Input
            label="Porta"
            type="number"
            value={printerPort}
            onChange={(e) => setPrinterPort(Number(e.target.value) || 9100)}
          />
        </div>
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
        <p className="flex items-start gap-1 text-xs text-neutral-500">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          Deixe IP vazio se a impressora é USB; veja a seção “modo USB” no
          arquivo do agente.
        </p>
        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
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

/* ---------- Token revelado uma única vez ---------- */
function TokenReveal({
  agent,
  token,
  onClose,
}: {
  agent: PrintAgent;
  token: string;
  onClose: () => void;
}) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(token);
      toast.success('Token copiado.');
    } catch {
      toast.error('Não consegui copiar — selecione e copie manualmente.');
    }
  }
  return (
    <Card className="border-amber-300 bg-amber-50">
      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <AlertTriangle size={18} className="mt-0.5 text-amber-600" />
          <div>
            <h2 className="text-sm font-semibold text-amber-900">
              Token de “{agent.name}” — guarde agora
            </h2>
            <p className="text-xs text-amber-800">
              Este token só aparece uma vez. Cole no <code>config.json</code>{' '}
              do agente. Se perder, exclua e crie outra impressora.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded border border-amber-300 bg-white p-2">
          <code className="flex-1 overflow-x-auto text-xs">{token}</code>
          <Button variant="ghost" onClick={copy} aria-label="Copiar">
            <Copy size={14} />
          </Button>
        </div>
        <Button onClick={onClose}>Já guardei</Button>
      </div>
    </Card>
  );
}
