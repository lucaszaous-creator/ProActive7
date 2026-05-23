import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Package,
  Printer,
  Images,
  Building2,
  AlertTriangle,
  Clock,
  Thermometer,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatDateTime } from '@/lib/dates';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { MasterPortfolio } from '@/components/MasterPortfolio';

async function countRows(table: string): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}

async function countLabelsExpiringSoon(): Promise<number> {
  const now = new Date().toISOString();
  const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from('label_prints')
    .select('*', { count: 'exact', head: true })
    .gte('expiry_at', now)
    .lt('expiry_at', in24h);
  if (error) throw error;
  return count ?? 0;
}

async function countLabelsExpired(sinceDays = 7): Promise<number> {
  const now = new Date().toISOString();
  const since = new Date(
    Date.now() - sinceDays * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { count, error } = await supabase
    .from('label_prints')
    .select('*', { count: 'exact', head: true })
    .lt('expiry_at', now)
    .gte('printed_at', since);
  if (error) throw error;
  return count ?? 0;
}

interface ExpiringRow {
  id: string;
  product_name_snapshot: string;
  expiry_at: string;
}

async function fetchExpiringTop(): Promise<ExpiringRow[]> {
  const now = new Date().toISOString();
  const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from('label_prints')
    .select('id, product_name_snapshot, expiry_at')
    .gte('expiry_at', now)
    .lt('expiry_at', in24h)
    .order('expiry_at')
    .limit(5);
  return (data as ExpiringRow[] | null) ?? [];
}

interface OutOfRangeRow {
  id: string;
  temperature: number;
  recorded_at: string;
  equipment: { name: string; temp_min: number; temp_max: number } | null;
}

async function fetchOutOfRangeToday(): Promise<OutOfRangeRow[]> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from('temperature_logs')
    .select('id, temperature, recorded_at, equipment(name, temp_min, temp_max)')
    .gte('recorded_at', startOfDay.toISOString())
    .order('recorded_at', { ascending: false })
    .limit(50);
  if (error) return [];
  const rows = (data as unknown as OutOfRangeRow[] | null) ?? [];
  return rows.filter(
    (r) =>
      r.equipment &&
      (r.temperature < r.equipment.temp_min ||
        r.temperature > r.equipment.temp_max),
  );
}

interface Stats {
  products: number;
  prints: number;
  photos: number;
  companies: number;
  expiringSoon: number;
  expired: number;
  outOfRangeToday: number;
  expiringTop: ExpiringRow[];
  outOfRangeRows: OutOfRangeRow[];
}

export function DashboardPage() {
  const { isMaster, profile } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      countRows('products'),
      countRows('label_prints'),
      countRows('photos'),
      isMaster ? countRows('companies') : Promise.resolve(0),
      countLabelsExpiringSoon(),
      countLabelsExpired(7),
      fetchExpiringTop(),
      fetchOutOfRangeToday(),
    ])
      .then(
        ([
          products,
          prints,
          photos,
          companies,
          expiringSoon,
          expired,
          expiringTop,
          outOfRangeRows,
        ]) => {
          if (cancelled) return;
          setStats({
            products,
            prints,
            photos,
            companies,
            expiringSoon,
            expired,
            outOfRangeToday: outOfRangeRows.length,
            expiringTop,
            outOfRangeRows,
          });
        },
      )
      .catch((e: Error) => {
        if (!cancelled) {
          toast.error('Erro ao carregar painel: ' + e.message);
          setStats({
            products: 0,
            prints: 0,
            photos: 0,
            companies: 0,
            expiringSoon: 0,
            expired: 0,
            outOfRangeToday: 0,
            expiringTop: [],
            outOfRangeRows: [],
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isMaster]);

  const baseCards: {
    label: string;
    value: number;
    icon: LucideIcon;
    show: boolean;
  }[] = [
    {
      label: 'Produtos',
      value: stats?.products ?? 0,
      icon: Package,
      show: true,
    },
    {
      label: 'Etiquetas impressas',
      value: stats?.prints ?? 0,
      icon: Printer,
      show: true,
    },
    { label: 'Fotos', value: stats?.photos ?? 0, icon: Images, show: true },
    {
      label: 'Empresas',
      value: stats?.companies ?? 0,
      icon: Building2,
      show: isMaster,
    },
  ];

  const alertCards: {
    label: string;
    value: number;
    icon: LucideIcon;
    tone: 'amber' | 'red';
  }[] = [
    {
      label: 'Vence nas próximas 24h',
      value: stats?.expiringSoon ?? 0,
      icon: Clock,
      tone: 'amber',
    },
    {
      label: 'Vencidas (últimos 7 dias)',
      value: stats?.expired ?? 0,
      icon: AlertTriangle,
      tone: 'red',
    },
    {
      label: 'Temperaturas fora da faixa hoje',
      value: stats?.outOfRangeToday ?? 0,
      icon: Thermometer,
      tone: 'red',
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100 sm:text-2xl">
          Painel
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Olá, {profile?.full_name ?? profile?.email}.
          {isMaster
            ? ' Carteira de empresas com score de compliance.'
            : ' Resumo da sua empresa.'}
        </p>
      </div>

      {isMaster ? (
        <div className="mb-6">
          <MasterPortfolio />
        </div>
      ) : null}

      {!stats ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {baseCards
              .filter((c) => c.show)
              .map(({ label, value, icon: Icon }) => (
                <Card key={label}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                      <Icon size={20} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-2xl font-semibold text-neutral-800 dark:text-neutral-100">
                        {value}
                      </p>
                      <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                        {label}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            {alertCards.map(({ label, value, icon: Icon, tone }) => {
              const bg = tone === 'red' ? 'bg-red-50' : 'bg-amber-50';
              const fg = tone === 'red' ? 'text-red-600' : 'text-amber-600';
              return (
                <Card key={label}>
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${bg} ${fg}`}
                    >
                      <Icon size={20} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-2xl font-semibold text-neutral-800 dark:text-neutral-100">
                        {value}
                      </p>
                      <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                        {label}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {stats.expiringTop.length > 0 ? (
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                Próximas a vencer
              </h2>
              <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {stats.expiringTop.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-3 py-2 text-sm"
                  >
                    <span className="truncate text-neutral-800 dark:text-neutral-200">
                      {r.product_name_snapshot}
                    </span>
                    <span className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
                      {formatDateTime(r.expiry_at)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {stats.outOfRangeRows.length > 0 ? (
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                Temperaturas fora da faixa hoje
              </h2>
              <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {stats.outOfRangeRows.slice(0, 5).map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-3 py-2 text-sm"
                  >
                    <span className="truncate text-neutral-800 dark:text-neutral-200">
                      {r.equipment?.name ?? 'Equipamento removido'} —{' '}
                      <span className="text-red-600">{r.temperature}°C</span>
                    </span>
                    <span className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
                      {formatDateTime(r.recorded_at)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}
