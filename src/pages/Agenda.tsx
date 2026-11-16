import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { addDays, format, isToday, parseISO, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import clsx from 'clsx';
import { AlertTriangle, ChevronLeft, ChevronRight, Lock, MapPin, Plus, Repeat, Bell } from 'lucide-react';
import { PageHeader } from '@/components/Layout';
import { Button, IconButton } from '@/components/ui/Button';
import { CheckButton, Empty, Spinner, useToast } from '@/components/ui/misc';
import { Sheet } from '@/components/ui/Sheet';
import { EventSheet, recurrenceLabel } from '@/components/EventSheet';
import { useProfile, useToggleOccurrence } from '@/hooks/data';
import { useDay } from '@/hooks/useDay';
import { useNow } from '@/hooks/useNow';
import { areaTone } from '@/lib/areas';
import { findConflicts, formatDuration, freeSlots, minutesToTime, timeToMinutes, toISODate, type Occurrence } from '@/lib/schedule';
import { friendlyError } from '@/lib/supabase';
import type { EventRow } from '@/lib/types';

const DEFAULT_WAKE = '06:00';
const DEFAULT_SLEEP = '22:00';

export default function AgendaPage() {
  const now = useNow();
  const [date, setDate] = useState(() => toISODate(new Date()));
  const day = useDay(date);
  const profile = useProfile();
  const toggle = useToggleOccurrence();
  const toast = useToast();
  const [editing, setEditing] = useState<EventRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [actions, setActions] = useState<Occurrence | null>(null);

  const d = parseISO(date);
  const week = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(d, { weekStartsOn: 1 }), i));
  const wake = profile.data?.wake_time ?? null;
  const sleep = profile.data?.sleep_time ?? null;
  const dayStart = timeToMinutes(wake ?? DEFAULT_WAKE)!;
  const dayEnd = timeToMinutes(sleep ?? DEFAULT_SLEEP)!;

  const slots = useMemo(() => freeSlots(day.items, dayStart, dayEnd, { buffer: 10, minSlot: 30 }), [day.items, dayStart, dayEnd]);
  const conflicts = useMemo(() => findConflicts(day.items), [day.items]);
  const busyMin = day.items.filter((i) => i.start !== null && i.status !== 'skipped').reduce((s, i) => s + (i.end! - i.start!), 0);
  const awake = dayEnd - dayStart;
  const overloaded = awake > 0 && busyMin / awake > 0.75;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const todayISO = toISODate(now);

  // Linha do tempo: compromissos e horários livres intercalados por horário
  const timeline = useMemo(() => {
    const allDay = day.items.filter((i) => i.start === null);
    const timed: Array<{ kind: 'event'; o: Occurrence; at: number } | { kind: 'free'; start: number; end: number; at: number }> = [
      ...day.items.filter((i) => i.start !== null).map((o) => ({ kind: 'event' as const, o, at: o.start! })),
      ...slots.map((s) => ({ kind: 'free' as const, ...s, at: s.start })),
    ].sort((a, b) => a.at - b.at);
    return { allDay, timed };
  }, [day.items, slots]);

  function setStatus(o: Occurrence, status: 'done' | 'skipped' | null) {
    toggle.mutate({ eventId: o.event.id, date: o.date, occurrenceId: o.occurrenceId, status }, { onError: (e) => toast(friendlyError(e)) });
  }

  return (
    <>
      <PageHeader title="Agenda" subtitle={format(d, "EEEE, d 'de' MMMM", { locale: ptBR })}>
        <IconButton label="Novo compromisso" onClick={() => setCreating(true)} className="bg-rose-600 text-white hover:bg-rose-700"><Plus size={22} /></IconButton>
      </PageHeader>

      {/* Seletor da semana */}
      <div className="px-5">
        <div className="mb-3 flex items-center justify-between">
          <IconButton label="Semana anterior" onClick={() => setDate(toISODate(addDays(d, -7)))}><ChevronLeft size={20} /></IconButton>
          <p className="text-sm capitalize text-ink-muted">{format(week[0], "d MMM", { locale: ptBR })} – {format(week[6], "d MMM", { locale: ptBR })}</p>
          <IconButton label="Próxima semana" onClick={() => setDate(toISODate(addDays(d, 7)))}><ChevronRight size={20} /></IconButton>
        </div>
        <ol className="mb-2 grid grid-cols-7 gap-1">
          {week.map((w) => {
            const iso = toISODate(w);
            const sel = iso === date;
            return (
              <li key={iso}>
                <button type="button" onClick={() => setDate(iso)} aria-current={sel ? 'date' : undefined}
                  aria-label={format(w, "EEEE, d 'de' MMMM", { locale: ptBR })}
                  className={clsx('flex h-16 w-full flex-col items-center justify-center rounded-2xl transition', sel ? 'bg-rose-600 text-white shadow-soft' : 'bg-white text-ink ring-1 ring-sand-200/70', !sel && isToday(w) && 'ring-2 ring-rose-300')}>
                  <span className={clsx('text-[11px] capitalize', sel ? 'text-rose-100' : 'text-ink-soft')}>{format(w, 'EEEEEE', { locale: ptBR })}</span>
                  <span className="text-lg font-semibold tabular-nums">{format(w, 'd')}</span>
                </button>
              </li>
            );
          })}
        </ol>
        {date !== todayISO && (
          <button type="button" onClick={() => setDate(todayISO)} className="mb-2 min-h-[36px] text-sm font-medium text-rose-700">Voltar para hoje</button>
        )}
      </div>

      <div className="space-y-3 px-5">
        {conflicts.length > 0 && (
          <div role="status" className="flex gap-2 rounded-2xl bg-butter-50 p-3 text-sm ring-1 ring-butter-200">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-butter-700" aria-hidden />
            <div>
              <p className="font-medium text-butter-700">{conflicts.length === 1 ? 'Há um conflito de horário' : `Há ${conflicts.length} conflitos de horário`}</p>
              <ul className="mt-1 text-ink-muted">
                {conflicts.map(([a, b]) => <li key={a.key + b.key}>{a.event.title} × {b.event.title}</li>)}
              </ul>
            </div>
          </div>
        )}
        {overloaded && (
          <p role="status" className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-700">
            Dia bem cheio: {formatDuration(busyMin)} de compromissos. Que tal reservar uma pausa?
          </p>
        )}

        {day.isLoading ? <Spinner /> : day.items.length === 0 ? (
          <Empty action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button size="sm" onClick={() => setCreating(true)}><Plus size={16} aria-hidden />Novo compromisso</Button>
              {!day.hasAnyEvent && <Link to="/importar-rotina" className="inline-flex min-h-[36px] items-center rounded-xl bg-rose-50 px-3 text-sm font-medium text-rose-700">Importar rotina inicial</Link>}
            </div>
          }>Nada marcado para este dia.</Empty>
        ) : (
          <div className="card p-2">
            {timeline.allDay.length > 0 && (
              <ul className="mb-1 border-b border-sand-100 pb-1">
                {timeline.allDay.map((o) => <EventItem key={o.key} o={o} conflict={false} onOpen={() => setActions(o)} onToggle={() => setStatus(o, o.status === 'done' ? null : 'done')} />)}
              </ul>
            )}
            <ul>
              {timeline.timed.map((t) =>
                t.kind === 'event' ? (
                  <EventItem key={t.o.key} o={t.o} conflict={day.conflicts.has(t.o.key)} now={date === todayISO ? nowMin : undefined}
                    onOpen={() => setActions(t.o)} onToggle={() => setStatus(t.o, t.o.status === 'done' ? null : 'done')} />
                ) : (
                  <li key={`free-${t.start}`} className="mx-2 my-1 flex items-center gap-3 rounded-xl border border-dashed border-sky-200 bg-sky-50/60 px-3 py-2 text-sm text-sky-700">
                    <span className="tabular-nums">{minutesToTime(t.start)}–{minutesToTime(t.end)}</span>
                    <span>Livre · {formatDuration(t.end - t.start)}</span>
                  </li>
                ),
              )}
            </ul>
          </div>
        )}
        <p className="px-1 text-xs text-ink-soft">
          Horários livres consideram {wake && sleep ? 'seus horários de sono' : `${DEFAULT_WAKE}–${DEFAULT_SLEEP}`} e uma folga de 10 min entre compromissos para imprevistos.
          {!(wake && sleep) && <> <Link to="/perfil" className="text-rose-700 underline-offset-2 hover:underline">Definir no perfil</Link>.</>}
        </p>
      </div>

      <Sheet open={!!actions} onClose={() => setActions(null)} title={actions?.event.title ?? ''}>
        {actions && (
          <div className="pb-2">
            <p className="mb-1 text-sm text-ink-muted">
              {actions.start === null ? 'Dia inteiro' : `${minutesToTime(actions.start)}–${minutesToTime(actions.end!)}`} · {recurrenceLabel(actions.event.recurrence)}
            </p>
            {actions.event.location && <p className="mb-1 text-sm text-ink-muted">{actions.event.location}</p>}
            {actions.event.description && <p className="mb-3 whitespace-pre-wrap text-sm">{actions.event.description}</p>}
            <div className="mt-4 grid gap-2">
              <Button onClick={() => { setStatus(actions, actions.status === 'done' ? null : 'done'); setActions(null); }}>
                {actions.status === 'done' ? 'Desmarcar como concluído' : 'Marcar como concluído'}
              </Button>
              {actions.event.recurrence && (
                <Button variant="soft" onClick={() => { setStatus(actions, actions.status === 'skipped' ? null : 'skipped'); setActions(null); }}>
                  {actions.status === 'skipped' ? 'Restaurar neste dia' : 'Pular só neste dia'}
                </Button>
              )}
              <Button variant="ghost" onClick={() => { setEditing(actions.event); setActions(null); }}>
                Editar {actions.event.recurrence ? 'compromisso recorrente' : 'compromisso'}
              </Button>
            </div>
          </div>
        )}
      </Sheet>
      <EventSheet open={creating || !!editing} event={editing} defaultDate={date} onClose={() => { setCreating(false); setEditing(null); }} />
    </>
  );
}

function EventItem({ o, conflict, now, onOpen, onToggle }: { o: Occurrence; conflict: boolean; now?: number; onOpen: () => void; onToggle: () => void }) {
  const done = o.status === 'done';
  const skipped = o.status === 'skipped';
  const live = now !== undefined && o.start !== null && o.start <= now && o.end! > now;
  return (
    <li className={clsx('flex items-center gap-3 rounded-xl px-2 py-1.5', live && 'bg-rose-50')}>
      <CheckButton done={done} label={`${done ? 'Desmarcar' : 'Concluir'} ${o.event.title}`} onToggle={onToggle} disabled={skipped} />
      <span className={clsx('h-10 w-1 shrink-0 rounded-full', areaTone(o.event.area).bar)} aria-hidden />
      <button type="button" onClick={onOpen} className="min-h-[48px] min-w-0 flex-1 text-left">
        <span className={clsx('block truncate text-[15px]', (done || skipped) && 'text-ink-soft', done && 'line-through')}>
          {o.event.title}{skipped && ' (pulado)'}
        </span>
        <span className="flex flex-wrap items-center gap-x-2 text-xs text-ink-soft">
          <span className="tabular-nums">{o.start === null ? 'Dia inteiro' : `${minutesToTime(o.start)}–${minutesToTime(o.end!)}`}</span>
          {o.event.recurrence && <Repeat size={11} aria-label="Recorrente" />}
          {o.event.reminder_minutes != null && <Bell size={11} aria-label="Com lembrete" />}
          {o.event.location && <span className="inline-flex items-center gap-0.5"><MapPin size={11} aria-hidden />{o.event.location}</span>}
        </span>
      </button>
      {o.event.is_fixed && <Lock size={14} className="shrink-0 text-ink-soft" aria-label="Compromisso fixo" />}
      {conflict && <AlertTriangle size={16} className="shrink-0 text-butter-700" aria-label="Conflito de horário" />}
    </li>
  );
}
