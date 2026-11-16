import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { addDays, format, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import clsx from 'clsx';
import { PageHeader } from '@/components/Layout';
import { CheckButton, Empty, Spinner, useToast } from '@/components/ui/misc';
import { useEvents, useOccurrences, useToggleOccurrence } from '@/hooks/data';
import { minutesToTime, occurrencesForDay, toISODate } from '@/lib/schedule';
import { BUILTIN_REFLECTIONS, pickForDay } from '@/lib/reflections';
import { friendlyError } from '@/lib/supabase';

export default function SpiritualityPage() {
  const today = new Date();
  const todayISO = toISODate(today);
  const monday = startOfWeek(today, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => toISODate(addDays(monday, i)));
  const events = useEvents();
  const occ = useOccurrences(days[0], days[6]);
  const toggle = useToggleOccurrence();
  const toast = useToast();

  const spiritual = useMemo(() => (events.data ?? []).filter((e) => e.area === 'espiritualidade'), [events.data]);
  const todayItems = occurrencesForDay(spiritual, occ.data ?? [], todayISO);

  // Frequência semanal por compromisso espiritual recorrente
  const frequency = spiritual.map((e) => {
    const planned = days.filter((d) => d <= todayISO && occurrencesForDay([e], [], d).length > 0);
    const done = planned.filter((d) => occ.data?.some((o) => o.event_id === e.id && o.occurrence_date === d && o.status === 'done'));
    return { e, planned, done };
  }).filter((f) => f.planned.length > 0);

  const verse = pickForDay(BUILTIN_REFLECTIONS, todayISO);

  return (
    <>
      <PageHeader title="Espiritualidade" subtitle={format(today, "EEEE, d 'de' MMMM", { locale: ptBR })} />
      <div className="space-y-3 px-5">
        {verse && (
          <figure className="rounded-2xl bg-gradient-to-br from-butter-100 to-butter-50 p-5 ring-1 ring-butter-200">
            <blockquote className="font-serif text-2xl italic leading-snug">“{verse.text}”</blockquote>
            <figcaption className="mt-2 text-sm text-ink-muted">— {verse.author}</figcaption>
          </figure>
        )}

        <section className="card" aria-label="Hoje">
          <h2 className="mb-2 text-xl font-semibold">Hoje</h2>
          {events.isLoading ? <Spinner /> : todayItems.length === 0 ? (
            <Empty action={<Link to="/agenda" className="text-sm font-medium text-rose-700">Abrir agenda</Link>}>
              Compromissos da área “Espiritualidade” (Missa, Ângelus, Terço…) aparecem aqui para você marcar.
            </Empty>
          ) : (
            <ul className="divide-y divide-sand-100">
              {todayItems.map((o) => {
                const done = o.status === 'done';
                return (
                  <li key={o.key} className="flex items-center gap-3 py-2">
                    <CheckButton done={done} label={`${done ? 'Desmarcar' : 'Marcar'} ${o.event.title}`}
                      onToggle={() => toggle.mutate({ eventId: o.event.id, date: o.date, occurrenceId: o.occurrenceId, status: done ? null : 'done' }, { onError: (e) => toast(friendlyError(e)) })} />
                    <span className={clsx('flex-1 text-[15px]', done && 'text-ink-soft line-through')}>{o.event.title}</span>
                    <span className="text-sm tabular-nums text-ink-soft">{o.start === null ? 'Dia todo' : minutesToTime(o.start)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {frequency.length > 0 && (
          <section className="card" aria-label="Frequência na semana">
            <h2 className="mb-3 text-xl font-semibold">Nesta semana</h2>
            <ul className="space-y-3">
              {frequency.map(({ e, planned, done }) => (
                <li key={e.id}>
                  <div className="mb-1 flex justify-between text-sm"><span>{e.title}</span><span className="tabular-nums text-ink-muted">{done.length} de {planned.length}</span></div>
                  <div className="flex gap-1" aria-hidden>
                    {planned.map((d) => <span key={d} className={clsx('h-2 flex-1 rounded-full', done.includes(d) ? 'bg-butter-500' : 'bg-sand-100')} />)}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="px-1 pt-2 text-xs text-ink-soft">
          Diário espiritual, intenções de oração, exame de consciência, registro de confissões, calendário litúrgico, santo do dia, catequese e escala de coroinha chegam na etapa de Espiritualidade.
        </p>
      </div>
    </>
  );
}
