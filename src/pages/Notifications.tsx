import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BellRing, BellOff, Send, Share, SquarePlus } from 'lucide-react';
import { PageHeader } from '@/components/Layout';
import { Button } from '@/components/ui/Button';
import { ErrorText, Field, Input, Toggle } from '@/components/ui/Field';
import { Spinner, useToast } from '@/components/ui/misc';
import { useUserId } from '@/hooks/useAuth';
import { friendlyError, supabase } from '@/lib/supabase';
import { currentSubscription, disablePushOnThisDevice, enablePush, pushSupport, sendTestNotification } from '@/lib/push';

interface Settings {
  enabled: boolean;
  event_reminders: boolean;
  daily_digest: boolean;
  digest_time: string;
  quiet_enabled: boolean;
  quiet_start: string;
  quiet_end: string;
  timezone: string;
}

const deviceTz = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo';
const DEFAULTS: Settings = {
  enabled: true, event_reminders: true, daily_digest: true, digest_time: '07:00',
  quiet_enabled: true, quiet_start: '22:00', quiet_end: '05:00', timezone: deviceTz(),
};

function useSettings() {
  const uid = useUserId();
  return useQuery({
    queryKey: ['notification_settings', uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.from('notification_settings').select('*').eq('user_id', uid).maybeSingle();
      if (error) throw error;
      return data as (Settings & { user_id: string }) | null;
    },
  });
}

function useLog() {
  const uid = useUserId();
  return useQuery({
    queryKey: ['notification_log', uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase.from('notification_log').select('id,kind,title,sent_at').order('sent_at', { ascending: false }).limit(10);
      if (error) throw error;
      return data as Array<{ id: string; kind: string; title: string | null; sent_at: string }>;
    },
  });
}

export default function NotificationsPage() {
  const settings = useSettings();
  const log = useLog();
  const qc = useQueryClient();
  const toast = useToast();
  const support = pushSupport();
  const [form, setForm] = useState<Settings>(DEFAULTS);
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | 'n/a'>(() => ('Notification' in window ? Notification.permission : 'n/a'));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (settings.data) {
      const s = settings.data;
      setForm({ ...s, digest_time: s.digest_time.slice(0, 5), quiet_start: s.quiet_start.slice(0, 5), quiet_end: s.quiet_end.slice(0, 5) });
    }
  }, [settings.data]);

  useEffect(() => {
    currentSubscription().then((s) => setSubscribed(!!s)).catch(() => setSubscribed(false));
  }, []);

  const save = useMutation({
    mutationFn: async (s: Settings) => {
      const { error } = await supabase.from('notification_settings').upsert(s, { onConflict: 'user_id' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notification_settings'] }),
  });

  async function activate() {
    setError('');
    setBusy(true);
    try {
      const result = await enablePush();
      setPermission(result);
      if (result !== 'granted') {
        setError(result === 'denied' ? 'As notificações foram bloqueadas. Libere em Ajustes do iPhone → Notificações → Minha Rotina.' : 'Permissão não concedida.');
        return;
      }
      setSubscribed(true);
      // primeira ativação cria as preferências padrão
      if (!settings.data) await save.mutateAsync(form);
      toast('Notificações ativadas neste aparelho');
    } catch (err) { setError(friendlyError(err)); } finally { setBusy(false); }
  }

  async function deactivate() {
    setBusy(true);
    try { await disablePushOnThisDevice(); setSubscribed(false); toast('Notificações desativadas neste aparelho'); }
    catch (err) { setError(friendlyError(err)); } finally { setBusy(false); }
  }

  async function test() {
    setBusy(true);
    try {
      const r = await sendTestNotification();
      toast(r.sent ? 'Teste enviado. Deve chegar em instantes.' : 'Nenhum aparelho inscrito recebeu o teste.');
    } catch (err) { setError(`Não foi possível enviar o teste: ${friendlyError(err)}`); } finally { setBusy(false); }
  }

  async function submit() {
    setError('');
    try { await save.mutateAsync(form); toast('Preferências salvas'); } catch (err) { setError(friendlyError(err)); }
  }

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <>
      <PageHeader title="Notificações" subtitle="Lembretes que respeitam seu tempo" />
      <div className="space-y-3 px-5">
        <ErrorText>{error}</ErrorText>

        <section className="card" aria-label="Este aparelho">
          <h2 className="mb-2 text-xl font-semibold">Este aparelho</h2>
          {support === 'ios-not-installed' ? (
            <div className="text-sm text-ink-muted">
              <p className="mb-3">No iPhone, as notificações só funcionam com o app instalado na Tela de Início (iOS 16.4 ou mais recente).</p>
              <ol className="space-y-2">
                <li className="flex items-center gap-2"><span className="chip bg-rose-100 text-rose-700">1</span>No Safari, toque em <Share size={16} aria-label="Compartilhar" className="text-sky-700" /> Compartilhar</li>
                <li className="flex items-center gap-2"><span className="chip bg-rose-100 text-rose-700">2</span>Escolha <SquarePlus size={16} aria-hidden /> Adicionar à Tela de Início</li>
                <li className="flex items-center gap-2"><span className="chip bg-rose-100 text-rose-700">3</span>Abra o Minha Rotina pelo ícone e volte aqui</li>
              </ol>
            </div>
          ) : support === 'no-config' ? (
            <p className="text-sm text-ink-muted">O envio ainda não foi configurado no servidor (falta a chave pública VAPID). Veja o passo a passo no README.</p>
          ) : support === 'unsupported' ? (
            <p className="text-sm text-ink-muted">Este navegador não oferece notificações push.</p>
          ) : subscribed === null ? <Spinner /> : subscribed ? (
            <>
              <p className="mb-3 flex items-center gap-2 text-sm text-ink"><BellRing size={18} className="text-rose-500" aria-hidden />Notificações ativas neste aparelho.</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="soft" onClick={test} loading={busy}><Send size={15} aria-hidden />Enviar teste</Button>
                <Button size="sm" variant="ghost" onClick={deactivate} disabled={busy}><BellOff size={15} aria-hidden />Desativar aqui</Button>
              </div>
            </>
          ) : (
            <>
              <p className="mb-3 text-sm text-ink-muted">
                {permission === 'denied'
                  ? 'As notificações estão bloqueadas. Libere em Ajustes do iPhone → Notificações → Minha Rotina e toque abaixo.'
                  : 'Ative para receber lembretes mesmo com o app fechado.'}
              </p>
              <Button className="w-full" onClick={activate} loading={busy}><BellRing size={17} aria-hidden />Ativar notificações</Button>
            </>
          )}
        </section>

        {settings.isLoading ? <Spinner /> : (
          <section className="card" aria-label="Preferências">
            <h2 className="mb-3 text-xl font-semibold">Preferências</h2>
            <Toggle label="Receber notificações" description="Desligue para pausar todos os avisos, em todos os aparelhos." checked={form.enabled} onChange={(v) => set('enabled', v)} />
            <div className={form.enabled ? '' : 'pointer-events-none opacity-50'} aria-disabled={!form.enabled}>
              <Toggle label="Lembretes de compromissos" description="Usa o lembrete escolhido em cada compromisso da Agenda. Concluídos e pulados não avisam." checked={form.event_reminders} onChange={(v) => set('event_reminders', v)} />
              <Toggle label="Resumo do dia" description="Compromissos, prazos e tarefas atrasadas. Não é enviado em dias livres." checked={form.daily_digest} onChange={(v) => set('daily_digest', v)} />
              {form.daily_digest && (
                <Field label="Horário do resumo">{(id) => <Input id={id} type="time" value={form.digest_time} onChange={(e) => set('digest_time', e.target.value)} />}</Field>
              )}
              <Toggle label="Silêncio noturno" description="Nenhum aviso nesse intervalo, para proteger seu descanso." checked={form.quiet_enabled} onChange={(v) => set('quiet_enabled', v)} />
              {form.quiet_enabled && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Das">{(id) => <Input id={id} type="time" value={form.quiet_start} onChange={(e) => set('quiet_start', e.target.value)} />}</Field>
                  <Field label="Até">{(id) => <Input id={id} type="time" value={form.quiet_end} onChange={(e) => set('quiet_end', e.target.value)} />}</Field>
                </div>
              )}
              <p className="mb-4 text-xs text-ink-soft">
                Fuso horário: {form.timezone}
                {form.timezone !== deviceTz() && (
                  <> · <button type="button" className="min-h-[32px] font-medium text-rose-700" onClick={() => set('timezone', deviceTz())}>usar o deste aparelho ({deviceTz()})</button></>
                )}
              </p>
            </div>
            <Button className="w-full" onClick={submit} loading={save.isPending}>Salvar preferências</Button>
          </section>
        )}

        {(log.data ?? []).length > 0 && (
          <section className="card" aria-label="Avisos recentes">
            <h2 className="mb-2 text-xl font-semibold">Avisos recentes</h2>
            <ul className="divide-y divide-sand-100 text-sm">
              {log.data!.map((l) => (
                <li key={l.id} className="flex justify-between gap-3 py-2">
                  <span className="truncate">{l.kind === 'digest' ? 'Resumo do dia' : l.title}</span>
                  <span className="shrink-0 tabular-nums text-ink-soft">{format(new Date(l.sent_at), "dd/MM HH:mm", { locale: ptBR })}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
