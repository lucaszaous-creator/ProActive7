import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Printer,
  Plus,
  Trash2,
  AlertTriangle,
  Download,
  CheckCircle2,
  XCircle,
  FileText,
  Copy,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { useAuth } from '@/context/AuthContext';
import { useCompanyScope } from '@/lib/useCompanyScope';
import {
  generateAgentToken,
  isAgentOnline,
  queueDirectPrint,
  sha256Hex,
  type PrintAgent,
  type RelayLog,
} from '@/lib/printAgent';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageHeader } from '@/components/ui/PageHeader';

const LABEL_SIZES = [
  { w: 40, h: 40 },
  { w: 50, h: 30 },
  { w: 60, h: 40 },
  { w: 60, h: 60 },
  { w: 80, h: 60 },
];

const isVirtualPrinter = (name: string | null): boolean =>
  !!name &&
  /(pdf|xps|onenote|fax|microsoft (print|document)|send to|document writer)/i.test(
    name,
  );

export function PrintersPage() {
  usePageTitle('Impressoras térmicas');
  const { profile } = useAuth();
  const { companyId, setCompanyId, companyName, companies, showAllCompanies } =
    useCompanyScope();
  const [agents, setAgents] = useState<PrintAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [toDelete, setToDelete] = useState<PrintAgent | null>(null);
  const [revealedToken, setRevealedToken] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!companyId) return;
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
    setLoading(true);
    void load();
    // Atualiza status online/offline do relay ao vivo.
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
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Selecione uma empresa primeiro.
        </p>
      </Card>
    );
  }

  // Nomes de impressoras detectadas pelo relay (Get-Printer), p/ sugestão.
  // Filtra impressoras virtuais (PDF/XPS/OneNote/Fax) — não imprimem etiqueta.
  const discoveredNames = Array.from(
    new Set(
      agents.flatMap((a) =>
        (a.discovered ?? []).map((d) => d.name).filter(Boolean),
      ),
    ),
  ).filter((n) => !isVirtualPrinter(n));

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageHeader
        title="Impressoras térmicas"
        subtitle={`${companyName} — impressão automática via relay no PC.`}
        actions={
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus size={16} /> Nova impressora
          </Button>
        }
      />

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
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Cada estabelecimento tem suas próprias impressoras.
          </p>
        </Card>
      )}

      <Card className="border-violet-300 bg-violet-50">
        <details open={agents.length === 0}>
          <summary className="cursor-pointer text-sm font-semibold text-violet-900">
            🤖 Como funciona (instalação em 1 PC, uma vez)
          </summary>
          <div className="mt-3 space-y-2 text-xs text-violet-800">
            <p>
              A impressão é feita por um pequeno <b>relay</b> que roda em
              segundo plano no PC ligado à impressora. Não precisa de navegador
              aberto, nem instalar programa pesado — usa o PowerShell que já vem
              no Windows.
            </p>
            <p>
              <b>1.</b> Clique em <b>“Nova impressora”</b>, dê um apelido,
              informe o nome exato da impressora no Windows e salve.
            </p>
            <p>
              <b>2.</b> Copie o <b>token</b> que aparece e baixe o instalador.
            </p>
            <p>
              <b>3.</b> Rode o instalador no PC da cozinha, cole o token. Pronto
              — o relay inicia sozinho com o Windows e imprime tudo que vier do
              celular, tablet ou PC.
            </p>
            <a
              href="/instalar-relay.bat"
              download
              className="mt-1 inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700"
            >
              <Download size={14} /> Baixar instalador do relay
            </a>
          </div>
        </details>
      </Card>

      {showForm && (
        <AgentForm
          companyId={companyId}
          createdBy={profile?.id ?? null}
          suggestions={discoveredNames}
          onCreated={(token) => {
            setShowForm(false);
            setRevealedToken(token);
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
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
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
              companyId={companyId}
              createdBy={profile?.id ?? null}
              onDelete={() => setToDelete(a)}
            />
          ))}
        </div>
      )}

      {revealedToken && (
        <TokenReveal
          token={revealedToken}
          onClose={() => setRevealedToken(null)}
        />
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
  companyId,
  createdBy,
  onDelete,
}: {
  agent: PrintAgent;
  companyId: string;
  createdBy: string | null;
  onDelete: () => void;
}) {
  const [testing, setTesting] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const relayOnline = isAgentOnline(agent);
  const virtual = isVirtualPrinter(agent.printer_name);

  async function testPrint() {
    if (!agent.printer_name) {
      return toast.error('Impressora sem nome do Windows definido.');
    }
    setTesting(true);
    try {
      const now = new Date();
      const fmt = (d: Date) =>
        d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
      await queueDirectPrint({
        agent,
        labelData: {
          companyName: '',
          productName: 'TESTE DE IMPRESSAO',
          storageConditionLabel: 'TESTE',
          manipulationText: fmt(now),
          expiryText: fmt(new Date(Date.now() + 86_400_000)),
          responsibleName: agent.name,
          printId: 'TST-' + Date.now().toString(36).toUpperCase(),
        },
        widthMm: agent.label_width_mm,
        heightMm: agent.label_height_mm,
        copies: 1,
        companyId,
        createdBy,
      });
      toast.success(
        'Teste enfileirado! Sai em segundos se o relay estiver online.',
      );
    } catch (e) {
      toast.error('Falha: ' + ((e as Error)?.message ?? String(e)));
    } finally {
      setTesting(false);
    }
  }

  return (
    <Card>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Printer
              size={18}
              className="text-neutral-500 dark:text-neutral-400"
            />
            <h2 className="truncate font-semibold text-neutral-800 dark:text-neutral-100">
              {agent.name}
            </h2>
            {relayOnline ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-neutral-50 dark:bg-neutral-800/60 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:text-neutral-200">
                <CheckCircle2 size={12} /> Relay online
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                <XCircle size={12} /> Relay offline
              </span>
            )}
          </div>
          <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-xs text-neutral-600 dark:text-neutral-300 sm:grid-cols-2">
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
            <div>
              <dt className="inline font-medium">Última atividade: </dt>
              <dd className="inline">
                {agent.last_seen_at
                  ? new Date(agent.last_seen_at).toLocaleString('pt-BR')
                  : 'nunca'}
              </dd>
            </div>
            <div>
              <dt className="inline font-medium">Versão do relay: </dt>
              <dd className="inline">{agent.relay_version ?? '—'}</dd>
            </div>
          </dl>
          {virtual && (
            <p className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 p-2 text-xs text-amber-800 dark:text-amber-200">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              Esta parece uma impressora <b>virtual</b> (PDF/XPS). ZPL não
              funciona aqui — a etiqueta sai em branco. Use uma térmica real
              (Elgin, Zebra, etc).
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => void testPrint()}
              disabled={testing || !agent.printer_name}
            >
              {testing ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <Printer size={14} />
              )}
              Imprimir teste
            </Button>
            <Button variant="ghost" onClick={() => setShowLogs((v) => !v)}>
              <FileText size={14} /> {showLogs ? 'Ocultar logs' : 'Ver logs'}
            </Button>
          </div>
          {showLogs && <RelayLogList agentId={agent.id} />}
        </div>
        <Button variant="ghost" onClick={onDelete} aria-label="Remover">
          <Trash2 size={16} />
        </Button>
      </div>
    </Card>
  );
}

/* ---------- Formulário: cadastrar uma impressora ---------- */
function AgentForm({
  companyId,
  createdBy,
  suggestions,
  onCreated,
  onCancel,
}: {
  companyId: string;
  createdBy: string | null;
  suggestions: string[];
  onCreated: (token: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [printerName, setPrinterName] = useState(suggestions[0] ?? '');
  const [sizeKey, setSizeKey] = useState('40x40');
  const [dpi, setDpi] = useState(203);
  const [language, setLanguage] = useState<'zpl' | 'escpos'>('zpl');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error('Dê um apelido pra impressora.');
    if (!printerName.trim()) {
      return toast.error('Informe o nome da impressora no Windows.');
    }
    setSaving(true);
    const [w, h] = sizeKey.split('x').map(Number);
    // Gera token real; guarda só o hash. O token cru aparece uma vez.
    const token = generateAgentToken();
    const tokenHash = await sha256Hex(token);
    const { error } = await supabase.from('print_agents').insert({
      company_id: companyId,
      name: name.trim(),
      printer_name: printerName.trim(),
      token_hash: tokenHash,
      label_width_mm: w,
      label_height_mm: h,
      dpi,
      language,
      created_by: createdBy,
    });
    setSaving(false);
    if (error) return toast.error('Erro ao salvar: ' + error.message);
    toast.success('Impressora cadastrada.');
    onCreated(token);
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-3">
        <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
          Nova impressora
        </h2>
        <Input
          label="Apelido (como vai aparecer no app)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Cozinha"
          required
        />
        <div>
          <Input
            label="Nome exato da impressora no Windows"
            value={printerName}
            onChange={(e) => setPrinterName(e.target.value)}
            placeholder="Elgin L42PRO"
            list="printer-suggestions"
            required
          />
          {suggestions.length > 0 && (
            <datalist id="printer-suggestions">
              {suggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          )}
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Copie o nome igual aparece em{' '}
            <b>
              Configurações → Bluetooth e dispositivos → Impressoras e scanners
            </b>{' '}
            no PC. Depois que o relay rodar a primeira vez, os nomes detectados
            viram sugestões aqui.
          </p>
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
        <div>
          <Select
            label="Tipo de impressora"
            value={language}
            onChange={(e) => setLanguage(e.target.value as 'zpl' | 'escpos')}
          >
            <option value="zpl">ZPL — Zebra / Elgin L42 (etiqueta)</option>
            <option value="escpos">ESC/POS — térmica 58/80 mm</option>
          </Select>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            Escolha conforme o modelo. ZPL é o padrão das impressoras de
            etiqueta; ESC/POS são as térmicas de cupom 58/80 mm. ESC/POS exige o
            relay atualizado (v3+).
          </p>
        </div>
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

/* ---------- Modal de revelação do token (uma única vez) ---------- */
function TokenReveal({
  token,
  onClose,
}: {
  token: string;
  onClose: () => void;
}) {
  async function copyToken() {
    try {
      await navigator.clipboard.writeText(token);
      toast.success('Token copiado.');
    } catch {
      toast.error('Não consegui copiar — selecione e copie manualmente.');
    }
  }
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg space-y-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-2">
          <AlertTriangle
            size={20}
            className="mt-0.5 text-amber-600 dark:text-amber-300"
          />
          <div>
            <h2 className="text-base font-semibold text-amber-900 dark:text-amber-200">
              Token da impressora — guarde AGORA
            </h2>
            <p className="text-xs text-amber-800 dark:text-amber-200">
              Este token só aparece uma vez. O instalador do relay pede ele pra
              autenticar. Se perder, exclua a impressora e cadastre de novo.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 dark:border-amber-900 bg-white p-2">
          <code className="flex-1 overflow-x-auto break-all text-xs">
            {token}
          </code>
          <Button variant="ghost" onClick={copyToken} aria-label="Copiar">
            <Copy size={14} />
          </Button>
        </div>
        <div className="rounded-lg border border-violet-300 bg-violet-50 p-3 text-xs text-violet-900">
          <p className="font-semibold">Próximo passo:</p>
          <ol className="mt-1 list-decimal space-y-1 pl-4">
            <li>Baixe o instalador e leve pro PC da impressora:</li>
            <li>
              <a
                href="/instalar-relay.bat"
                download
                className="inline-flex items-center gap-1 rounded bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700"
              >
                <Download size={12} /> Baixar instalar-relay.bat
              </a>
            </li>
            <li>Rode o .bat e cole esse token quando ele pedir.</li>
            <li>O relay inicia sozinho e imprime tudo da fila.</li>
          </ol>
        </div>
        <Button onClick={onClose} className="w-full">
          Já guardei o token
        </Button>
      </div>
    </div>
  );
}

/* ---------- Lista de logs do relay (erros centralizados) ---------- */
function RelayLogList({ agentId }: { agentId: string }) {
  const [logs, setLogs] = useState<RelayLog[] | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('relay_logs')
      .select('*')
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(30);
    if (error) {
      toast.error('Erro ao carregar logs: ' + error.message);
      setLogs([]);
      return;
    }
    setLogs((data as RelayLog[]) ?? []);
  }, [agentId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (logs === null) {
    return (
      <div className="mt-2 flex justify-center py-3">
        <Spinner className="h-4 w-4" />
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <p className="mt-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 p-2 text-xs text-neutral-500 dark:text-neutral-400">
        Nenhum log ainda. O relay registra erros e eventos aqui assim que rodar.
      </p>
    );
  }

  const color = (lvl: string) =>
    lvl === 'error'
      ? 'text-red-700 dark:text-red-200'
      : lvl === 'warn'
        ? 'text-amber-700 dark:text-amber-200'
        : 'text-neutral-600 dark:text-neutral-300';

  return (
    <div className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-lg bg-neutral-50 dark:bg-neutral-800/60 p-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
          Últimos {logs.length} eventos
        </span>
        <button
          onClick={() => void load()}
          className="text-xs text-neutral-700 dark:text-neutral-200 hover:underline"
        >
          Atualizar
        </button>
      </div>
      {logs.map((l) => (
        <div key={l.id} className="text-[11px] leading-tight">
          <span className="text-neutral-400">
            {new Date(l.created_at).toLocaleString('pt-BR')}{' '}
          </span>
          <span className={`font-medium uppercase ${color(l.level)}`}>
            [{l.level}]
          </span>{' '}
          <span className="text-neutral-700 dark:text-neutral-200">
            {l.message}
          </span>
        </div>
      ))}
    </div>
  );
}
