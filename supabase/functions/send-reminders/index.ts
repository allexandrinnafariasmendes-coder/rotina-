// Edge Function: send-reminders
// - Modo agendado (pg_cron a cada minuto): cabeçalho `x-cron-secret` = segredo CRON_SECRET.
//   Calcula e envia os lembretes devidos de todas as usuárias.
// - Modo teste: chamada autenticada do app com { "test": true }.
//   Envia uma notificação de teste só para os aparelhos da própria usuária.
//
// Configuração: lida do Supabase Vault pela função public.get_push_config()
// (push_vapid_public, push_vapid_private, push_vapid_subject, reminders_cron_secret).
// Variáveis de ambiente com os mesmos papéis (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
// VAPID_SUBJECT, CRON_SECRET) têm prioridade, se existirem.
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem em toda Edge Function.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
import { computeNotices, type Notice, type ReminderEvent, type ReminderSettings } from '../_shared/reminders.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

const env = (k: string) => {
  const v = Deno.env.get(k);
  if (!v) throw new Error(`Variável ${k} não configurada`);
  return v;
};

const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });

let config: { cronSecret: string } | null = null;
async function loadConfig() {
  if (config) return config;
  const { data, error } = await admin.rpc('get_push_config');
  if (error) throw error;
  const vault = (data ?? {}) as Record<string, string>;
  const pick = (envName: string, vaultName: string) => {
    const v = Deno.env.get(envName) || vault[vaultName];
    if (!v) throw new Error(`Configuração ${vaultName} ausente`);
    return v;
  };
  webpush.setVapidDetails(pick('VAPID_SUBJECT', 'push_vapid_subject'), pick('VAPID_PUBLIC_KEY', 'push_vapid_public'), pick('VAPID_PRIVATE_KEY', 'push_vapid_private'));
  config = { cronSecret: pick('CRON_SECRET', 'reminders_cron_secret') };
  return config;
}

interface Sub { id: string; endpoint: string; p256dh: string; auth: string }

/** Envia para todos os aparelhos da usuária; remove inscrições expiradas. */
async function deliver(db: SupabaseClient, subs: Sub[], n: Pick<Notice, 'title' | 'body' | 'url' | 'tag'>) {
  let ok = 0;
  const payload = JSON.stringify(n);
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 30, urgency: 'high' });
      ok++;
      await db.from('push_subscriptions').update({ last_used_at: new Date().toISOString() }).eq('id', s.id);
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await db.from('push_subscriptions').delete().eq('id', s.id);
      else console.error('push falhou', status, (err as Error).message);
    }
  }));
  return ok;
}

async function processUser(settings: ReminderSettings & { user_id: string }, subs: Sub[], nowUtc: Date) {
  const uid = settings.user_id;
  const { data: events, error: e1 } = await admin
    .from('events')
    .select('id,title,location,start_date,start_time,duration_minutes,recurrence,recurrence_until,reminder_minutes')
    .eq('user_id', uid);
  if (e1) throw e1;

  // datas relevantes: ontem..+8 dias cobrem qualquer lembrete permitido pela interface
  const today = new Date(nowUtc.getTime() - 36 * 3600_000).toISOString().slice(0, 10);
  const until = new Date(nowUtc.getTime() + 9 * 86400_000).toISOString().slice(0, 10);
  const { data: occ, error: e2 } = await admin
    .from('event_occurrences').select('event_id,occurrence_date').eq('user_id', uid)
    .gte('occurrence_date', today).lte('occurrence_date', until);
  if (e2) throw e2;
  const statusByKey = new Set((occ ?? []).map((o) => `${o.event_id}|${o.occurrence_date}`));

  // tarefas para o resumo (contadas no fuso dela, depois de saber a data local)
  const { data: tasks, error: e3 } = await admin.from('tasks').select('due_date').eq('user_id', uid).eq('status', 'todo').not('due_date', 'is', null);
  if (e3) throw e3;

  const first = computeNotices({ settings, nowUtc, events: (events ?? []) as ReminderEvent[], statusByKey, taskCounts: { dueToday: 0, overdue: 0 } });
  const localDate = first.now.date;
  const taskCounts = {
    dueToday: (tasks ?? []).filter((t) => t.due_date === localDate).length,
    overdue: (tasks ?? []).filter((t) => t.due_date < localDate).length,
  };
  const { notices } = computeNotices({ settings, nowUtc, events: (events ?? []) as ReminderEvent[], statusByKey, taskCounts });

  let sent = 0;
  for (const n of notices) {
    // "reserva" o envio: se outra execução já reservou, o insert não retorna linha
    const { data: claimed } = await admin
      .from('notification_log')
      .upsert({ user_id: uid, kind: n.kind, ref_id: n.refId, ref_date: n.refDate, title: n.title }, { onConflict: 'user_id,kind,ref_id,ref_date', ignoreDuplicates: true })
      .select('id');
    if (!claimed?.length) continue;
    sent += await deliver(admin, subs, n);
  }
  return sent;
}

async function runScheduled() {
  const nowUtc = new Date();
  const { data: settings, error } = await admin.from('notification_settings').select('*').eq('enabled', true);
  if (error) throw error;
  if (!settings?.length) return { users: 0, sent: 0 };
  const { data: subs, error: e2 } = await admin.from('push_subscriptions').select('id,user_id,endpoint,p256dh,auth').in('user_id', settings.map((s) => s.user_id));
  if (e2) throw e2;

  let sent = 0;
  let users = 0;
  for (const s of settings) {
    const mine = (subs ?? []).filter((x) => x.user_id === s.user_id);
    if (!mine.length) continue;
    users++;
    try { sent += await processUser(s, mine, nowUtc); } catch (err) { console.error('usuária', s.user_id, err); }
  }
  return { users, sent };
}

async function runTest(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return new Response(JSON.stringify({ error: 'não autenticada' }), { status: 401, headers: cors });
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return new Response(JSON.stringify({ error: 'sessão inválida' }), { status: 401, headers: cors });
  const { data: subs } = await admin.from('push_subscriptions').select('id,endpoint,p256dh,auth').eq('user_id', user.id);
  if (!subs?.length) return Response.json({ sent: 0, devices: 0 }, { headers: cors });
  const sent = await deliver(admin, subs, { title: 'Minha Rotina', body: 'Notificações funcionando por aqui. ✨', url: '/notificacoes', tag: 'test' });
  return Response.json({ sent, devices: subs.length }, { headers: cors });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const cfg = await loadConfig();
    if (req.headers.get('x-cron-secret')) {
      if (req.headers.get('x-cron-secret') !== cfg.cronSecret) return new Response('forbidden', { status: 403 });
      return Response.json(await runScheduled());
    }
    const body = await req.json().catch(() => ({}));
    if (body?.test) return await runTest(req);
    return new Response(JSON.stringify({ error: 'requisição inválida' }), { status: 400, headers: cors });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } });
  }
});
