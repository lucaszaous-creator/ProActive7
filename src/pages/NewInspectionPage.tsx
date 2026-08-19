import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarPlus,
  Check,
  ClipboardCheck,
  ClipboardList,
  Globe,
  Plus,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { useAuth } from '@/context/AuthContext';
import { useCompanyScope } from '@/lib/useCompanyScope';
import type { AuditStatus, AuditTemplate } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/PageHeader';

/**
 * Fluxo guiado da vistoria (pedido da Ariane): a nutri chega no local,
 * escolhe a empresa, escolhe o checklist e começa a avaliar — sem passar
 * por agendamento. Se não houver modelo, o caminho para criar um está a
 * um clique. Visitas agendadas para o futuro continuam em /visitas.
 */
export function NewInspectionPage() {
  usePageTitle('Nova vistoria');
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { companies } = useCompanyScope();

  const [templates, setTemplates] = useState<AuditTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [companyId, setCompanyId] = useState('');
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('audit_templates')
      .select('*')
      .order('name')
      .limit(200)
      .then(({ data, error }) => {
        setLoadingTemplates(false);
        if (error) {
          toast.error('Erro ao carregar modelos: ' + error.message);
          return;
        }
        setTemplates((data as AuditTemplate[] | null) ?? []);
      });
  }, []);

  const company = companies.find((c) => c.id === companyId) ?? null;

  // Modelos que valem para a empresa escolhida: da organização inteira,
  // específicos dela ou oficiais da plataforma. Desativados ficam de fora.
  const availableTemplates = useMemo(
    () =>
      templates.filter(
        (t) =>
          t.active !== false && (!t.company_id || t.company_id === companyId),
      ),
    [templates, companyId],
  );

  async function startInspection(template: AuditTemplate) {
    if (!companyId) return;
    setStarting(template.id);
    // Nasce agendada para agora; ao responder a primeira pergunta a visita
    // vira "em andamento" sozinha (comportamento do AuditDetailPage).
    const { data, error } = await supabase
      .from('audits')
      .insert({
        company_id: companyId,
        template_id: template.id,
        scheduled_at: new Date().toISOString(),
        auditor_id: profile?.id,
        status: 'scheduled' as AuditStatus,
        recurrence_months: null,
      })
      .select('id')
      .single();
    setStarting(null);
    if (error || !data) {
      toast.error(
        'Erro ao iniciar a vistoria: ' + (error?.message ?? 'sem retorno'),
      );
      return;
    }
    toast.success(`Vistoria iniciada em ${company?.name ?? 'empresa'}.`);
    navigate(`/visitas/${data.id}`);
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        to="/visitas"
        className="mb-2 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400"
      >
        <ArrowLeft size={14} />
        Visitas técnicas
      </Link>

      <PageHeader
        title="Nova vistoria"
        subtitle="Escolha a empresa, escolha o checklist e comece a avaliar. Para agendar uma visita futura, use Visitas técnicas."
      />

      {/* Passo 1 — empresa */}
      <Card className="mb-4">
        <p className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
          1. Onde você está?
        </p>
        {companies.length === 0 ? (
          <p className="py-2 text-sm text-neutral-500 dark:text-neutral-400">
            Nenhuma empresa cadastrada ainda. Cadastre em Administração →
            Empresas.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {companies.map((c) => {
              const selected = c.id === companyId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCompanyId(c.id)}
                  className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                    selected
                      ? 'border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900'
                      : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200'
                  }`}
                >
                  {selected ? (
                    <Check size={16} className="shrink-0" />
                  ) : (
                    <Building2 size={16} className="shrink-0 opacity-60" />
                  )}
                  <span className="min-w-0 truncate font-medium">{c.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* Passo 2 — checklist */}
      {companyId ? (
        <Card>
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
              2. Qual checklist você vai usar?
            </p>
            <Link
              to="/visitas/modelos"
              className="text-xs font-medium text-neutral-500 hover:text-neutral-800 hover:underline dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              Gerenciar modelos
            </Link>
          </div>

          {loadingTemplates ? (
            <ListSkeleton rows={3} />
          ) : availableTemplates.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Você ainda não tem um checklist de vistoria"
              description="Monte o seu primeiro modelo em seções — depois é só voltar aqui e começar a avaliação."
              action={
                <Button onClick={() => navigate('/visitas/modelos')}>
                  <Plus size={18} />
                  Criar meu modelo
                </Button>
              }
            />
          ) : (
            <div className="flex flex-col gap-2">
              {availableTemplates.map((t) => {
                const sections = new Set(
                  (t.items ?? []).map((i) => i.category),
                );
                const busy = starting === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => void startInspection(t)}
                    disabled={starting !== null}
                    className="group flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left transition hover:border-neutral-400 hover:shadow-sm disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-500"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-neutral-800 dark:text-neutral-100">
                        <span className="truncate">{t.name}</span>
                        {t.is_global ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                            <Globe size={10} />
                            Modelo oficial
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                        {(t.items ?? []).length} perguntas · {sections.size}{' '}
                        {sections.size === 1 ? 'seção' : 'seções'}
                      </p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white transition group-hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900">
                      {busy ? 'Iniciando…' : 'Começar'}
                      {!busy ? <ArrowRight size={13} /> : null}
                    </span>
                  </button>
                );
              })}
              <Link
                to="/visitas/modelos"
                className="mt-1 inline-flex items-center gap-1.5 self-start rounded-lg border border-dashed border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-600 hover:border-neutral-500 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                <Plus size={14} />
                Criar um modelo novo
              </Link>
            </div>
          )}
        </Card>
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-neutral-300 p-4 text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
          <ClipboardCheck size={16} />
          Selecione a empresa acima para ver os checklists disponíveis.
        </div>
      )}

      <p className="mt-4 flex items-center gap-1.5 text-xs text-neutral-400 dark:text-neutral-500">
        <CalendarPlus size={13} />
        Precisa marcar uma visita para outro dia? Use "Agendar visita" em
        Visitas técnicas.
      </p>
    </div>
  );
}
