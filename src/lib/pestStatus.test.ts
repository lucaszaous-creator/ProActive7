import { describe, it, expect } from 'vitest';
import { pestStatusFromList } from './pestStatus';
import type { PestControlService } from './types';

function svc(
  performed_at: string,
  next_due_at: string | null,
): PestControlService {
  return {
    id: performed_at,
    company_id: 'c',
    provider_id: null,
    service_type: 'desinsetizacao',
    performed_at,
    next_due_at,
    products_used: null,
    responsible_technician: null,
    certificate_path: null,
    notes: null,
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  };
}

const today = new Date('2026-05-23T00:00:00');

describe('pestStatusFromList', () => {
  it('missing quando lista vazia', () => {
    expect(pestStatusFromList([], today)).toEqual({
      status: 'missing',
      latest: null,
      daysLeft: null,
    });
  });

  it('missing quando ultimo servico nao tem proxima data', () => {
    const r = pestStatusFromList([svc('2026-05-01', null)], today);
    expect(r.status).toBe('missing');
    expect(r.latest?.performed_at).toBe('2026-05-01');
  });

  it('valid quando vence em mais de 30 dias', () => {
    const r = pestStatusFromList([svc('2026-05-01', '2026-08-01')], today);
    expect(r.status).toBe('valid');
    expect(r.daysLeft).toBe(70);
  });

  it('expiring quando vence em ate 30 dias', () => {
    const r = pestStatusFromList([svc('2026-03-01', '2026-06-10')], today);
    expect(r.status).toBe('expiring');
    expect(r.daysLeft).toBe(18);
  });

  it('expired quando ja venceu', () => {
    const r = pestStatusFromList([svc('2025-12-01', '2026-03-01')], today);
    expect(r.status).toBe('expired');
    expect(r.daysLeft).toBeLessThan(0);
  });

  it('usa o servico mais recente para decidir', () => {
    const r = pestStatusFromList(
      [
        svc('2024-01-01', '2024-04-01'),
        svc('2026-05-01', '2026-08-01'),
        svc('2025-01-01', '2025-04-01'),
      ],
      today,
    );
    expect(r.latest?.performed_at).toBe('2026-05-01');
    expect(r.status).toBe('valid');
  });
});
