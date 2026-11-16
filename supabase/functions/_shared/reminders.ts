/**
 * Cálculo puro dos lembretes — sem dependências, roda em Deno (Edge Function)
 * e em Node (testes do app). Todas as datas/horas são no fuso da usuária.
 */

export type Recurrence = { freq: 'daily' } | { freq: 'weekly'; weekdays: number[] } | null;

export interface ReminderEvent {
  id: string;
  title: string;
  location: string | null;
  start_date: string;
  start_time: string | null;
  duration_minutes: number;
  recurrence: Recurrence;
  recurrence_until: string | null;
  reminder_minutes: number | null;
}

export interface ReminderSettings {
  enabled: boolean;
  event_reminders: boolean;
  daily_digest: boolean;
  digest_time: string;
  quiet_enabled: boolean;
  quiet_start: string;
  quiet_end: string;
  timezone: string;
}

export interface Notice {
  kind: 'event' | 'digest';
  refId: string;
  refDate: string;
  title: string;
  body: string;
  url: string;
  tag: string;
}

/** Atraso máximo tolerado (cron parado/lento) antes de um aviso ser descartado. */
export const CATCH_UP_MINUTES = 10;
/** O resumo do dia ainda é enviado até 2h depois do horário escolhido. */
export const DIGEST_WINDOW_MINUTES = 120;

export const toMinutes = (t: string | null | undefined): number | null => {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};

const pad = (n: number) => String(n).padStart(2, '0');
export const hhmm = (min: number) => `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`;

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const weekdayOf = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay();

/** Data (yyyy-MM-dd) e minuto do dia de um instante, num fuso IANA. */
export function localNow(now: Date, timeZone: string): { date: string; minutes: number } {
  let tz = timeZone;
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); } catch { tz = 'America/Sao_Paulo'; }
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(now).map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

export function occursOn(ev: Pick<ReminderEvent, 'start_date' | 'recurrence' | 'recurrence_until'>, iso: string): boolean {
  if (iso < ev.start_date) return false;
  if (!ev.recurrence) return iso === ev.start_date;
  if (ev.recurrence_until && iso > ev.recurrence_until) return false;
  if (ev.recurrence.freq === 'daily') return true;
  return ev.recurrence.weekdays.includes(weekdayOf(iso));
}

export function inQuietHours(s: Pick<ReminderSettings, 'quiet_enabled' | 'quiet_start' | 'quiet_end'>, minutes: number): boolean {
  if (!s.quiet_enabled) return false;
  const a = toMinutes(s.quiet_start)!;
  const b = toMinutes(s.quiet_end)!;
  if (a === b) return false;
  return a < b ? minutes >= a && minutes < b : minutes >= a || minutes < b;
}

function reminderBody(ev: ReminderEvent, startMin: number, dayOffset: number, minutesUntil: number): string {
  const when = minutesUntil <= 0 ? 'Agora' : minutesUntil < 60 ? `Em ${minutesUntil} min` : dayOffset === 0 ? 'Hoje' : dayOffset === 1 ? 'Amanhã' : `Em ${dayOffset} dias`;
  return `${when} · ${hhmm(startMin)}${ev.location ? ` · ${ev.location}` : ''}`;
}

/**
 * Lembretes de compromissos que vencem agora.
 * Um aviso é devido quando o instante do lembrete caiu nos últimos CATCH_UP_MINUTES.
 * `statusByKey` traz ocorrências concluídas/puladas (`eventId|data`) — essas não avisam.
 */
export function dueEventReminders(
  events: ReminderEvent[],
  now: { date: string; minutes: number },
  statusByKey: Set<string>,
): Notice[] {
  const out: Notice[] = [];
  for (const ev of events) {
    const start = toMinutes(ev.start_time);
    if (start === null || ev.reminder_minutes == null) continue;
    const maxOffset = Math.ceil((ev.reminder_minutes + start) / 1440);
    for (let offset = 0; offset <= Math.min(maxOffset, 8); offset++) {
      const date = addDaysISO(now.date, offset);
      if (!occursOn(ev, date)) continue;
      const startAbs = offset * 1440 + start; // minutos a partir de 00:00 de hoje
      const remindAt = startAbs - ev.reminder_minutes;
      if (remindAt > now.minutes || remindAt <= now.minutes - CATCH_UP_MINUTES) continue;
      if (startAbs + ev.duration_minutes <= now.minutes) continue; // já terminou
      if (statusByKey.has(`${ev.id}|${date}`)) continue;
      out.push({
        kind: 'event',
        refId: ev.id,
        refDate: date,
        title: ev.title,
        body: reminderBody(ev, start, offset, startAbs - now.minutes),
        url: '/agenda',
        tag: `event-${ev.id}-${date}`,
      });
    }
  }
  return out;
}

export function digestIsDue(s: Pick<ReminderSettings, 'daily_digest' | 'digest_time'>, nowMin: number): boolean {
  if (!s.daily_digest) return false;
  const t = toMinutes(s.digest_time)!;
  return nowMin >= t && nowMin < t + DIGEST_WINDOW_MINUTES;
}

export function digestNotice(date: string, counts: { events: number; dueToday: number; overdue: number }): Notice | null {
  const parts: string[] = [];
  if (counts.events) parts.push(`${counts.events} ${counts.events === 1 ? 'compromisso' : 'compromissos'}`);
  if (counts.dueToday) parts.push(`${counts.dueToday} ${counts.dueToday === 1 ? 'tarefa vence' : 'tarefas vencem'} hoje`);
  if (counts.overdue) parts.push(`${counts.overdue} ${counts.overdue === 1 ? 'tarefa atrasada' : 'tarefas atrasadas'}`);
  if (!parts.length) return null; // dia livre: não incomoda
  return { kind: 'digest', refId: 'digest', refDate: date, title: 'Seu dia', body: parts.join(' · '), url: '/', tag: `digest-${date}` };
}

/** Aplica preferências e silêncio à lista final. */
export function computeNotices(args: {
  settings: ReminderSettings;
  nowUtc: Date;
  events: ReminderEvent[];
  statusByKey: Set<string>;
  taskCounts: { dueToday: number; overdue: number };
}): { now: { date: string; minutes: number }; notices: Notice[] } {
  const { settings: s } = args;
  const now = localNow(args.nowUtc, s.timezone);
  if (!s.enabled || inQuietHours(s, now.minutes)) return { now, notices: [] };
  const notices: Notice[] = [];
  if (s.event_reminders) notices.push(...dueEventReminders(args.events, now, args.statusByKey));
  if (digestIsDue(s, now.minutes)) {
    const eventsToday = args.events.filter((e) => occursOn(e, now.date) && !args.statusByKey.has(`${e.id}|${now.date}`)).length;
    const d = digestNotice(now.date, { events: eventsToday, ...args.taskCounts });
    if (d) notices.push(d);
  }
  return { now, notices };
}
