import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

/**
 * Kit de gráficos do design system — SVG/CSS puro, zero dependência.
 * Todos dark-aware e com prefers-reduced-motion respeitado via classes
 * de transição simples. Paleta: teal da marca primeiro, depois acentos.
 */
export const CHART_COLORS = [
  '#14b8a6', // teal (marca)
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ef4444', // red
  '#10b981', // emerald
  '#f97316', // orange
  '#64748b', // slate
];

export function chartColor(i: number): string {
  return CHART_COLORS[i % CHART_COLORS.length];
}

/* ------------------------------------------------------------------ */
/* DeltaBadge — variação % vs período anterior (↑ verde / ↓ vermelho)  */
/* ------------------------------------------------------------------ */
export function DeltaBadge({
  current,
  previous,
  /** Quando true, queda é boa (ex.: NCs abertas). */
  invert = false,
}: {
  current: number;
  previous: number;
  invert?: boolean;
}) {
  if (previous <= 0 && current <= 0) return null;
  const pct =
    previous > 0 ? Math.round(((current - previous) / previous) * 100) : 100;
  const up = pct > 0;
  const flat = pct === 0;
  const good = flat ? null : invert ? !up : up;
  const tone = flat
    ? 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
    : good
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
      : 'bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300';
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${tone}`}
      title="Comparado ao período anterior"
    >
      <Icon size={11} />
      {pct > 0 ? '+' : ''}
      {pct}%
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* StatCard — KPI com ícone, valor grande, delta e nota                */
/* ------------------------------------------------------------------ */
export function StatCard({
  icon,
  label,
  value,
  delta,
  hint,
  tone = 'neutral',
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  delta?: ReactNode;
  hint?: string;
  tone?: 'neutral' | 'teal' | 'blue' | 'amber' | 'red' | 'emerald';
}) {
  const tones: Record<string, string> = {
    neutral:
      'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
    teal: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300',
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
    amber:
      'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    red: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
    emerald:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  };
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/10 dark:bg-neutral-900 dark:shadow-none">
      <div className="flex items-start justify-between gap-2">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}
        >
          {icon}
        </span>
        {delta}
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight text-neutral-900 dark:text-neutral-50">
        {value}
      </p>
      <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
        {label}
        {hint ? (
          <span className="text-neutral-400 dark:text-neutral-500"> · {hint}</span>
        ) : null}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* RankedBars — ranking horizontal com posição, valor e % de share     */
/* ------------------------------------------------------------------ */
export function RankedBars({
  items,
  colored = false,
  formatValue = (v: number) => v.toLocaleString('pt-BR'),
}: {
  items: { label: string; value: number }[];
  /** true = cada barra com cor da paleta; false = mono. */
  colored?: boolean;
  formatValue?: (v: number) => string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const total = items.reduce((s, i) => s + i.value, 0);
  return (
    <ol className="flex flex-col gap-2.5">
      {items.map((item, i) => {
        const pct = (item.value / max) * 100;
        const share = total > 0 ? Math.round((item.value / total) * 100) : 0;
        return (
          <li key={item.label + i}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
              <span className="flex min-w-0 items-baseline gap-1.5">
                <span className="w-4 shrink-0 text-right font-semibold tabular-nums text-neutral-400 dark:text-neutral-500">
                  {i + 1}
                </span>
                <span className="truncate font-medium text-neutral-700 dark:text-neutral-200">
                  {item.label}
                </span>
              </span>
              <span className="shrink-0 tabular-nums text-neutral-500 dark:text-neutral-400">
                <b className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {formatValue(item.value)}
                </b>{' '}
                · {share}%
              </span>
            </div>
            <div className="ml-[22px] h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div
                className={`h-full rounded-full transition-[width] duration-700 ease-out ${
                  colored ? '' : 'bg-neutral-900 dark:bg-neutral-200'
                }`}
                style={{
                  width: `${pct}%`,
                  ...(colored ? { backgroundColor: chartColor(i) } : {}),
                }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/* ColumnChart — colunas verticais com tooltip e linha de média        */
/* ------------------------------------------------------------------ */
export function ColumnChart({
  data,
  height = 160,
  showAvg = true,
  color = '#14b8a6',
  maxTicks = 12,
}: {
  data: { label: string; value: number; hint?: string }[];
  height?: number;
  showAvg?: boolean;
  color?: string;
  /** Máximo de rótulos no eixo X (amostra o resto). */
  maxTicks?: number;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const avg =
    data.length > 0 ? data.reduce((s, d) => s + d.value, 0) / data.length : 0;
  const labelEvery = Math.max(1, Math.ceil(data.length / maxTicks));
  return (
    <div>
      <div
        className="relative flex items-end gap-[3px]"
        style={{ height }}
        onMouseLeave={() => setActive(null)}
      >
        {showAvg && avg > 0 ? (
          <div
            className="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-neutral-400/70 dark:border-neutral-500/70"
            style={{ bottom: `${(avg / max) * 100}%` }}
          >
            <span className="absolute -top-2 right-0 rounded bg-white/80 px-1 text-[9px] font-medium text-neutral-500 backdrop-blur dark:bg-neutral-900/80 dark:text-neutral-400">
              média {Math.round(avg).toLocaleString('pt-BR')}
            </span>
          </div>
        ) : null}
        {data.map((d, i) => {
          const pct = (d.value / max) * 100;
          const isActive = active === i;
          return (
            <div
              key={d.label + i}
              className="relative flex h-full flex-1 cursor-default items-end"
              onMouseEnter={() => setActive(i)}
            >
              {isActive ? (
                <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-lg bg-neutral-900 px-2 py-1 text-[10px] font-medium text-white shadow-lg dark:bg-neutral-100 dark:text-neutral-900">
                  {d.hint ?? d.label}:{' '}
                  <b className="tabular-nums">{d.value.toLocaleString('pt-BR')}</b>
                </div>
              ) : null}
              <div
                className="w-full rounded-t-[3px] transition-all duration-300"
                style={{
                  height: `${Math.max(pct, d.value > 0 ? 2 : 0)}%`,
                  backgroundColor: color,
                  opacity: active === null || isActive ? 1 : 0.35,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-[3px]">
        {data.map((d, i) => (
          <span
            key={d.label + i}
            className="flex-1 truncate text-center text-[9px] text-neutral-400 dark:text-neutral-500"
          >
            {i % labelEvery === 0 ? d.label : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* DonutChart — rosca SVG com legenda e percentuais                    */
/* ------------------------------------------------------------------ */
export function DonutChart({
  items,
  size = 140,
  centerLabel,
  maxSlices = 6,
}: {
  items: { label: string; value: number }[];
  size?: number;
  centerLabel?: string;
  /** Acima disso, agrupa o resto em "Outros". */
  maxSlices?: number;
}) {
  const slices = useMemo(() => {
    const sorted = [...items].sort((a, b) => b.value - a.value);
    if (sorted.length <= maxSlices) return sorted;
    const head = sorted.slice(0, maxSlices - 1);
    const rest = sorted.slice(maxSlices - 1);
    return [
      ...head,
      { label: 'Outros', value: rest.reduce((s, r) => s + r.value, 0) },
    ];
  }, [items, maxSlices]);
  const total = slices.reduce((s, i) => s + i.value, 0);
  if (total <= 0) return null;

  const stroke = 16;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  // Offsets acumulados pré-computados (mutar variável durante o render
  // viola a regra do React Compiler).
  const starts: number[] = [];
  {
    let acc = 0;
    for (const s of slices) {
      starts.push(acc);
      acc += s.value / total;
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            className="stroke-neutral-100 dark:stroke-neutral-800"
          />
          {slices.map((s, i) => {
            const frac = s.value / total;
            const dash = frac * c;
            const offset = -starts[i] * c;
            return (
              <circle
                key={s.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={chartColor(i)}
                strokeWidth={stroke}
                strokeDasharray={`${Math.max(dash - 2, 0)} ${c - Math.max(dash - 2, 0)}`}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold tabular-nums text-neutral-900 dark:text-neutral-50">
            {total.toLocaleString('pt-BR')}
          </span>
          {centerLabel ? (
            <span className="max-w-[70%] truncate text-[10px] text-neutral-500 dark:text-neutral-400">
              {centerLabel}
            </span>
          ) : null}
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {slices.map((s, i) => {
          const pct = Math.round((s.value / total) * 100);
          return (
            <li
              key={s.label}
              className="flex items-center justify-between gap-3 text-xs"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: chartColor(i) }}
                />
                <span className="truncate text-neutral-700 dark:text-neutral-200">
                  {s.label}
                </span>
              </span>
              <span className="shrink-0 tabular-nums text-neutral-500 dark:text-neutral-400">
                <b className="font-semibold text-neutral-900 dark:text-neutral-100">
                  {s.value.toLocaleString('pt-BR')}
                </b>{' '}
                · {pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Heatmap — grade de intensidade (ex.: hora × dia da semana)          */
/* ------------------------------------------------------------------ */
export function Heatmap({
  rows,
  xLabels,
  yLabels,
  color = '20, 184, 166', // rgb do teal
  formatCell = (v: number) => v.toLocaleString('pt-BR'),
}: {
  /** rows[y][x] = intensidade. */
  rows: number[][];
  xLabels: string[];
  yLabels: string[];
  /** "r, g, b" usado com alpha proporcional. */
  color?: string;
  formatCell?: (v: number) => string;
}) {
  const max = Math.max(1, ...rows.flat());
  return (
    <div className="overflow-x-auto">
      <table className="border-separate" style={{ borderSpacing: 3 }}>
        <tbody>
          {rows.map((row, y) => (
            <tr key={y}>
              <td className="pr-2 text-right text-[10px] text-neutral-500 dark:text-neutral-400">
                {yLabels[y]}
              </td>
              {row.map((v, x) => {
                const alpha = v > 0 ? 0.15 + 0.85 * (v / max) : 0;
                return (
                  <td key={x}>
                    <div
                      className="h-5 w-5 rounded-[5px] bg-neutral-100 transition-colors sm:h-6 sm:w-6 dark:bg-neutral-800"
                      style={
                        v > 0
                          ? { backgroundColor: `rgba(${color}, ${alpha})` }
                          : undefined
                      }
                      title={`${yLabels[y]} ${xLabels[x]}: ${formatCell(v)}`}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
          <tr>
            <td />
            {xLabels.map((l, x) => (
              <td
                key={x}
                className="pt-0.5 text-center text-[9px] text-neutral-400 dark:text-neutral-500"
              >
                {l}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
