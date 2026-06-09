import type { ManipulatorAso } from './types';

export type AsoStatus = 'valid' | 'expiring' | 'expired' | 'missing';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const ASO_STATUS_LABELS: Record<AsoStatus, string> = {
  valid: 'Em dia',
  expiring: 'Vence em breve',
  expired: 'Vencido',
  missing: 'Sem ASO',
};

export const ASO_STATUS_COLOR: Record<AsoStatus, string> = {
  valid:
    'bg-neutral-100 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-200',
  expiring: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200',
  expired: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200',
  missing:
    'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
};

/**
 * Avalia a situacao do manipulador a partir do ASO mais recente.
 * - `expiring`: vence em ate 30 dias.
 * - `expired`: ja venceu.
 * - `missing`: nunca teve ASO registrado.
 *
 * `referenceDate` permite testar comportamento determinístico.
 */
export function asoStatusFromList(
  asos: ManipulatorAso[],
  referenceDate: Date = new Date(),
): {
  status: AsoStatus;
  latest: ManipulatorAso | null;
  daysLeft: number | null;
} {
  if (asos.length === 0) {
    return { status: 'missing', latest: null, daysLeft: null };
  }
  const sorted = [...asos].sort((a, b) =>
    b.expires_at.localeCompare(a.expires_at),
  );
  const latest = sorted[0];
  const expiry = new Date(latest.expires_at + 'T00:00:00');
  const today = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  );
  const daysLeft = Math.round(
    (expiry.getTime() - today.getTime()) / MS_PER_DAY,
  );
  let status: AsoStatus = 'valid';
  if (daysLeft < 0) status = 'expired';
  else if (daysLeft <= 30) status = 'expiring';
  return { status, latest, daysLeft };
}
