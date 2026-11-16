import { supabase } from './supabase';

// Chave pública VAPID: variável de build ou, na falta dela, lida do banco (Vault).
let VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export async function loadVapidKey(): Promise<string | undefined> {
  if (VAPID_PUBLIC_KEY) return VAPID_PUBLIC_KEY;
  const { data } = await supabase.rpc('get_vapid_public_key');
  if (typeof data === 'string' && data) VAPID_PUBLIC_KEY = data;
  return VAPID_PUBLIC_KEY;
}

export type PushSupport =
  | 'ok'
  | 'no-config'          // falta VITE_VAPID_PUBLIC_KEY
  | 'ios-not-installed'  // iPhone/iPad no Safari: precisa adicionar à Tela de Início
  | 'unsupported';       // navegador sem Web Push

export const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

export function pushSupport(): PushSupport {
  if (!VAPID_PUBLIC_KEY) return 'no-config';
  const has = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (isIOS() && !isStandalone()) return 'ios-not-installed';
  return has ? 'ok' : 'unsupported';
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function registration() {
  const reg = await navigator.serviceWorker.ready;
  return reg;
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (pushSupport() !== 'ok') return null;
  return (await registration()).pushManager.getSubscription();
}

async function saveSubscription(sub: PushSubscription) {
  const json = sub.toJSON();
  const { error } = await supabase.from('push_subscriptions').upsert(
    { endpoint: sub.endpoint, p256dh: json.keys!.p256dh, auth: json.keys!.auth, user_agent: navigator.userAgent.slice(0, 400) },
    { onConflict: 'endpoint' },
  );
  if (error) throw error;
}

/** Pede permissão (precisa vir de um toque da usuária) e inscreve este aparelho. */
export async function enablePush(): Promise<'granted' | 'denied' | 'default'> {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission;
  const reg = await registration();
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY!) as BufferSource }));
  await saveSubscription(sub);
  return 'granted';
}

/** Desinscreve este aparelho (ex.: ao sair da conta). */
export async function disablePushOnThisDevice() {
  const sub = await currentSubscription().catch(() => null);
  if (!sub) return;
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe().catch(() => undefined);
}

/** Ao abrir o app, garante que a inscrição atual está salva (o navegador pode renová-la). */
export async function syncSubscription() {
  await loadVapidKey();
  if (pushSupport() !== 'ok' || Notification.permission !== 'granted') return;
  const sub = await currentSubscription();
  if (sub) await saveSubscription(sub).catch(() => undefined);
}

export async function sendTestNotification(): Promise<{ sent: number; devices: number }> {
  const { data, error } = await supabase.functions.invoke('send-reminders', { body: { test: true } });
  if (error) throw error;
  return data as { sent: number; devices: number };
}
