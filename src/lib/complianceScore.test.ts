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
      manipulatorsActive: 5,
      manipulatorsAsoOk: 5,
      hasPestServiceActive: true,
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
      manipulatorsActive: 5,
      manipulatorsAsoOk: 0,
      hasPestServiceActive: false,
    });
    expect(r?.total).toBe(0);
  });

  it('parcela de NCs penaliza atraso', () => {
    // 2 de 5 atrasadas = 60% no prazo -> 25*0.6 = 15
    const r = calculateComplianceScore({
      ...empty,
      ncTotal30d: 5,
      ncOverdue30d: 2,
      hasAuditLast90d: true,
    });
    expect(r?.ncPart).toBe(15);
  });

  it('CIP ativo vale 5 pontos', () => {
    const r1 = calculateComplianceScore({
      ...empty,
      publishedDocs: 6,
      hasPestServiceActive: true,
    });
    const r2 = calculateComplianceScore({
      ...empty,
      publishedDocs: 6,
      hasPestServiceActive: false,
    });
    expect(r1?.pestPart).toBe(5);
    expect(r2?.pestPart).toBe(0);
  });

  it('documentos sao all-or-nothing', () => {
    const r5 = calculateComplianceScore({ ...empty, publishedDocs: 5 });
    const r6 = calculateComplianceScore({ ...empty, publishedDocs: 6 });
    expect(r5?.docsPart).toBe(0);
    expect(r6?.docsPart).toBe(10);
  });

  it('parcela de manipuladores eh proporcional', () => {
    // 3 de 5 com ASO ok -> 10*0.6 = 6
    const r = calculateComplianceScore({
      ...empty,
      manipulatorsActive: 5,
      manipulatorsAsoOk: 3,
    });
    expect(r?.manipulatorsPart).toBe(6);
  });

  it('sem manipuladores ativos = parcela cheia (neutro)', () => {
    const r = calculateComplianceScore({
      ...empty,
      publishedDocs: 6,
      manipulatorsActive: 0,
    });
    expect(r?.manipulatorsPart).toBe(10);
  });

  it('mix realista produz score intermediario', () => {
    const r = calculateComplianceScore({
      ncTotal30d: 4,
      ncOverdue30d: 1, // 75% no prazo -> 25*0.75 = 18.75
      checklistsPlanned30d: 30,
      checklistsRan30d: 24, // 80% -> 16
      hasAuditLast90d: true, // 20
      tempReadings7d: 40,
      tempOutOfRange7d: 4, // 90% -> 9
      publishedDocs: 6, // 10
      manipulatorsActive: 5,
      manipulatorsAsoOk: 4, // 80% -> 8
      hasPestServiceActive: true, // 5
    });
    expect(r?.total).toBeCloseTo(86.75, 1);
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
