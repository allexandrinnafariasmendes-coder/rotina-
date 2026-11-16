import { useEffect, useState, type FormEvent } from 'react';
import clsx from 'clsx';
import { Sheet } from './ui/Sheet';
import { Button } from './ui/Button';
import { ErrorText, Field, Input, Select, Textarea, Toggle } from './ui/Field';
import { useToast } from './ui/misc';
import { useEventMutations } from '@/hooks/data';
import { AREA_OPTIONS } from '@/lib/areas';
import { friendlyError } from '@/lib/supabase';
import type { Area, EventRow, Recurrence } from '@/lib/types';

export const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const WEEKDAYS_LONG = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

export function recurrenceLabel(r: Recurrence | null): string {
  if (!r) return 'Não se repete';
  if (r.freq === 'daily') return 'Todos os dias';
  const d = [...r.weekdays].sort();
  if (d.join() === '1,2,3,4,5') return 'Dias úteis';
  return d.map((i) => WEEKDAYS[i]).join(', ');
}

type RepeatMode = 'none' | 'daily' | 'weekly';

export function EventSheet({ open, onClose, event, defaultDate }: {
  open: boolean; onClose: () => void; event?: EventRow | null; defaultDate: string;
}) {
  const { create, update, remove } = useEventMutations();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [area, setArea] = useState<Area>('rotina');
  const [date, setDate] = useState(defaultDate);
  const [allDay, setAllDay] = useState(false);
  const [time, setTime] = useState('08:00');
  const [duration, setDuration] = useState(30);
  const [repeat, setRepeat] = useState<RepeatMode>('none');
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [until, setUntil] = useState('');
  const [fixed, setFixed] = useState(false);
  const [reminder, setReminder] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setConfirmDelete(false);
    setTitle(event?.title ?? '');
    setArea(event?.area ?? 'rotina');
    setDate(event?.start_date ?? defaultDate);
    setAllDay(event ? !event.start_time : false);
    setTime(event?.start_time?.slice(0, 5) ?? '08:00');
    setDuration(event?.duration_minutes ?? 30);
    setRepeat(event?.recurrence ? event.recurrence.freq : 'none');
    setWeekdays(event?.recurrence?.freq === 'weekly' ? event.recurrence.weekdays : [new Date(`${defaultDate}T12:00`).getDay()]);
    setUntil(event?.recurrence_until ?? '');
    setFixed(event?.is_fixed ?? false);
    setReminder(event?.reminder_minutes != null ? String(event.reminder_minutes) : '');
    setLocation(event?.location ?? '');
    setDescription(event?.description ?? '');
  }, [open, event, defaultDate]);

  const saving = create.isPending || update.isPending;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError('Dê um nome ao compromisso.');
    if (repeat === 'weekly' && weekdays.length === 0) return setError('Escolha pelo menos um dia da semana.');
    if (until && until < date) return setError('A data final da repetição deve ser depois do início.');
    const recurrence: Recurrence | null =
      repeat === 'none' ? null : repeat === 'daily' ? { freq: 'daily' } : { freq: 'weekly', weekdays: [...weekdays].sort() };
    const row = {
      title: title.trim(),
      area,
      start_date: date,
      start_time: allDay ? null : time,
      duration_minutes: Math.max(1, Math.min(1440, duration || 30)),
      recurrence,
      recurrence_until: recurrence && until ? until : null,
      is_fixed: fixed,
      reminder_minutes: reminder === '' ? null : Number(reminder),
      location: location.trim() || null,
      description: description.trim() || null,
    };
    try {
      if (event) await update.mutateAsync({ id: event.id, ...row });
      else await create.mutateAsync(row);
      toast(event ? 'Compromisso atualizado' : 'Compromisso criado');
      onClose();
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  async function doDelete() {
    if (!event) return;
    try {
      await remove.mutateAsync(event.id);
      toast('Compromisso excluído');
      onClose();
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={event ? 'Editar compromisso' : 'Novo compromisso'}
      footer={
        <div className="flex gap-2">
          {event && (
            <Button type="button" variant="danger" onClick={() => (confirmDelete ? doDelete() : setConfirmDelete(true))} loading={remove.isPending}>
              {confirmDelete ? 'Confirmar exclusão' : 'Excluir'}
            </Button>
          )}
          <Button type="submit" form="event-form" className="flex-1" loading={saving}>Salvar</Button>
        </div>
      }
    >
      <form id="event-form" onSubmit={submit} noValidate>
        <ErrorText>{error}</ErrorText>
        <Field label="Título">{(id) => <Input id={id} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} placeholder="Ex.: Santa Missa" />}</Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Área">{(id) => (
            <Select id={id} value={area} onChange={(e) => setArea(e.target.value as Area)}>
              {AREA_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          )}</Field>
          <Field label={repeat === 'none' ? 'Data' : 'Começa em'}>{(id) => <Input id={id} type="date" value={date} onChange={(e) => setDate(e.target.value)} />}</Field>
        </div>
        <Toggle label="Dia inteiro" checked={allDay} onChange={setAllDay} />
        {!allDay && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Horário">{(id) => <Input id={id} type="time" value={time} onChange={(e) => setTime(e.target.value)} />}</Field>
            <Field label="Duração (min)">{(id) => <Input id={id} type="number" inputMode="numeric" min={1} max={1440} step={5} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />}</Field>
          </div>
        )}

        <fieldset className="mb-4">
          <legend className="field-label">Repetição</legend>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-sand-100 p-1" role="radiogroup">
            {([['none', 'Não repete'], ['daily', 'Diária'], ['weekly', 'Semanal']] as const).map(([v, l]) => (
              <button key={v} type="button" role="radio" aria-checked={repeat === v} onClick={() => setRepeat(v)}
                className={clsx('min-h-[40px] rounded-lg text-sm transition', repeat === v ? 'bg-white text-ink shadow-soft' : 'text-ink-muted')}>
                {l}
              </button>
            ))}
          </div>
          {repeat === 'weekly' && (
            <div className="mt-3 flex justify-between gap-1" role="group" aria-label="Dias da semana">
              {WEEKDAYS.map((d, i) => {
                const on = weekdays.includes(i);
                return (
                  <button key={d} type="button" aria-pressed={on} aria-label={WEEKDAYS_LONG[i]}
                    onClick={() => setWeekdays(on ? weekdays.filter((x) => x !== i) : [...weekdays, i])}
                    className={clsx('h-11 flex-1 rounded-full text-xs font-medium transition', on ? 'bg-rose-500 text-white' : 'bg-white text-ink-muted ring-1 ring-sand-200')}>
                    {d}
                  </button>
                );
              })}
            </div>
          )}
          {repeat !== 'none' && (
            <Field label="Repetir até (opcional)" className="mb-0 mt-3">{(id) => <Input id={id} type="date" value={until} min={date} onChange={(e) => setUntil(e.target.value)} />}</Field>
          )}
          {event?.recurrence && <p className="mt-2 text-xs text-ink-soft">As alterações valem para todas as repetições deste compromisso.</p>}
        </fieldset>

        <Toggle label="Compromisso fixo" description="Fixos nunca são movidos pelas sugestões de reorganização." checked={fixed} onChange={setFixed} />
        <Field label="Lembrete">{(id) => (
          <Select id={id} value={reminder} onChange={(e) => setReminder(e.target.value)}>
            <option value="">Sem lembrete</option>
            <option value="0">Na hora</option>
            <option value="5">5 minutos antes</option>
            <option value="15">15 minutos antes</option>
            <option value="30">30 minutos antes</option>
            <option value="60">1 hora antes</option>
            <option value="1440">1 dia antes</option>
          </Select>
        )}</Field>
        <Field label="Local (opcional)">{(id) => <Input id={id} value={location} onChange={(e) => setLocation(e.target.value)} maxLength={200} />}</Field>
        <Field label="Observações (opcional)">{(id) => <Textarea id={id} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />}</Field>
      </form>
    </Sheet>
  );
}
