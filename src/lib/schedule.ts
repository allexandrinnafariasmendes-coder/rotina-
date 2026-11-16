import { format, parseISO } from 'date-fns';
import type { EventRow, OccurrenceRow } from './types';

/** yyyy-MM-dd no fuso local */
export const toISODate = (d: Date) => format(d, 'yyyy-MM-dd');

/** "HH:MM" ou "HH:MM:SS" → minutos desde 00:00 */
export function timeToMinutes(t: string | null | undefined): number | null {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

export function minutesToTime(min: number): string {
  const m = Math.max(0, Math.min(24 * 60 - 1, Math.round(min)));
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  return r ? `${h}h${String(r).padStart(2, '0')}` : `${h}h`;
}

/** O evento acontece nesta data? (respeita início, fim e regra de recorrência) */
export function occursOn(ev: Pick<EventRow, 'start_date' | 'recurrence' | 'recurrence_until'>, isoDate: string): boolean {
  if (isoDate < ev.start_date) return false;
  if (!ev.recurrence) return isoDate === ev.start_date;
  if (ev.recurrence_until && isoDate > ev.recurrence_until) return false;
  if (ev.recurrence.freq === 'daily') return true;
  const weekday = parseISO(isoDate).getDay();
  return ev.recurrence.weekdays.includes(weekday);
}

export interface Occurrence {
  key: string; // event_id + data
  event: EventRow;
  date: string;
  start: number | null; // minutos; null = dia inteiro
  end: number | null;
  status: OccurrenceRow['status'] | null;
  occurrenceId: string | null;
}

export function occurrencesForDay(events: EventRow[], occ: OccurrenceRow[], isoDate: string): Occurrence[] {
  const byEvent = new Map(occ.filter((o) => o.occurrence_date === isoDate).map((o) => [o.event_id, o]));
  return events
    .filter((e) => occursOn(e, isoDate))
    .map((event) => {
      const start = timeToMinutes(event.start_time);
      const o = byEvent.get(event.id);
      return {
        key: `${event.id}:${isoDate}`,
        event,
        date: isoDate,
        start,
        end: start === null ? null : start + event.duration_minutes,
        status: o?.status ?? null,
        occurrenceId: o?.id ?? null,
      };
    })
    .sort((a, b) => (a.start ?? -1) - (b.start ?? -1) || a.event.title.localeCompare(b.event.title));
}

/** Pares de ocorrências com horário que se sobrepõem (ignora as puladas). */
export function findConflicts(items: Occurrence[]): Array<[Occurrence, Occurrence]> {
  const timed = items.filter((i) => i.start !== null && i.status !== 'skipped').sort((a, b) => a.start! - b.start!);
  const pairs: Array<[Occurrence, Occurrence]> = [];
  for (let i = 0; i < timed.length; i++) {
    for (let j = i + 1; j < timed.length; j++) {
      if (timed[j].start! >= timed[i].end!) break;
      pairs.push([timed[i], timed[j]]);
    }
  }
  return pairs;
}

export const conflictKeys = (items: Occurrence[]) => new Set(findConflicts(items).flatMap(([a, b]) => [a.key, b.key]));

export interface Slot { start: number; end: number }

/**
 * Horários livres entre acordar e dormir.
 * `buffer` mantém uma folga antes e depois de cada compromisso (imprevistos),
 * e só devolve janelas com pelo menos `minSlot` minutos.
 */
export function freeSlots(
  items: Occurrence[],
  dayStart: number,
  dayEnd: number,
  { buffer = 10, minSlot = 30 }: { buffer?: number; minSlot?: number } = {},
): Slot[] {
  const busy = items
    .filter((i) => i.start !== null && i.status !== 'skipped')
    .map((i) => ({ start: Math.max(dayStart, i.start! - buffer), end: Math.min(dayEnd, i.end! + buffer) }))
    .filter((b) => b.end > b.start)
    .sort((a, b) => a.start - b.start);

  const slots: Slot[] = [];
  let cursor = dayStart;
  for (const b of busy) {
    if (b.start > cursor) slots.push({ start: cursor, end: b.start });
    cursor = Math.max(cursor, b.end);
  }
  if (dayEnd > cursor) slots.push({ start: cursor, end: dayEnd });
  return slots.filter((s) => s.end - s.start >= minSlot);
}

/** Próxima ocorrência ainda não concluída que termina depois de agora. */
export function nextOccurrence(items: Occurrence[], nowMin: number): Occurrence | null {
  return items.find((i) => i.start !== null && i.end! > nowMin && i.status === null) ?? null;
}
