import type { PestControlService } from './types';

export type PestStatus = 'valid' | 'expiring' | 'expired' | 'missing';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const PEST_STATUS_LABELS: Record<PestStatus, string> = {
  valid: 'Em dia',
  expiring: 'Vence em breve',
  expired: 'Vencido',
  missing: 'Sem serviço',
};

export const PEST_STATUS_COLOR: Record<PestStatus, string> = {
  valid:
    'bg-neutral-100 text-neutral-700 dark:bg-neutral-900 dark:text-neutral-200',
  expiring: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200',
  expired: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200',
  missing:
    'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
};

/**
 * Avalia o status do CIP a partir do servico mais recente.
 * - `expiring`: proxima visita vence em ate 30 dias.
 * - `expired`: proxima visita ja venceu.
 * - `missing`: nunca houve servico OU servico sem next_due_at.
 */
export function pestStatusFromList(
  services: PestControlService[],
  referenceDate: Date = new Date(),
): {
  status: PestStatus;
  latest: PestControlService | null;
  daysLeft: number | null;
} {
  if (services.length === 0) {
    return { status: 'missing', latest: null, daysLeft: null };
  }
  const sorted = [...services].sort((a, b) =>
    b.performed_at.localeCompare(a.performed_at),
  );
  const latest = sorted[0];
  if (!latest.next_due_at) {
    return { status: 'missing', latest, daysLeft: null };
  }
  const expiry = new Date(latest.next_due_at + 'T00:00:00');
  const today = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
  );
  const daysLeft = Math.round(
    (expiry.getTime() - today.getTime()) / MS_PER_DAY,
  );
  let status: PestStatus = 'valid';
  if (daysLeft < 0) status = 'expired';
  else if (daysLeft <= 30) status = 'expiring';
  return { status, latest, daysLeft };
}
