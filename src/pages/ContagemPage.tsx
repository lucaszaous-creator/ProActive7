import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  BarChart3,
  CalendarDays,
  Download,
  Flame,
  Package,
  Printer,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { useCompanyScope } from '@/lib/useCompanyScope';
import { downloadCsv } from '@/lib/csv';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  ColumnChart,
  DeltaBadge,
  DonutChart,
  Heatmap,
  RankedBars,
  StatCard,
} from '@/components/ui/charts';

const PERIODS = [
  { value: '7', label: 'Últimos 7 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
];

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const HOUR_LABELS = Array.from({ length: 24 }, (_, h) =>
  h % 3 === 0 ? `${h}h` : '',
);

interface Row {
  product_id: string | null;
  product_name_snapshot: string;
  printed_at: string;
  quantity: number;
}

export function ContagemPage() {
  usePageTitle('Contagem');
  const { isMaster, companies, companyId, setCompanyId } = useCompanyScope();

  const [rows, setRows] = useState<Row[]>([]);
  const [prevRows, setPrevRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');

  const load = useCallback(async () => {
    if (!companyId) {
      setRows([]);
      setPrevRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const days = Number(period);
    const since = new Date();
    since.setDate(since.getDate() - days);
    // Busca 2× o período para comparar com a janela anterior.
    const sincePrev = new Date();
    sincePrev.setDate(sincePrev.getDate() - days * 2);
    const { data, error } = await supabase
      .from('label_prints')
      .select('product_id, product_name_snapshot, printed_at, quantity')
      .eq('company_id', companyId)
      .gte('printed_at', sincePrev.toISOString())
      .order('printed_at', { ascending: false })
      .limit(10000);
    setLoading(false);
    if (error) {
      toast.error('Erro ao carregar: ' + error.message);
      return;
    }
    const all = (data as Row[] | null) ?? [];
    const cut = since.toISOString();
    setRows(all.filter((r) => r.printed_at >= cut));
    setPrevRows(all.filter((r) => r.printed_at < cut));
  }, [companyId, period]);

  useEffect(() => {
    void load();
  }, [load]);

  const total = rows.reduce((s, r) => s + (r.quantity ?? 0), 0);
  const prevTotal = prevRows.reduce((s, r) => s + (r.quantity ?? 0), 0);
  const distinctProducts = new Set(rows.map((r) => r.product_id)).size;
  const prevDistinct = new Set(prevRows.map((r) => r.product_id)).size;
  const perDay = Math.round(total / Math.max(1, Number(period)));
  const prevPerDay = Math.round(prevTotal / Math.max(1, Number(period)));

  const topProducts = useMemo(() => {
    const map = new Map<string, { label: string; value: number }>();
    rows.forEach((r) => {
      const key = r.product_id ?? r.product_name_snapshot;
      const cur = map.get(key) ?? { label: r.product_name_snapshot, value: 0 };
      cur.value += r.quantity ?? 0;
      map.set(key, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [rows]);

  const byDay = useMemo(() => {
    const days = Number(period);
    const map = new Map<string, number>();
    // Preenche todos os dias do período (inclusive zeros) para o eixo
    // ficar contínuo.
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      map.set(d.toISOString().slice(0, 10), 0);
    }
    rows.forEach((r) => {
      const d = r.printed_at.slice(0, 10);
      if (map.has(d)) map.set(d, (map.get(d) ?? 0) + (r.quantity ?? 0));
    });
    return Array.from(map.entries()).map(([iso, value]) => {
      const [, m, d] = iso.split('-');
      return { label: `${d}/${m}`, value, hint: `${d}/${m}` };
    });
  }, [rows, period]);

  const peakDay = useMemo(() => {
    let best: { label: string; value: number } | null = null;
    for (const d of byDay) {
      if (!best || d.value > best.value)
        best = { label: d.label, value: d.value };
    }
    return best && best.value > 0 ? best : null;
  }, [byDay]);

  // Ritmo da cozinha: intensidade por dia da semana × hora local.
  const heat = useMemo(() => {
    const grid: number[][] = Array.from({ length: 7 }, () =>
      Array.from({ length: 24 }, () => 0),
    );
    rows.forEach((r) => {
      const d = new Date(r.printed_at);
      grid[d.getDay()][d.getHours()] += r.quantity ?? 0;
    });
    return grid;
  }, [rows]);

  function exportCsv() {
    downloadCsv(
      `contagem-${period}d`,
      ['Produto', 'Etiquetas'],
      topProducts.map((p) => [p.label, p.value]),
    );
  }

  const noCompany = isMaster && companies.length === 0;

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Contagem"
        subtitle="Quantas etiquetas, em quê e quando — diagnóstico de produção."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={exportCsv}
            disabled={topProducts.length === 0}
          >
            <Download size={15} />
            Exportar CSV
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        {isMaster && companies.length > 0 && (
          <Select
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
        )}
        <Select
          label="Período"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
      </div>

      {noCompany ? (
        <Card>
          <p className="text-sm text-neutral-600">
            Nenhuma empresa cadastrada.
          </p>
        </Card>
      ) : loading ? (
        <ListSkeleton rows={6} />
      ) : total === 0 ? (
        <EmptyState
          icon={Printer}
          title="Nenhuma etiqueta no período"
          description="Imprima etiquetas no wizard e a contagem aparece aqui em tempo real."
        />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={<Printer size={17} />}
              label="Total impresso"
              value={total.toLocaleString('pt-BR')}
              tone="teal"
              delta={<DeltaBadge current={total} previous={prevTotal} />}
            />
            <StatCard
              icon={<Package size={17} />}
              label="Produtos distintos"
              value={distinctProducts}
              tone="blue"
              delta={
                <DeltaBadge
                  current={distinctProducts}
                  previous={prevDistinct}
                />
              }
            />
            <StatCard
              icon={<BarChart3 size={17} />}
              label="Etiquetas por dia"
              value={perDay.toLocaleString('pt-BR')}
              tone="amber"
              delta={<DeltaBadge current={perDay} previous={prevPerDay} />}
            />
            <StatCard
              icon={<Flame size={17} />}
              label="Pico de produção"
              value={peakDay ? peakDay.value.toLocaleString('pt-BR') : '—'}
              hint={peakDay ? `em ${peakDay.label}` : undefined}
              tone="red"
            />
          </div>

          <Card>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-neutral-700">
                Volume por dia
              </h2>
              <span className="text-xs text-neutral-400">
                vs. período anterior: {prevTotal.toLocaleString('pt-BR')}{' '}
                etiquetas
              </span>
            </div>
            <ColumnChart data={byDay} height={170} />
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-neutral-700">
                Top 10 produtos
              </h2>
              <RankedBars items={topProducts.slice(0, 10)} />
            </Card>
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-neutral-700">
                Participação por produto
              </h2>
              <DonutChart
                items={topProducts}
                centerLabel="etiquetas"
                maxSlices={6}
              />
            </Card>
          </div>

          <Card>
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-neutral-700">
                Ritmo da cozinha
              </h2>
              <span className="flex items-center gap-1 text-xs text-neutral-400">
                <CalendarDays size={12} />
                dia da semana × hora
              </span>
            </div>
            <Heatmap rows={heat} xLabels={HOUR_LABELS} yLabels={WEEKDAYS} />
            <p className="mt-2 text-xs text-neutral-500">
              Quanto mais forte o teal, mais etiquetas naquele horário — mostra
              o horário real de produção da cozinha.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
