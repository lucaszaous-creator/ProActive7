import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useCompanyScope } from '@/lib/useCompanyScope';
import { usePageTitle } from '@/lib/usePageTitle';
import {
  aggregatePortfolioStats,
  countUpcomingAudits14d,
  fetchEquipmentWithoutReadingToday,
  fetchPendingChecklistsToday,
  fetchPortfolio,
  fetchRecentActivity,
  fetchUpcomingAudits,
  saveComplianceSnapshots,
  type ActivityItem,
  type EnrichedCompany,
  type PendingChecklist,
  type PendingEquipment,
  type UpcomingAudit,
} from '@/lib/dashboardQueries';
import { HeroGreeting } from '@/components/dashboard/HeroGreeting';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { MobileCollapsible } from '@/components/dashboard/MobileCollapsible';
import { InstallPrompt } from '@/components/InstallPrompt';
import { MasterKPIs } from '@/components/dashboard/MasterKPIs';
import { PortfolioSummary } from '@/components/dashboard/PortfolioSummary';
import { UpcomingAudits } from '@/components/dashboard/UpcomingAudits';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { PropertyTodayTasks } from '@/components/dashboard/PropertyTodayTasks';
import { NutriAlerts } from '@/components/dashboard/NutriAlerts';
import { ScoreTrend } from '@/components/dashboard/ScoreTrend';

interface ExpiringLabel {
  id: string;
  product_name_snapshot: string;
  expiry_at: string;
}

async function fetchExpiringLabels(): Promise<ExpiringLabel[]> {
  const now = new Date().toISOString();
  const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('label_prints')
    .select('id, product_name_snapshot, expiry_at')
    .gte('expiry_at', now)
    .lt('expiry_at', in24h)
    .order('expiry_at')
    .limit(10);
  if (error) throw error;
  return (data as ExpiringLabel[] | null) ?? [];
}

export function DashboardPage() {
  usePageTitle('Painel');
  const { isMaster, isNutritionist, profile } = useAuth();
  const { companyId, companyName, companyLogoUrl } = useCompanyScope();
  const showPortfolio = isMaster || isNutritionist;

  // Master state
  const [portfolio, setPortfolio] = useState<EnrichedCompany[] | null>(null);
  const [upcomingAudits, setUpcomingAudits] = useState<UpcomingAudit[]>([]);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  // Property state
  const [pendingChecklists, setPendingChecklists] = useState<
    PendingChecklist[]
  >([]);
  const [pendingEquipment, setPendingEquipment] = useState<PendingEquipment[]>(
    [],
  );
  const [expiringLabels, setExpiringLabels] = useState<ExpiringLabel[]>([]);
  const [propertyLoading, setPropertyLoading] = useState(true);

  const [masterLoading, setMasterLoading] = useState(true);

  // ----- Master / Nutricionist fetch (portfolio scoped by RLS) -----
  useEffect(() => {
    if (!showPortfolio) {
      setMasterLoading(false);
      return;
    }
    let cancelled = false;
    setMasterLoading(true);
    Promise.all([
      fetchPortfolio(),
      countUpcomingAudits14d(),
      fetchUpcomingAudits(5, 14),
      fetchRecentActivity(10),
    ])
      .then(([pf, count, upc, act]) => {
        if (cancelled) return;
        setPortfolio(pf);
        setUpcomingCount(count);
        setUpcomingAudits(upc);
        setActivity(act);
        // Registra o snapshot diário do score (fire-and-forget) — alimenta
        // a curva "Evolução do compliance" sem cron pago.
        void saveComplianceSnapshots(pf);
      })
      .catch((e: Error) => {
        if (!cancelled) {
          toast.error('Erro ao carregar painel: ' + e.message);
          setPortfolio([]);
        }
      })
      .finally(() => {
        if (!cancelled) setMasterLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showPortfolio]);

  // ----- Tarefas da empresa ATIVA -----
  // Roda para todo mundo, não só para a cozinha: desde que o app passou a
  // ter uma empresa por vez, a nutricionista também abre o painel "dentro"
  // de uma empresa e precisa ver as pendências dela.
  useEffect(() => {
    if (!companyId) {
      setPropertyLoading(false);
      return;
    }
    let cancelled = false;
    setPropertyLoading(true);
    Promise.all([
      fetchPendingChecklistsToday(companyId),
      fetchEquipmentWithoutReadingToday(companyId),
      fetchExpiringLabels(),
    ])
      .then(([cl, eq, lbl]) => {
        if (cancelled) return;
        setPendingChecklists(cl);
        setPendingEquipment(eq);
        setExpiringLabels(lbl);
      })
      .catch((e: Error) => {
        if (!cancelled) toast.error('Erro ao carregar painel: ' + e.message);
      })
      .finally(() => {
        if (!cancelled) setPropertyLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showPortfolio, companyId]);

  // ----- Master derived -----
  const stats = portfolio
    ? {
        ...aggregatePortfolioStats(portfolio),
        upcomingAudits14d: upcomingCount,
      }
    : null;

  const masterSummary =
    stats == null
      ? undefined
      : stats.critical === 0
        ? `${stats.total} empresa${stats.total === 1 ? '' : 's'} · tudo em conformidade`
        : `${stats.total} empresa${stats.total === 1 ? '' : 's'} · ${stats.critical} crítica${stats.critical === 1 ? '' : 's'}`;

  // Sem empresa ativa não há o que resumir — dizer "tudo em dia" quando
  // não existe empresa nenhuma seria mentira tranquilizadora.
  const propertySummary =
    propertyLoading || !companyId
      ? undefined
      : (() => {
          const tasks = pendingChecklists.length + pendingEquipment.length;
          if (tasks === 0 && expiringLabels.length === 0)
            return 'Tudo em dia por hoje';
          return `${tasks} tarefa${tasks === 1 ? '' : 's'} hoje${
            expiringLabels.length > 0
              ? ` · ${expiringLabels.length} etiqueta${expiringLabels.length === 1 ? '' : 's'} vencendo`
              : ''
          }`;
        })();

  return (
    <div className="mx-auto max-w-6xl">
      {/* Primeiro de tudo no celular: sem o app instalado, offline e
          notificação nem existem para essa pessoa. */}
      <InstallPrompt />

      {/* Uma empresa por vez (decisão do Lucas, olhando o app concorrente).
          Antes a nutri via a carteira inteira aqui e nenhuma empresa em
          destaque; agora o painel é DENTRO da empresa ativa, e a carteira
          fica no bloco recolhível abaixo. Trocar de empresa é o seletor no
          topo do app. */}
      <HeroGreeting
        fullName={profile?.full_name}
        email={profile?.email}
        companyName={companyName || null}
        companyLogoUrl={companyLogoUrl}
        summary={propertySummary ?? masterSummary}
        summaryAccent={
          pendingChecklists.length + pendingEquipment.length === 0 &&
          expiringLabels.length === 0
            ? 'teal'
            : 'amber'
        }
      />

      <QuickActions isMaster={showPortfolio} />

      {showPortfolio ? (
        <>
          {/* Ordem: a empresa que está na tela primeiro, depois a
              carteira. Indicadores e histórico são leitura — no celular
              saem da frente (um toque os traz de volta), no desktop
              seguem visíveis como antes. */}
          {companyId ? (
            <PropertyTodayTasks
              loading={propertyLoading}
              pendingChecklists={pendingChecklists}
              pendingEquipment={pendingEquipment}
              expiringLabels={expiringLabels}
              asoAlertsCount={0}
            />
          ) : null}
          {isNutritionist && <NutriAlerts />}
          <UpcomingAudits loading={masterLoading} items={upcomingAudits} />

          <MobileCollapsible
            title="Indicadores da carteira"
            subtitle={masterSummary}
          >
            {stats ? <MasterKPIs stats={stats} /> : null}
            <ScoreTrend />
            <PortfolioSummary
              loading={masterLoading}
              companies={portfolio ?? []}
            />
            <RecentActivity loading={masterLoading} items={activity} />
          </MobileCollapsible>
        </>
      ) : (
        <PropertyTodayTasks
          loading={propertyLoading}
          pendingChecklists={pendingChecklists}
          pendingEquipment={pendingEquipment}
          expiringLabels={expiringLabels}
          asoAlertsCount={0}
        />
      )}
    </div>
  );
}
