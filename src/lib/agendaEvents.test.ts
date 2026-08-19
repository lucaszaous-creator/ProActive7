import { describe, it, expect } from 'vitest';
import {
  eventToItem,
  isoFromLocalInput,
  localInputFromIso,
  reminderDate,
  sortItems,
  visitToItem,
} from './agendaEvents';
import type { AgendaEvent } from './types';

const event: AgendaEvent = {
  id: 'e1',
  organization_id: 'o1',
  company_id: null,
  title: 'Reunião mensal',
  description: null,
  kind: 'meeting',
  starts_at: '2026-03-10T13:00:00.000Z',
  ends_at: null,
  all_day: false,
  remind_days_before: 3,
  reminded_at: null,
  done_at: null,
  created_by: null,
  created_at: '2026-03-01T00:00:00.000Z',
  updated_at: '2026-03-01T00:00:00.000Z',
};

describe('reminderDate', () => {
  it('subtrai os dias configurados', () => {
    expect(reminderDate(event)).toBe('2026-03-07');
  });
  it('lembrete no dia é a própria data', () => {
    expect(reminderDate({ ...event, remind_days_before: 0 })).toBe('2026-03-10');
  });
  it('sem lembrete devolve null', () => {
    expect(reminderDate({ ...event, remind_days_before: null })).toBeNull();
  });
  it('atravessa a virada do mês', () => {
    expect(
      reminderDate({ starts_at: '2026-03-02T12:00:00.000Z', remind_days_before: 7 }),
    ).toBe('2026-02-23');
  });
});

describe('conversão do datetime-local', () => {
  it('ida e volta preserva o horário local', () => {
    const local = '2026-03-10T09:30';
    const iso = isoFromLocalInput(local);
    expect(iso).not.toBeNull();
    expect(localInputFromIso(iso)).toBe(local);
  });
  it('valor vazio não vira data inválida', () => {
    expect(isoFromLocalInput('')).toBeNull();
    expect(localInputFromIso(null)).toBe('');
  });
  it('lixo não vira Invalid Date silencioso', () => {
    expect(isoFromLocalInput('não é data')).toBeNull();
  });
});

describe('união das duas fontes', () => {
  it('visita cancelada fica esmaecida e aponta para a página dela', () => {
    const item = visitToItem({
      id: 'a1',
      scheduled_at: '2026-03-10T12:00:00.000Z',
      status: 'cancelled',
      company: { name: 'Cozinha Central' },
    });
    expect(item.muted).toBe(true);
    expect(item.href).toBe('/visitas/a1');
    expect(item.title).toBe('Cozinha Central');
  });

  it('compromisso concluído fica esmaecido e não tem link', () => {
    const item = eventToItem({ ...event, done_at: '2026-03-11T00:00:00.000Z' });
    expect(item.muted).toBe(true);
    expect(item.href).toBeUndefined();
  });

  it('compromisso com empresa mostra o nome no subtítulo', () => {
    expect(eventToItem(event, 'Cozinha Central').subtitle).toBe(
      'Reunião · Cozinha Central',
    );
  });

  it('ordena por instante, dia inteiro primeiro no empate', () => {
    const items = sortItems([
      eventToItem({ ...event, id: 'b', starts_at: '2026-03-10T13:00:00.000Z' }),
      eventToItem({
        ...event,
        id: 'a',
        starts_at: '2026-03-10T13:00:00.000Z',
        all_day: true,
      }),
      eventToItem({ ...event, id: 'c', starts_at: '2026-03-09T13:00:00.000Z' }),
    ]);
    expect(items.map((i) => i.key)).toEqual(['event:c', 'event:a', 'event:b']);
  });
});
