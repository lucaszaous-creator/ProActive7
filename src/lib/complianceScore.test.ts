import { describe, it, expect } from 'vitest';
import {
  calculateComplianceScore,
  scoreTier,
  type ComplianceInputs,
} from './complianceScore';

const empty: ComplianceInputs = {
  ncTotal30d: 0,
  ncOverdue30d: 0,
  checklistsPlanned30d: 0,
  checklistsRan30d: 0,
  hasAuditLast90d: false,
  tempReadings7d: 0,
  tempOutOfRange7d: 0,
  publishedDocs: 0,
};

describe('calculateComplianceScore', () => {
  it('retorna null para empresa sem dados', () => {
    expect(calculateComplianceScore(empty)).toBe(null);
  });

  it('100 quando tudo verde', () => {
    const r = calculateComplianceScore({
      ...empty,
      ncTotal30d: 5,
      ncOverdue30d: 0,
      checklistsPlanned30d: 10,
      checklistsRan30d: 10,
      hasAuditLast90d: true,
      tempReadings7d: 50,
      tempOutOfRange7d: 0,
      publishedDocs: 6,
    });
    expect(r?.total).toBe(100);
  });

  it('0 quando tudo critico', () => {
    const r = calculateComplianceScore({
      ...empty,
      ncTotal30d: 5,
      ncOverdue30d: 5,
      checklistsPlanned30d: 10,
      checklistsRan30d: 0,
      hasAuditLast90d: false,
      tempReadings7d: 50,
      tempOutOfRange7d: 50,
      publishedDocs: 0,
    });
    expect(r?.total).toBe(0);
  });

  it('parcela de NCs penaliza atraso', () => {
    // 2 de 5 atrasadas = 60% no prazo -> 35*0.6 = 21
    const r = calculateComplianceScore({
      ...empty,
      ncTotal30d: 5,
      ncOverdue30d: 2,
      hasAuditLast90d: true,
    });
    expect(r?.ncPart).toBe(21);
  });

  it('documentos sao all-or-nothing', () => {
    const r5 = calculateComplianceScore({ ...empty, publishedDocs: 5 });
    const r6 = calculateComplianceScore({ ...empty, publishedDocs: 6 });
    expect(r5?.docsPart).toBe(0);
    expect(r6?.docsPart).toBe(10);
  });

  it('mix realista produz score intermediario', () => {
    const r = calculateComplianceScore({
      ncTotal30d: 4,
      ncOverdue30d: 1, // 75% no prazo -> 26.25
      checklistsPlanned30d: 30,
      checklistsRan30d: 24, // 80% -> 20
      hasAuditLast90d: true, // 20
      tempReadings7d: 40,
      tempOutOfRange7d: 4, // 90% -> 9
      publishedDocs: 6, // 10
    });
    expect(r?.total).toBeCloseTo(85.25, 1);
  });
});

describe('scoreTier', () => {
  it('null para null', () => {
    expect(scoreTier(null)).toBe(null);
  });
  it('verde >= 85', () => {
    expect(scoreTier(85)).toBe('green');
    expect(scoreTier(100)).toBe('green');
  });
  it('ambar 70-84', () => {
    expect(scoreTier(70)).toBe('amber');
    expect(scoreTier(84.9)).toBe('amber');
  });
  it('vermelho < 70', () => {
    expect(scoreTier(69)).toBe('red');
    expect(scoreTier(0)).toBe('red');
  });
});
