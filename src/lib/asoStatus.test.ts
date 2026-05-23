import { describe, it, expect } from 'vitest';
import { asoStatusFromList } from './asoStatus';
import type { ManipulatorAso } from './types';

function aso(expires_at: string): ManipulatorAso {
  return {
    id: 'x',
    manipulator_id: 'm',
    issued_at: '2024-01-01',
    expires_at,
    doctor_name: null,
    doctor_crm: null,
    file_path: null,
    notes: null,
    created_at: '2024-01-01',
  };
}

const today = new Date('2026-05-23T00:00:00');

describe('asoStatusFromList', () => {
  it('missing quando lista vazia', () => {
    expect(asoStatusFromList([], today)).toEqual({
      status: 'missing',
      latest: null,
      daysLeft: null,
    });
  });

  it('valid quando vence em mais de 30 dias', () => {
    const r = asoStatusFromList([aso('2026-08-01')], today);
    expect(r.status).toBe('valid');
    expect(r.daysLeft).toBe(70);
  });

  it('expiring quando vence em ate 30 dias', () => {
    const r = asoStatusFromList([aso('2026-06-10')], today);
    expect(r.status).toBe('expiring');
    expect(r.daysLeft).toBe(18);
  });

  it('expired quando ja venceu', () => {
    const r = asoStatusFromList([aso('2026-01-01')], today);
    expect(r.status).toBe('expired');
    expect(r.daysLeft).toBeLessThan(0);
  });

  it('escolhe o ASO mais recente', () => {
    const r = asoStatusFromList(
      [aso('2024-12-01'), aso('2026-12-01'), aso('2025-01-01')],
      today,
    );
    expect(r.latest?.expires_at).toBe('2026-12-01');
    expect(r.status).toBe('valid');
  });

  it('limite exato em 30 dias eh expiring', () => {
    const r = asoStatusFromList([aso('2026-06-22')], today);
    expect(r.status).toBe('expiring');
    expect(r.daysLeft).toBe(30);
  });
});
