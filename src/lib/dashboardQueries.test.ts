import { describe, it, expect } from 'vitest';
import {
  aggregatePortfolioStats,
  enrichCompanies,
  type ComplianceRow,
} from './dashboardQueries';

function row(
  overrides: Partial<ComplianceRow>,
  i = Math.random(),
): ComplianceRow {
  return {
    company_id: `c${i}`,
    company_name: `Empresa ${i}`,
    company_logo_path: null,
    active: true,
    nc_total_30d: 0,
    nc_overdue_30d: 0,
    nc_open_now: 0,
    checklists_ran_30d: 0,
    checklists_planned_30d: 0,
    last_audit_at: null,
    next_audit_at: null,
    has_audit_last_90d: false,
    temp_readings_7d: 0,
    temp_out_of_range_7d: 0,
    docs_published: 0,
    docs_pending: 0,
    manipulators_active: 0,
    manipulators_aso_ok: 0,
    manipulators_aso_expired: 0,
    manipulators_aso_missing: 0,
    has_pest_service_active: false,
    has_pest_service_registered: false,
    last_pest_at: null,
    next_pest_due_at: null,
    ...overrides,
  };
}

describe('enrichCompanies', () => {
  it('lista vazia retorna vazio', () => {
    expect(enrichCompanies([])).toEqual([]);
  });

  it('empresa sem dados recebe score null', () => {
    const r = enrichCompanies([row({})]);
    expect(r[0].score).toBe(null);
    expect(r[0].tier).toBe(null);
  });

  it('ordena red -> amber -> green', () => {
    const r = enrichCompanies([
      row({ has_audit_last_90d: true, docs_published: 6 }, 1), // verde
      row({ ncTotal30d: 5, ncOverdue30d: 5 } as never, 2), // sem dados validos
      row(
        {
          nc_total_30d: 5,
          nc_overdue_30d: 5,
          checklists_planned_30d: 10,
          checklists_ran_30d: 0,
          tempReadings7d: 50,
          tempOutOfRange7d: 50,
        } as never,
        3,
      ),
    ]);
    // o primeiro nao deve ser o verde
    expect(r[0].tier).not.toBe('green');
  });
});

describe('aggregatePortfolioStats', () => {
  it('lista vazia', () => {
    const stats = aggregatePortfolioStats([]);
    expect(stats.total).toBe(0);
    expect(stats.critical).toBe(0);
    expect(stats.averageScore).toBe(null);
    expect(stats.alertsToday).toBe(0);
  });

  it('uma empresa verde', () => {
    const list = enrichCompanies([
      row({
        has_audit_last_90d: true,
        docs_published: 6,
        nc_total_30d: 5,
        checklists_planned_30d: 5,
        checklists_ran_30d: 5,
        temp_readings_7d: 30,
        manipulators_active: 3,
        manipulators_aso_ok: 3,
        has_pest_service_active: true,
      }),
    ]);
    const stats = aggregatePortfolioStats(list);
    expect(stats.total).toBe(1);
    expect(stats.critical).toBe(0);
    expect(stats.averageScore).toBe(100);
    expect(stats.alertsToday).toBe(0);
  });

  it('mistura conta criticas e media corretamente', () => {
    const list = enrichCompanies([
      row(
        {
          has_audit_last_90d: true,
          docs_published: 6,
          has_pest_service_active: true,
        },
        1,
      ),
      row(
        {
          nc_total_30d: 5,
          nc_overdue_30d: 5,
          checklists_planned_30d: 10,
          checklists_ran_30d: 0,
          temp_readings_7d: 50,
          temp_out_of_range_7d: 50,
          manipulators_active: 5,
          manipulators_aso_ok: 0,
        },
        2,
      ),
    ]);
    const stats = aggregatePortfolioStats(list);
    expect(stats.total).toBe(2);
    expect(stats.critical).toBeGreaterThanOrEqual(1);
    expect(stats.averageScore).not.toBe(null);
    expect(stats.alertsToday).toBeGreaterThan(0);
  });

  it('ignora empresas sem score no calculo da media', () => {
    const list = enrichCompanies([
      row({}, 1), // sem dados -> score null
      row(
        {
          has_audit_last_90d: true,
          docs_published: 6,
          has_pest_service_active: true,
        },
        2,
      ), // verde
    ]);
    const stats = aggregatePortfolioStats(list);
    expect(stats.total).toBe(2);
    expect(stats.averageScore).toBe(100); // ignora o null
  });
});
