import { describe, it, expect } from 'vitest';
import { escpos, buildLabelEscPos } from './escpos';

describe('escpos primitives', () => {
  it('init = ESC @', () => {
    expect(Array.from(escpos.init())).toEqual([0x1b, 0x40]);
  });

  it('align centro = ESC a 1', () => {
    expect(Array.from(escpos.align(1))).toEqual([0x1b, 0x61, 0x01]);
  });

  it('cut = GS V 0', () => {
    expect(Array.from(escpos.cut())).toEqual([0x1d, 0x56, 0x00]);
  });

  it('bold on/off', () => {
    expect(Array.from(escpos.bold(true))).toEqual([0x1b, 0x45, 1]);
    expect(Array.from(escpos.bold(false))).toEqual([0x1b, 0x45, 0]);
  });

  it('line termina com 0x0a', () => {
    const out = Array.from(escpos.line('AB'));
    expect(out).toEqual([65, 66, 0x0a]);
  });

  it('feed limita o argumento a 0..255', () => {
    expect(Array.from(escpos.feed(-3))[2]).toBe(0);
    expect(Array.from(escpos.feed(500))[2]).toBe(255);
  });

  it('qr inclui os dados e os comandos de print', () => {
    const out = escpos.qr('AB');
    // primeiros bytes: selecao de modelo
    expect(Array.from(out.slice(0, 9))).toEqual([
      0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00,
    ]);
    // ultimos: comando de print (GS ( k 03 00 31 51 30)
    expect(Array.from(out.slice(-8))).toEqual([
      0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30,
    ]);
  });
});

describe('buildLabelEscPos', () => {
  it('comeca com init e termina com cut', () => {
    const out = buildLabelEscPos({
      companyName: 'X',
      productName: 'Molho',
      storageConditionLabel: 'Refrigerado',
      manipulationText: '01/01 10:00',
      expiryText: '05/01 10:00',
      responsibleName: 'Lucas',
    });
    expect(Array.from(out.slice(0, 2))).toEqual([0x1b, 0x40]);
    expect(Array.from(out.slice(-3))).toEqual([0x1d, 0x56, 0x00]);
  });

  it('inclui QR quando qrUrl esta presente', () => {
    const semQr = buildLabelEscPos({
      companyName: 'X',
      productName: 'P',
      storageConditionLabel: 'A',
      manipulationText: 'm',
      expiryText: 'e',
      responsibleName: 'r',
    });
    const comQr = buildLabelEscPos({
      companyName: 'X',
      productName: 'P',
      storageConditionLabel: 'A',
      manipulationText: 'm',
      expiryText: 'e',
      responsibleName: 'r',
      qrUrl: 'https://x/y',
    });
    expect(comQr.length).toBeGreaterThan(semQr.length);
  });
});
