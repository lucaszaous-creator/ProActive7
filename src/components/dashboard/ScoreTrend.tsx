import { useEffect, useState } from 'react';
import { LineChart } from 'lucide-react';
import { fetchScoreTrend, type ScoreTrendPoint } from '@/lib/dashboardQueries';
import { Card } from '@/components/ui/Card';
import { TrendArea } from '@/components/ui/charts';

/**
 * Curva do compliance score (média diária das empresas da org).
 * Alimentada por compliance_snapshots — §3 do CLAUDE.md: a curva mostra
 * a realidade, subindo ou caindo. Sem dados suficientes, explica como
 * a série nasce em vez de esconder o card.
 */
export function ScoreTrend() {
  const [points, setPoints] = useState<ScoreTrendPoint[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchScoreTrend(90)
      .then((p) => {
        if (!cancelled) setPoints(p);
      })
      .catch(() => {
        if (!cancelled) setPoints([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (points === null) return null; // carregando: não pisca layout

  const data = points.map((p) => {
    const [, m, d] = p.date.split('-');
    return { label: `${d}/${m}`, value: p.avgScore };
  });
  const last = points[points.length - 1];
  const trendColor =
    last && last.avgScore < 70
      ? '#ef4444'
      : last && last.avgScore < 85
        ? '#f59e0b'
        : '#14b8a6';

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-700">
          <LineChart size={15} className="text-neutral-400" />
          Evolução do compliance
        </h2>
        {last ? (
          <span className="text-xs text-neutral-400">
            média de {last.companies}{' '}
            {last.companies === 1 ? 'empresa' : 'empresas'} · 90 dias
          </span>
        ) : null}
      </div>
      {data.length < 2 ? (
        <p className="rounded-lg bg-neutral-50 px-3 py-2.5 text-sm text-neutral-600">
          A curva se constrói com o uso: cada dia em que o painel é aberto, o
          score do dia fica registrado. Volte amanhã para ver o primeiro traço
          da série.
        </p>
      ) : (
        <TrendArea
          points={data}
          height={150}
          yMin={0}
          yMax={100}
          color={trendColor}
          formatValue={(v) => `${v} pts`}
        />
      )}
    </Card>
  );
}
