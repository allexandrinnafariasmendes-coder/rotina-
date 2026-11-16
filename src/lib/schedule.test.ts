import { describe, expect, it } from 'vitest';
import { findConflicts, freeSlots, nextOccurrence, occurrencesForDay, occursOn, timeToMinutes } from './schedule';
import type { EventRow } from './types';

const ev = (p: Partial<EventRow>): EventRow => ({
  id: p.id ?? Math.random().toString(36).slice(2),
  user_id: 'u',
  title: p.title ?? 'Evento',
  description: null,
  location: null,
  area: 'rotina',
  category_id: null,
  start_date: '2026-11-01',
  start_time: '08:00',
  duration_minutes: 60,
  is_fixed: false,
  recurrence: null,
  recurrence_until: null,
  reminder_minutes: null,
  ...p,
});

describe('occursOn', () => {
  it('evento único só no dia', () => {
    const e = ev({ start_date: '2026-11-16' });
    expect(occursOn(e, '2026-11-16')).toBe(true);
    expect(occursOn(e, '2026-11-17')).toBe(false);
  });
  it('diário respeita início e fim', () => {
    const e = ev({ recurrence: { freq: 'daily' }, start_date: '2026-11-10', recurrence_until: '2026-11-20' });
    expect(occursOn(e, '2026-11-09')).toBe(false);
    expect(occursOn(e, '2026-11-15')).toBe(true);
    expect(occursOn(e, '2026-11-21')).toBe(false);
  });
  it('inglês depois do almoço, exceto quarta', () => {
    const e = ev({ recurrence: { freq: 'weekly', weekdays: [1, 2, 4, 5] } });
    expect(occursOn(e, '2026-11-16')).toBe(true); // segunda
    expect(occursOn(e, '2026-11-18')).toBe(false); // quarta
    expect(occursOn(e, '2026-11-19')).toBe(true); // quinta
  });
});

describe('conflitos e horários livres', () => {
  const day = '2026-11-17'; // terça
  const events = [
    ev({ id: 'a', title: 'Estudos', start_time: '14:00', duration_minutes: 120, recurrence: { freq: 'daily' } }),
    ev({ id: 'b', title: 'Natação', start_time: '16:00', duration_minutes: 60, recurrence: { freq: 'weekly', weekdays: [2] }, is_fixed: true }),
    ev({ id: 'c', title: 'Missa', start_time: '18:00', duration_minutes: 60, recurrence: { freq: 'daily' } }),
    ev({ id: 'd', title: 'Revisão', start_time: '15:30', duration_minutes: 45, recurrence: { freq: 'daily' } }),
  ];

  it('ordena por horário', () => {
    const items = occurrencesForDay(events, [], day);
    expect(items.map((i) => i.event.id)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('detecta sobreposição (encostar não é conflito)', () => {
    const items = occurrencesForDay(events, [], day);
    const pairs = findConflicts(items).map(([x, y]) => `${x.event.id}-${y.event.id}`);
    expect(pairs).toEqual(['a-d', 'd-b']);
  });

  it('ocorrência pulada não gera conflito', () => {
    const items = occurrencesForDay(events, [{ id: 'o', event_id: 'd', occurrence_date: day, status: 'skipped', note: null }], day);
    expect(findConflicts(items)).toHaveLength(0);
  });

  it('horários livres mantêm folga e ignoram janelas curtas', () => {
    const items = occurrencesForDay(events, [], day);
    const slots = freeSlots(items, timeToMinutes('05:00')!, timeToMinutes('22:00')!, { buffer: 10, minSlot: 30 });
    expect(slots).toEqual([
      { start: 300, end: 830 }, // 05:00–13:50
      { start: 1030, end: 1070 }, // 17:10–17:50 (40 min, entre natação e missa)
      { start: 1150, end: 1320 }, // 19:10–22:00
    ]);
  });

  it('próximo compromisso ignora concluídos', () => {
    const items = occurrencesForDay(events, [{ id: 'o', event_id: 'a', occurrence_date: day, status: 'done', note: null }], day);
    expect(nextOccurrence(items, timeToMinutes('14:30')!)?.event.id).toBe('d');
  });
});
