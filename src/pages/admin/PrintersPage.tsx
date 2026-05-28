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
  Search,
  RefreshCw,
  Download,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { useAuth } from '@/context/AuthContext';
import { useCompanyScope } from '@/lib/useCompanyScope';
import {
  generateAgentToken,
  isAgentOnline,
  setAgentPrinter,
  sha256Hex,
  type DiscoveredPrinter,
  type PrintAgent,
} from '@/lib/printAgent';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
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
  const [pickFor, setPickFor] = useState<PrintAgent | null>(null);

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
              <b>1.</b> Dê um nome e cadastre — você recebe um{' '}
              <b>token único</b> (mostrado uma vez).
            </p>
            <p>
              <b>2.</b> Instale o <b>agente</b> num PC ligado à impressora (Node
              18+) e cole o token.
            </p>
            <p>
              <b>3.</b> O agente <b>encontra as impressoras da rede sozinho</b>.
              Volte aqui, clique em “Selecionar impressora” e escolha da lista —
              sem digitar IP.
            </p>
            <p>
              Baixe o programa abaixo, abra no PC ligado à impressora, e cole o
              token quando ele pedir. Funciona com impressoras de rede
              (Wi-Fi/Ethernet) via TCP 9100 — ex.: Elgin L42PRO FULL.
            </p>
            <a
              href="/downloads/ProActive7-Agente.exe"
              download
              className="mt-1 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <Download size={16} /> Baixar agente (Windows)
            </a>
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
            <AgentCard
              key={a.id}
              agent={a}
              onDelete={() => setToDelete(a)}
              onDetect={() => setPickFor(a)}
            />
          ))}
        </div>
      )}

      {pickFor && (
        <PrinterPickerModal
          agent={pickFor}
          onClose={() => setPickFor(null)}
          onPicked={() => {
            setPickFor(null);
            void load();
          }}
        />
      )}

      <ConfirmDialog
        open={!!toDelete}
        title="Remover impressora"
        message={`Tem certeza que deseja remover "${toDelete?.name}"? Todos os jobs pendentes desta impressora serão apagados.`}
        confirmLabel="Remover"
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
  onDetect,
}: {
  agent: PrintAgent;
  onDelete: () => void;
  onDetect: () => void;
}) {
  const online = isAgentOnline(agent);
  const hasPrinter = !!agent.printer_host;
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
                {hasPrinter ? (
                  `${agent.printer_host}:${agent.printer_port}`
                ) : (
                  <span className="text-amber-600">não selecionada</span>
                )}
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
          <div className="mt-3">
            <Button
              variant={hasPrinter ? 'ghost' : 'primary'}
              onClick={onDetect}
            >
              <Search size={14} />{' '}
              {hasPrinter ? 'Trocar impressora' : 'Selecionar impressora'}
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

/* ---------- Popup: escolher a impressora detectada pelo agente ---------- */
function PrinterPickerModal({
  agent,
  onClose,
  onPicked,
}: {
  agent: PrintAgent;
  onClose: () => void;
  onPicked: () => void;
}) {
  const [printers, setPrinters] = useState<DiscoveredPrinter[]>(
    agent.discovered ?? [],
  );
  const [online, setOnline] = useState(isAgentOnline(agent));
  const [discoveredAt, setDiscoveredAt] = useState<string | null>(
    agent.discovered_at,
  );
  const [saving, setSaving] = useState<string | null>(null);

  // Recarrega a lista detectada de tempos em tempos enquanto o popup
  // estiver aberto (o agente reporta a cada ~60s).
  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('print_agents')
      .select('discovered, discovered_at, last_seen_at')
      .eq('id', agent.id)
      .single();
    if (data) {
      setPrinters((data.discovered as DiscoveredPrinter[]) ?? []);
      setDiscoveredAt(data.discovered_at as string | null);
      setOnline(isAgentOnline({ last_seen_at: data.last_seen_at as string }));
    }
  }, [agent.id]);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), 5000);
    return () => clearInterval(t);
  }, [refresh]);

  async function pick(p: DiscoveredPrinter) {
    setSaving(p.host);
    try {
      await setAgentPrinter(agent.id, p);
      toast.success(`Impressora ${p.host} selecionada.`);
      onPicked();
    } catch (e) {
      toast.error('Erro ao salvar: ' + (e as Error).message);
      setSaving(null);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Detectar impressora — ${agent.name}`}
      footer={
        <Button variant="ghost" onClick={() => void refresh()}>
          <RefreshCw size={14} /> Procurar de novo
        </Button>
      }
    >
      {!online && (
        <div className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>
            O agente deste computador está <b>offline</b>. Abra o agente no PC
            ligado à impressora (com o token deste cadastro) para que ele
            encontre as impressoras da rede.
          </span>
        </div>
      )}

      {printers.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <Spinner className="h-6 w-6" />
          <p className="text-sm text-neutral-600">
            Procurando impressoras na rede…
            <br />
            <span className="text-xs text-neutral-400">
              O agente varre a rede a cada minuto. Deixe-o rodando e aguarde.
            </span>
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-neutral-500">
            Clique na impressora que você quer usar:
          </p>
          {printers.map((p) => (
            <button
              key={`${p.host}:${p.port}`}
              onClick={() => void pick(p)}
              disabled={!!saving}
              className="flex w-full items-center gap-3 rounded-lg border border-neutral-200 p-3 text-left hover:border-emerald-400 hover:bg-emerald-50 disabled:opacity-50"
            >
              <Printer size={18} className="shrink-0 text-neutral-500" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-neutral-800">
                  {p.name ?? 'Impressora de rede'}
                </div>
                <div className="text-xs text-neutral-500">
                  {p.host}:{p.port}
                </div>
              </div>
              {saving === p.host && <Spinner className="h-4 w-4" />}
            </button>
          ))}
          {discoveredAt && (
            <p className="pt-1 text-right text-[11px] text-neutral-400">
              Última varredura:{' '}
              {new Date(discoveredAt).toLocaleTimeString('pt-BR')}
            </p>
          )}
        </div>
      )}
    </Modal>
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
        // Impressora é escolhida depois, no popup "Selecionar impressora".
        printer_host: null,
        printer_port: 9100,
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
        <details>
          <summary className="cursor-pointer text-xs text-neutral-500">
            Opções avançadas
          </summary>
          <div className="mt-2">
            <Input
              label="Nome do computador (informativo)"
              value={computerName}
              onChange={(e) => setComputerName(e.target.value)}
              placeholder="PC-COZINHA"
            />
          </div>
        </details>
        <p className="flex items-start gap-1 text-xs text-neutral-500">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          Depois de cadastrar, instale o agente no PC da impressora e clique em
          “Selecionar impressora” para escolher da lista detectada — sem digitar
          IP.
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
        <p className="text-xs text-amber-800">
          Agora baixe o agente, abra no PC da impressora e cole este token:
        </p>
        <a
          href="/downloads/ProActive7-Agente.exe"
          download
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          <Download size={16} /> Baixar agente (Windows)
        </a>
        <div>
          <Button onClick={onClose}>Já guardei</Button>
        </div>
      </div>
    </Card>
  );
}
