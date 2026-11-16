import { describe, expect, it } from 'vitest';
import {
  computeNotices, dueEventReminders, inQuietHours, localNow, type ReminderEvent, type ReminderSettings,
} from '../../supabase/functions/_shared/reminders';

const ev = (p: Partial<ReminderEvent>): ReminderEvent => ({
  id: 'e', title: 'Santa Missa', location: null, start_date: '2026-11-01', start_time: '18:00',
  duration_minutes: 60, recurrence: { freq: 'daily' }, recurrence_until: null, reminder_minutes: 15, ...p,
});

const settings: ReminderSettings = {
  enabled: true, event_reminders: true, daily_digest: true, digest_time: '07:00',
  quiet_enabled: true, quiet_start: '22:00', quiet_end: '05:00', timezone: 'America/Sao_Paulo',
};

describe('fuso horário', () => {
  it('converte UTC para o horário de Brasília', () => {
    // 20:45 UTC = 17:45 em São Paulo
    expect(localNow(new Date('2026-11-16T20:45:00Z'), 'America/Sao_Paulo')).toEqual({ date: '2026-11-16', minutes: 17 * 60 + 45 });
  });
  it('vira o dia corretamente', () => {
    expect(localNow(new Date('2026-11-17T02:30:00Z'), 'America/Sao_Paulo')).toEqual({ date: '2026-11-16', minutes: 23 * 60 + 30 });
  });
});

describe('lembretes de compromissos', () => {
  const at = (min: number) => ({ date: '2026-11-16', minutes: min });

  it('dispara no minuto certo e tolera atraso de até 10 min', () => {
    const e = [ev({})];
    expect(dueEventReminders(e, at(17 * 60 + 44), new Set())).toHaveLength(0);
    expect(dueEventReminders(e, at(17 * 60 + 45), new Set())).toHaveLength(1);
    expect(dueEventReminders(e, at(17 * 60 + 54), new Set())).toHaveLength(1);
    expect(dueEventReminders(e, at(17 * 60 + 55), new Set())).toHaveLength(0);
  });

  it('texto informa quanto falta', () => {
    const [n] = dueEventReminders([ev({ location: 'Paróquia' })], at(17 * 60 + 45), new Set());
    expect(n.body).toBe('Em 15 min · 18:00 · Paróquia');
  });

  it('não avisa ocorrência concluída ou pulada', () => {
    expect(dueEventReminders([ev({})], at(17 * 60 + 45), new Set(['e|2026-11-16']))).toHaveLength(0);
  });

  it('respeita dias da semana', () => {
    const natacao = ev({ title: 'Natação', start_time: '16:00', recurrence: { freq: 'weekly', weekdays: [2] } });
    expect(dueEventReminders([natacao], { date: '2026-11-16', minutes: 15 * 60 + 45 }, new Set())).toHaveLength(0); // segunda
    expect(dueEventReminders([natacao], { date: '2026-11-17', minutes: 15 * 60 + 45 }, new Set())).toHaveLength(1); // terça
  });

  it('lembrete de 1 dia antes aponta para a data de amanhã', () => {
    const [n] = dueEventReminders([ev({ reminder_minutes: 1440, recurrence: null, start_date: '2026-11-17' })], at(18 * 60), new Set());
    expect(n.refDate).toBe('2026-11-17');
    expect(n.body.startsWith('Amanhã')).toBe(true);
  });

  it('lembrete que atravessa a meia-noite', () => {
    const e = ev({ start_time: '00:10', reminder_minutes: 30, recurrence: null, start_date: '2026-11-17' });
    const [n] = dueEventReminders([e], at(23 * 60 + 40), new Set());
    expect(n.refDate).toBe('2026-11-17');
  });
});

describe('preferências', () => {
  it('silêncio noturno que atravessa a meia-noite', () => {
    expect(inQuietHours(settings, 23 * 60)).toBe(true);
    expect(inQuietHours(settings, 4 * 60 + 59)).toBe(true);
    expect(inQuietHours(settings, 5 * 60)).toBe(false);
  });

  it('nada é enviado no silêncio ou com notificações desligadas', () => {
    const base = { events: [ev({ start_time: '22:30' })], statusByKey: new Set<string>(), taskCounts: { dueToday: 0, overdue: 0 } };
    expect(computeNotices({ ...base, settings, nowUtc: new Date('2026-11-17T01:15:00Z') }).notices).toHaveLength(0);
    expect(computeNotices({ ...base, settings: { ...settings, enabled: false }, nowUtc: new Date('2026-11-16T20:45:00Z') }).notices).toHaveLength(0);
  });

  it('resumo do dia no horário escolhido, e só se houver algo', () => {
    const nowUtc = new Date('2026-11-16T10:00:00Z'); // 07:00 em SP
    const withData = computeNotices({ settings, nowUtc, events: [ev({ reminder_minutes: null })], statusByKey: new Set(), taskCounts: { dueToday: 2, overdue: 1 } });
    expect(withData.notices.map((n) => n.body)).toEqual(['1 compromisso · 2 tarefas vencem hoje · 1 tarefa atrasada']);
    const empty = computeNotices({ settings, nowUtc, events: [], statusByKey: new Set(), taskCounts: { dueToday: 0, overdue: 0 } });
    expect(empty.notices).toHaveLength(0);
  });
});
