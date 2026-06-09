import { useEffect, useRef, useState } from 'react';

interface CountUpProps {
  /** Valor final a alcançar. */
  value: number;
  /** Casas decimais (default 0). */
  decimals?: number;
  /** Duração da animação em ms (default 800). */
  duration?: number;
  prefix?: string;
  suffix?: string;
}

/**
 * Número que conta de 0 até `value` ao montar — dá vida aos KPIs sem
 * biblioteca. Usa requestAnimationFrame com easing suave. Respeita
 * prefers-reduced-motion (mostra o valor final direto).
 */
export function CountUp({
  value,
  decimals = 0,
  duration = 800,
  prefix = '',
  suffix = '',
}: CountUpProps) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || duration <= 0) {
      setDisplay(value);
      return;
    }
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (value - from) * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);

  return (
    <>
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </>
  );
}
