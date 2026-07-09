import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  Building2,
  Boxes,
  CheckCircle2,
  ChevronRight,
  Info,
  LineChart,
  Megaphone,
  PackagePlus,
  Printer,
  Send,
  Trash2,
  Truck,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PageHeader } from '@/components/ui/PageHeader';
import { usePageTitle } from '@/lib/usePageTitle';
import { formatDateTime } from '@/lib/dates';
import {
  fetchRecentEvents,
  fetchSystemIssues,
  fetchSystemStats,
  type RecentEvent,
  type SystemIssue,
  type SystemStats,
} from '@/lib/adminDiagnostics';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { ListSkeleton } from '@/components/ui/Skeleton';

interface Organization {
  id: string;
  name: string;
}

const ACTIONS: {
  to: string;
  label: string;
  icon: LucideIcon;
  tone: 'emerald' | 'blue' | 'amber' | 'red' | 'neutral';
}[] = [
  {
    to: '/platform/organizacoes',
    label: 'Organizações',
    icon: Building2,
    tone: 'emerald',
  },
  { to: '/admin/usuarios', label: 'Usuários', icon: Users, tone: 'emerald' },
  {
    to: '/platform/comunicados',
    label: 'Comunicados',
    icon: Megaphone,
    tone: 'blue',
  },
  {
    to: '/platform/biblioteca',
    label: 'Biblioteca global',
    icon: BookOpen,
    tone: 'blue',
  },
  {
    to: '/admin/empresas',
    label: 'Empresas',
    icon: Building2,
    tone: 'neutral',
  },
  {
    to: '/admin/hardware',
    label: 'Hardware / Impressoras',
    icon: Printer,
    tone: 'neutral',
  },
  {
    to: '/admin/trilha',
    label: 'Trilha de auditoria',
    icon: Activity,
    tone: 'neutral',
  },
  {
    to: '/admin/lixeira',
    label: 'Restaurar da lixeira',
    icon: Trash2,
    tone: 'amber',
  },
];

const TONE_BG: Record<string, string> = {
  emerald:
    'bg-neutral-50 dark:bg-neutral-800/60 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800',
  blue: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-200 hover:bg-blue-100',
  amber:
    'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-200 hover:bg-amber-100',
  red: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-200 hover:bg-red-100',
  neutral:
    'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200',
};

const ISSUE_LEVEL_META: Record<
  SystemIssue['level'],
  { tone: string; icon: LucideIcon }
> = {
  error: {
    tone: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-200 border-red-200 dark:border-red-900',
    icon: AlertOctagon,
  },
  warn: {
    tone: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-200 border-amber-200 dark:border-amber-900',
    icon: AlertTriangle,
  },
  info: {
    tone: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-200 border-blue-200 dark:border-blue-900',
    icon: Info,
  },
};

export function PlatformControlPage() {
  usePageTitle('Centro de controle');

  const [stats, setStats] = useState<SystemStats | null>(null);
  const [issues, setIssues] = useState<SystemIssue[]>([]);
  const [events, setEvents] = useState<RecentEvent[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  const [pushOpen, setPushOpen] = useState(false);
  const [pushOrg, setPushOrg] = useState('');
  const [pushTitle, setPushTitle] = useState('Teste do administrador');
  const [pushBody, setPushBody] = useState(
    'Notificação de teste enviada pelo Centro de Controle.',
  );
  const [pushSending, setPushSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, is, ev, orgRes] = await Promise.all([
        fetchSystemStats(),
        fetchSystemIssues(),
        fetchRecentEvents(10),
        supabase
          .from('organizations')
          .select('id, name')
          .is('deleted_at', null)
          .order('name'),
      ]);
      setStats(s);
      setIssues(is);
      setEvents(ev);
      setOrgs((orgRes.data as Organization[] | null) ?? []);
    } catch (e) {
      toast.error('Erro ao carregar painel: ' + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSendPush() {
    if (!pushOrg) {
      toast.error('Escolha uma organização.');
      return;
    }
    if (!pushTitle.trim() || !pushBody.trim()) {
      toast.error('Título e mensagem são obrigatórios.');
      return;
    }
    setPushSending(true);
    const { error } = await supabase.functions.invoke('admin-push-org', {
      body: { organization_id: pushOrg, title: pushTitle, body: pushBody },
    });
    setPushSending(false);
    if (error) {
      toast.error('Falha no push: ' + error.message);
      return;
    }
    toast.success('Push enviado.');
    setPushOpen(false);
  }

  const healthLabel =
    issues.length === 0
      ? 'Tudo em conformidade'
      : `${issues.length} ${issues.length === 1 ? 'problema detectado' : 'problemas detectados'}`;
  const healthTone =
    issues.length === 0
      ? 'bg-neutral-50 dark:bg-neutral-800/60 text-neutral-700 dark:text-neutral-200'
      : issues.some((i) => i.level === 'error')
        ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-200'
        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-200';
  const HealthIcon = issues.length === 0 ? CheckCircle2 : AlertTriangle;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Centro de controle"
        subtitle="Saúde da plataforma, diagnóstico e atalhos de administrador."
        actions={
          <div
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${healthTone}`}
          >
            <HealthIcon size={18} />
            {healthLabel}
          </div>
        }
      />

      {loading ? (
        <ListSkeleton rows={5} />
      ) : (
        <>
          {/* KPIs */}
          {stats && (
            <section className="mb-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <KpiCard
                icon={LineChart}
                tone="emerald"
                label="Organizações"
                value={stats.orgsTotal}
              />
              <KpiCard
                icon={Building2}
                tone="emerald"
                label="Empresas ativas"
                value={stats.companiesActive}
              />
              <KpiCard
                icon={Users}
                tone="emerald"
                label="Usuários ativos"
                value={stats.usersActive}
              />
              <KpiCard
                icon={Printer}
                tone="blue"
                label="Etiquetas 7d"
                value={stats.labelsPrinted7d}
              />
              <KpiCard
                icon={PackagePlus}
                tone="blue"
                label="Recebimentos 7d"
                value={stats.receivings7d}
              />
              <KpiCard
                icon={Boxes}
                tone="blue"
                label="Mov. estoque 7d"
                value={stats.stockMovements7d}
              />
            </section>
          )}

          {/* Diagnóstico */}
          <section className="mb-4">
            <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              Diagnóstico
            </h2>
            {issues.length === 0 ? (
              <Card>
                <div className="flex items-center gap-3 text-sm text-neutral-700 dark:text-neutral-200">
                  <CheckCircle2 size={18} />
                  Nenhum problema detectado nas verificações automáticas.
                </div>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {issues.map((i) => {
                  const meta = ISSUE_LEVEL_META[i.level];
                  const Icon = meta.icon;
                  return (
                    <div
                      key={i.key}
                      className={`rounded-lg border p-3 ${meta.tone}`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Icon size={16} />
                          <span className="text-sm font-semibold">
                            {i.title}
                          </span>
                        </div>
                        <span className="rounded bg-white/60 px-2 py-0.5 text-xs font-medium">
                          {i.count}
                        </span>
                      </div>
                      {i.examples && i.examples.length > 0 && (
                        <ul className="mb-2 space-y-0.5 text-xs">
                          {i.examples.map((ex, idx) => (
                            <li key={idx} className="truncate">
                              • {ex.label}
                            </li>
                          ))}
                        </ul>
                      )}
                      {i.fixHref && (
                        <Link
                          to={i.fixHref}
                          className="inline-flex items-center gap-1 text-xs font-medium underline-offset-2 hover:underline"
                        >
                          Resolver
                          <ArrowUpRight size={12} />
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Ações rápidas */}
          <section className="mb-4">
            <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              Ações rápidas
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ACTIONS.map((a) => {
                const Icon = a.icon;
                return (
                  <Link
                    key={a.to}
                    to={a.to}
                    className={`flex flex-col items-start gap-2 rounded-lg p-3 text-sm transition ${TONE_BG[a.tone]}`}
                  >
                    <Icon size={18} />
                    <span className="font-medium">{a.label}</span>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Ferramentas de teste */}
          <section className="mb-4">
            <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              Ferramentas de teste
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Card>
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-300">
                    <Send size={18} />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                      Push de teste para organização
                    </p>
                    <p className="mb-2 text-xs text-neutral-500 dark:text-neutral-400">
                      Confirma se as inscrições push estão funcionando para os
                      usuários da org.
                    </p>
                    <Button size="sm" onClick={() => setPushOpen(true)}>
                      Enviar push
                    </Button>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300">
                    <Printer size={18} />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                      Testar impressão de etiqueta
                    </p>
                    <p className="mb-2 text-xs text-neutral-500 dark:text-neutral-400">
                      Abre o modo wizard com uma empresa selecionada para você
                      conferir como sai uma etiqueta em produção.
                    </p>
                    <Link to="/imprimir/novo">
                      <Button size="sm" variant="secondary">
                        Abrir wizard
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300">
                    <Truck size={18} />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                      Testar fluxo de recebimento
                    </p>
                    <p className="mb-2 text-xs text-neutral-500 dark:text-neutral-400">
                      Vai para o cadastro de fornecedores e em seguida ao
                      registro de recebimento para validar a cadeia até o
                      estoque.
                    </p>
                    <Link to="/fornecedores">
                      <Button size="sm" variant="secondary">
                        Abrir fornecedores
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
                    <Activity size={18} />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                      Atualizar diagnóstico
                    </p>
                    <p className="mb-2 text-xs text-neutral-500 dark:text-neutral-400">
                      Reroda todas as verificações deste painel.
                    </p>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => void load()}
                    >
                      Recarregar
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </section>

          {/* Última atividade */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                Última atividade
              </h2>
              <Link
                to="/admin/trilha"
                className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-800"
              >
                Ver tudo <ChevronRight size={14} />
              </Link>
            </div>
            {events.length === 0 ? (
              <Card>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Sem eventos registrados.
                </p>
              </Card>
            ) : (
              <Card>
                <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {events.map((e) => (
                    <li key={e.id} className="flex items-center gap-3 py-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                          e.op === 'INSERT'
                            ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200'
                            : e.op === 'UPDATE'
                              ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200'
                              : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-200'
                        }`}
                      >
                        {e.op}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-neutral-800 dark:text-neutral-100">
                          {e.table}{' '}
                          {e.actor && (
                            <span className="text-neutral-400">
                              · {e.actor}
                            </span>
                          )}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-neutral-400">
                        {formatDateTime(e.at)}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </section>
        </>
      )}

      {/* Modal push */}
      <Modal
        open={pushOpen}
        onClose={() => setPushOpen(false)}
        title="Enviar push de teste"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setPushOpen(false)}
              disabled={pushSending}
            >
              Cancelar
            </Button>
            <Button onClick={handleSendPush} loading={pushSending}>
              Enviar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Select
            label="Organização"
            value={pushOrg}
            onChange={(e) => setPushOrg(e.target.value)}
          >
            <option value="">Selecione...</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
          <Input
            id="push-title"
            label="Título"
            value={pushTitle}
            onChange={(e) => setPushTitle(e.target.value)}
          />
          <Input
            id="push-body"
            label="Mensagem"
            value={pushBody}
            onChange={(e) => setPushBody(e.target.value)}
          />
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Vai para todos os usuários da organização que tenham push habilitado
            no app.
          </p>
        </div>
      </Modal>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  tone: 'emerald' | 'blue';
}) {
  const toneClasses =
    tone === 'emerald'
      ? 'bg-neutral-50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-300'
      : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300';
  return (
    <Card>
      <div className="flex items-center gap-3">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneClasses}`}
        >
          <Icon size={18} />
        </span>
        <div>
          <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            {label}
          </p>
          <p className="text-2xl font-semibold text-neutral-800 dark:text-neutral-100">
            {value.toLocaleString('pt-BR')}
          </p>
        </div>
      </div>
    </Card>
  );
}
