import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { differenceInCalendarDays, parseISO, startOfWeek } from 'date-fns';
import { AlertTriangle, ArrowRight, Bell, Clock, MapPin, Pin, Plus, Trash2, Lock } from 'lucide-react';
import { CheckButton, Empty, Progress, useToast } from '../ui/misc';
import { Button, IconButton } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { ErrorText, Field, Input, Textarea } from '../ui/Field';
import { EventSheet } from '../EventSheet';
import { TaskSheet } from '../TaskSheet';
import {
  useHabitLogsWeek, useHabits, useNoteMutations, useNotes, useReflectionMutations, useReflections,
  useStudySessions, useTaskMutations, useTasks, useToggleHabit, useToggleOccurrence,
} from '@/hooks/data';
import { formatDuration, minutesToTime, nextOccurrence, toISODate, type Occurrence } from '@/lib/schedule';
import { areaTone, AREAS, STUDY_TRACKS } from '@/lib/areas';
import { BUILTIN_REFLECTIONS, pickForDay } from '@/lib/reflections';
import { friendlyError } from '@/lib/supabase';
import type { StudyTrack, TaskRow, WidgetId } from '@/lib/types';

export const WIDGET_LABELS: Record<WidgetId, string> = {
  proximo: 'Próximo compromisso',
  agenda: 'Agenda do dia',
  progresso: 'Progresso do dia',
  tarefas: 'Tarefas',
  habitos: 'Hábitos diários',
  lembretes: 'Lembretes',
  espiritualidade: 'Espiritualidade',
  estudos: 'Resumo de estudos',
  notas: 'Anotações rápidas',
  reflexao: 'Reflexão do dia',
};

export const DEFAULT_ORDER: WidgetId[] = ['reflexao', 'proximo', 'progresso', 'agenda', 'tarefas', 'habitos', 'lembretes', 'espiritualidade', 'estudos', 'notas'];

export interface DayCtx { today: string; nowMin: number; items: Occurrence[]; conflicts: Set<string>; loading: boolean }

export function WidgetCard({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={clsx('card animate-fade-up', className)} aria-label={title}>
      <div className="mb-3 flex min-h-[28px] items-center justify-between gap-2">
        <h2 className="text-xl font-semibold leading-none">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const MoreLink = ({ to, children }: { to: string; children: ReactNode }) => (
  <Link to={to} className="inline-flex min-h-[36px] items-center gap-1 text-sm font-medium text-rose-700">
    {children} <ArrowRight size={15} aria-hidden />
  </Link>
);

const timeLabel = (o: Occurrence) => (o.start === null ? 'Dia todo' : minutesToTime(o.start));

// ------------------------------------------------------------ Próximo
export function NextWidget({ ctx }: { ctx: DayCtx }) {
  const next = nextOccurrence(ctx.items, ctx.nowMin);
  const inMin = next ? next.start! - ctx.nowMin : 0;
  return (
    <section className="animate-fade-up rounded-2xl bg-gradient-to-br from-rose-100 via-rose-50 to-sky-50 p-4 shadow-soft ring-1 ring-rose-200/60" aria-label="Próximo compromisso">
      <p className="text-xs font-semibold uppercase tracking-wider text-rose-700">Próximo compromisso</p>
      {next ? (
        <>
          <p className="mt-1 font-serif text-2xl font-semibold leading-tight">{next.event.title}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
            <span className="inline-flex items-center gap-1"><Clock size={14} aria-hidden />{minutesToTime(next.start!)}–{minutesToTime(next.end!)}</span>
            <span>{inMin > 0 ? `em ${formatDuration(inMin)}` : 'acontecendo agora'}</span>
            {next.event.location && <span className="inline-flex items-center gap-1"><MapPin size={14} aria-hidden />{next.event.location}</span>}
          </p>
        </>
      ) : (
        <p className="mt-1 text-ink-muted">{ctx.items.length ? 'Tudo certo por hoje. Aproveite para descansar.' : 'Nenhum compromisso com horário hoje.'}</p>
      )}
    </section>
  );
}

// ------------------------------------------------------------ Agenda
export function AgendaWidget({ ctx }: { ctx: DayCtx }) {
  const toggle = useToggleOccurrence();
  const [newOpen, setNewOpen] = useState(false);
  const toast = useToast();
  return (
    <WidgetCard title="Agenda do dia" action={<MoreLink to="/agenda">Agenda</MoreLink>}>
      {ctx.items.length === 0 ? (
        <Empty action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button size="sm" onClick={() => setNewOpen(true)}><Plus size={16} aria-hidden />Novo compromisso</Button>
            <Link to="/importar-rotina" className="inline-flex min-h-[36px] items-center rounded-xl bg-rose-50 px-3 text-sm font-medium text-rose-700">Importar rotina inicial</Link>
          </div>
        }>Sua agenda de hoje está livre.</Empty>
      ) : (
        <ul className="divide-y divide-sand-100">
          {ctx.items.map((o) => {
            const done = o.status === 'done';
            const past = o.end !== null && o.end <= ctx.nowMin;
            return (
              <li key={o.key} className="flex items-center gap-3 py-2">
                <CheckButton done={done} label={`${done ? 'Desmarcar' : 'Concluir'} ${o.event.title}`} disabled={toggle.isPending}
                  onToggle={() => toggle.mutate({ eventId: o.event.id, date: o.date, occurrenceId: o.occurrenceId, status: done ? null : 'done' }, { onError: (e) => toast(friendlyError(e)) })} />
                <span className={clsx('w-12 shrink-0 text-sm tabular-nums', past && !done ? 'text-ink-soft' : 'text-ink-muted')}>{timeLabel(o)}</span>
                <span className={clsx('h-6 w-1 shrink-0 rounded-full', areaTone(o.event.area).bar)} aria-hidden />
                <span className={clsx('min-w-0 flex-1 truncate text-[15px]', done && 'text-ink-soft line-through', o.status === 'skipped' && 'text-ink-soft')}>
                  {o.event.title}
                </span>
                {o.event.is_fixed && <Lock size={13} className="shrink-0 text-ink-soft" aria-label="Fixo" />}
                {ctx.conflicts.has(o.key) && <AlertTriangle size={15} className="shrink-0 text-butter-700" aria-label="Conflito de horário" />}
              </li>
            );
          })}
        </ul>
      )}
      <EventSheet open={newOpen} onClose={() => setNewOpen(false)} defaultDate={ctx.today} />
    </WidgetCard>
  );
}

// ------------------------------------------------------------ Progresso
export function ProgressWidget({ ctx }: { ctx: DayCtx }) {
  const tasks = useTasks();
  const habits = useHabits();
  const logs = useHabitLogsWeek();
  const ev = ctx.items.filter((i) => i.status !== 'skipped');
  const evDone = ev.filter((i) => i.status === 'done').length;
  const todayTasks = (tasks.data ?? []).filter((t) => t.planned_date === ctx.today || t.due_date === ctx.today || (t.completed_at && toISODate(new Date(t.completed_at)) === ctx.today));
  const tDone = todayTasks.filter((t) => t.status === 'done').length;
  const active = (habits.data ?? []).filter((h) => h.active);
  const hDone = active.filter((h) => logs.data?.some((l) => l.habit_id === h.id && l.log_date === ctx.today)).length;
  const total = ev.length + todayTasks.length + active.length;
  const done = evDone + tDone + hDone;
  const rows = [
    { label: 'Compromissos', done: evDone, total: ev.length },
    { label: 'Tarefas de hoje', done: tDone, total: todayTasks.length },
    { label: 'Hábitos', done: hDone, total: active.length },
  ];
  return (
    <WidgetCard title="Progresso do dia" action={<span className="font-serif text-2xl font-semibold text-rose-700">{total ? Math.round((done / total) * 100) : 0}%</span>}>
      <Progress value={total ? done / total : 0} label="Progresso geral do dia" />
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        {rows.map((r) => (
          <div key={r.label} className="rounded-xl bg-sand-50 px-1 py-2">
            <dt className="text-[11px] text-ink-muted">{r.label}</dt>
            <dd className="text-base font-semibold tabular-nums">{r.done}/{r.total}</dd>
          </div>
        ))}
      </dl>
    </WidgetCard>
  );
}

// ------------------------------------------------------------ Tarefas
export function TasksWidget({ ctx }: { ctx: DayCtx }) {
  const tasks = useTasks();
  const { create, update } = useTaskMutations();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [editing, setEditing] = useState<TaskRow | null>(null);
  const list = (tasks.data ?? [])
    .filter((t) => t.status === 'todo' && (!t.planned_date || t.planned_date <= ctx.today || (t.due_date ?? '9') <= ctx.today))
    .slice(0, 6);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await create.mutateAsync({ title: title.trim(), planned_date: ctx.today });
      setTitle('');
    } catch (err) { toast(friendlyError(err)); }
  }

  return (
    <WidgetCard title="Tarefas" action={<MoreLink to="/tarefas">Todas</MoreLink>}>
      <form onSubmit={add} className="mb-2 flex gap-2">
        <label htmlFor="quick-task" className="sr-only">Nova tarefa</label>
        <Input id="quick-task" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Adicionar tarefa para hoje" maxLength={200} className="py-2" />
        <IconButton label="Adicionar tarefa" type="submit" disabled={!title.trim() || create.isPending} className="bg-rose-50 text-rose-700"><Plus size={20} /></IconButton>
      </form>
      {list.length === 0 ? (
        <p className="py-2 text-sm text-ink-muted">Nenhuma tarefa pendente para hoje.</p>
      ) : (
        <ul className="divide-y divide-sand-100">
          {list.map((t) => {
            const overdue = t.due_date && t.due_date < ctx.today;
            return (
              <li key={t.id} className="flex items-center gap-3 py-1.5">
                <CheckButton done={false} label={`Concluir ${t.title}`}
                  onToggle={() => update.mutate({ id: t.id, status: 'done', completed_at: new Date().toISOString() }, { onSuccess: () => toast('Tarefa concluída'), onError: (e) => toast(friendlyError(e)) })} />
                <button type="button" onClick={() => setEditing(t)} className="min-h-[44px] min-w-0 flex-1 text-left">
                  <span className="block truncate text-[15px]">{t.title}</span>
                  {(t.due_date || t.priority === 1) && (
                    <span className={clsx('text-xs', overdue ? 'text-rose-700' : 'text-ink-soft')}>
                      {t.priority === 1 && 'Prioridade alta'}{t.priority === 1 && t.due_date && ' · '}
                      {t.due_date && (overdue ? `Atrasada (${dueText(t.due_date, ctx.today)})` : `Prazo ${dueText(t.due_date, ctx.today)}`)}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <TaskSheet open={!!editing} task={editing} onClose={() => setEditing(null)} />
    </WidgetCard>
  );
}

export function dueText(due: string, today: string) {
  const d = differenceInCalendarDays(parseISO(due), parseISO(today));
  if (d === 0) return 'hoje';
  if (d === 1) return 'amanhã';
  if (d === -1) return 'ontem';
  if (d < 0) return `há ${-d} dias`;
  return `em ${d} dias`;
}

// ------------------------------------------------------------ Hábitos
export function HabitsWidget({ ctx }: { ctx: DayCtx }) {
  const habits = useHabits();
  const logs = useHabitLogsWeek();
  const toggle = useToggleHabit();
  const toast = useToast();
  const active = (habits.data ?? []).filter((h) => h.active);
  return (
    <WidgetCard title="Hábitos diários" action={<MoreLink to="/habitos">Gerenciar</MoreLink>}>
      {active.length === 0 ? (
        <Empty action={<Link to="/habitos" className="text-sm font-medium text-rose-700">Criar meu primeiro hábito</Link>}>Você ainda não cadastrou hábitos.</Empty>
      ) : (
        <ul className="grid grid-cols-1 gap-1">
          {active.map((h) => {
            const log = logs.data?.find((l) => l.habit_id === h.id && l.log_date === ctx.today);
            const week = logs.data?.filter((l) => l.habit_id === h.id).length ?? 0;
            return (
              <li key={h.id} className="flex items-center gap-3 py-1">
                <CheckButton done={!!log} label={`${log ? 'Desmarcar' : 'Marcar'} ${h.name}`} disabled={toggle.isPending}
                  onToggle={() => toggle.mutate({ habitId: h.id, date: ctx.today, logId: log?.id ?? null }, { onError: (e) => toast(friendlyError(e)) })} />
                <span className="flex-1 text-[15px]">{h.name}</span>
                <span className="text-xs tabular-nums text-ink-soft" aria-label={`${week} de ${h.target_per_week} nesta semana`}>{week}/{h.target_per_week} na semana</span>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetCard>
  );
}

// ------------------------------------------------------------ Lembretes
export function RemindersWidget({ ctx }: { ctx: DayCtx }) {
  const tasks = useTasks();
  const todo = (tasks.data ?? []).filter((t) => t.status === 'todo' && t.due_date);
  const overdue = todo.filter((t) => t.due_date! < ctx.today);
  const dueToday = todo.filter((t) => t.due_date === ctx.today);
  const withReminder = ctx.items.filter((o) => o.event.reminder_minutes != null && o.start !== null && o.end! > ctx.nowMin && o.status === null);
  const empty = !overdue.length && !dueToday.length && !withReminder.length;
  return (
    <WidgetCard title="Lembretes">
      {empty ? (
        <p className="text-sm text-ink-muted">Nenhum lembrete para hoje.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {overdue.length > 0 && (
            <li className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-rose-700">
              <AlertTriangle size={16} aria-hidden /><Link to="/tarefas" className="underline-offset-4 hover:underline">{overdue.length} {overdue.length === 1 ? 'tarefa atrasada' : 'tarefas atrasadas'}</Link>
            </li>
          )}
          {dueToday.map((t) => (
            <li key={t.id} className="flex items-center gap-2 rounded-xl bg-butter-50 px-3 py-2"><Bell size={16} className="text-butter-700" aria-hidden />Prazo hoje: {t.title}</li>
          ))}
          {withReminder.map((o) => (
            <li key={o.key} className="flex items-center gap-2 rounded-xl bg-sky-50 px-3 py-2">
              <Bell size={16} className="text-sky-700" aria-hidden />
              {o.event.title} às {minutesToTime(o.start!)}
              <span className="text-ink-soft">· aviso {o.event.reminder_minutes === 0 ? 'na hora' : `${formatDuration(o.event.reminder_minutes!)} antes`}</span>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

// ------------------------------------------------------------ Espiritualidade
export function SpiritualWidget({ ctx }: { ctx: DayCtx }) {
  const toggle = useToggleOccurrence();
  const toast = useToast();
  const items = ctx.items.filter((o) => o.event.area === 'espiritualidade');
  return (
    <WidgetCard title="Espiritualidade" action={<MoreLink to="/espiritualidade">Abrir</MoreLink>} className="bg-gradient-to-b from-butter-50 to-white">
      {items.length === 0 ? (
        <p className="text-sm text-ink-muted">Nenhum momento de oração na agenda de hoje. Compromissos da área “Espiritualidade” aparecem aqui.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {items.map((o) => {
            const done = o.status === 'done';
            return (
              <li key={o.key}>
                <button type="button" aria-pressed={done}
                  onClick={() => toggle.mutate({ eventId: o.event.id, date: o.date, occurrenceId: o.occurrenceId, status: done ? null : 'done' }, { onError: (e) => toast(friendlyError(e)) })}
                  className={clsx('min-h-[40px] rounded-full px-3.5 text-sm transition active:scale-95', done ? 'bg-butter-200 text-butter-700' : 'bg-white text-ink ring-1 ring-butter-200')}>
                  {done && '✓ '}{o.event.title}{o.start !== null && <span className="ml-1 text-ink-soft">{minutesToTime(o.start)}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetCard>
  );
}

// ------------------------------------------------------------ Estudos
export function StudyWidget() {
  const weekStart = toISODate(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const sessions = useStudySessions(weekStart);
  const total = (sessions.data ?? []).reduce((s, x) => s + x.duration_minutes, 0);
  const byTrack = (sessions.data ?? []).reduce<Record<string, number>>((acc, s) => ({ ...acc, [s.track]: (acc[s.track] ?? 0) + s.duration_minutes }), {});
  return (
    <WidgetCard title="Resumo de estudos" action={<MoreLink to="/estudos">Estudos</MoreLink>} className="bg-gradient-to-b from-sky-50 to-white">
      <p className="text-sm text-ink-muted">Nesta semana</p>
      <p className="font-serif text-3xl font-semibold">{total ? formatDuration(total) : '0 min'}</p>
      {total > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {Object.entries(byTrack).map(([t, m]) => (
            <li key={t} className="chip bg-sky-100 text-sky-700">{STUDY_TRACKS[t as StudyTrack]} · {formatDuration(m)}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-sm text-ink-muted">Registre suas sessões de estudo para acompanhar as horas.</p>
      )}
    </WidgetCard>
  );
}

// ------------------------------------------------------------ Anotações
export function NotesWidget() {
  const notes = useNotes();
  const { create, update, remove } = useNoteMutations();
  const toast = useToast();
  const [text, setText] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    try { await create.mutateAsync({ content: text.trim() }); setText(''); } catch (err) { toast(friendlyError(err)); }
  }

  return (
    <WidgetCard title="Anotações rápidas">
      <form onSubmit={add}>
        <label htmlFor="quick-note" className="sr-only">Nova anotação</label>
        <Textarea id="quick-note" rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Anote algo rapidinho…" maxLength={2000} />
        <div className="mt-2 flex justify-end">
          <Button size="sm" variant="soft" type="submit" disabled={!text.trim()} loading={create.isPending}>Salvar anotação</Button>
        </div>
      </form>
      {(notes.data ?? []).length > 0 && (
        <ul className="mt-2 space-y-2">
          {notes.data!.slice(0, 8).map((n) => (
            <li key={n.id} className={clsx('flex items-start gap-1 rounded-xl px-3 py-2', n.pinned ? 'bg-butter-50' : 'bg-sand-50')}>
              <p className="flex-1 whitespace-pre-wrap py-2 text-sm">{n.content}</p>
              <IconButton label={n.pinned ? 'Desafixar' : 'Fixar no topo'} onClick={() => update.mutate({ id: n.id, pinned: !n.pinned })} className={clsx('h-9 w-9', n.pinned && 'text-butter-700')}>
                <Pin size={16} strokeWidth={1.6} />
              </IconButton>
              {confirmId === n.id ? (
                <button type="button" className="min-h-[36px] rounded-lg px-2 text-xs font-medium text-rose-700" onClick={() => remove.mutate(n.id, { onSuccess: () => toast('Anotação excluída') })}>Excluir?</button>
              ) : (
                <IconButton label="Excluir anotação" onClick={() => setConfirmId(n.id)} className="h-9 w-9"><Trash2 size={16} strokeWidth={1.6} /></IconButton>
              )}
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}

// ------------------------------------------------------------ Reflexão
export function ReflectionWidget({ ctx }: { ctx: DayCtx }) {
  const own = useReflections();
  const { create, remove } = useReflectionMutations();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [author, setAuthor] = useState('');
  const [error, setError] = useState('');
  const pool = [...BUILTIN_REFLECTIONS.map((r) => ({ ...r, id: null as string | null })), ...(own.data ?? []).map((r) => ({ text: r.text, author: r.author ?? '', id: r.id as string | null }))];
  const today = pickForDay(pool, ctx.today);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return setError('Escreva a frase.');
    try {
      await create.mutateAsync({ text: text.trim(), author: author.trim() || null });
      setText(''); setAuthor(''); setOpen(false);
      toast('Frase adicionada');
    } catch (err) { setError(friendlyError(err)); }
  }

  return (
    <section className="animate-fade-up px-1 py-2" aria-label="Reflexão do dia">
      {today && (
        <figure className="border-l-2 border-rose-300 pl-4">
          <blockquote className="font-serif text-[1.35rem] italic leading-snug text-ink">“{today.text}”</blockquote>
          {today.author && <figcaption className="mt-1 text-sm text-ink-muted">— {today.author}</figcaption>}
        </figure>
      )}
      <button type="button" onClick={() => setOpen(true)} className="mt-2 min-h-[36px] pl-4 text-xs font-medium text-rose-700">Minhas frases</button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Minhas frases">
        <p className="mb-4 text-sm text-ink-muted">Suas frases entram no sorteio da reflexão do dia, junto com as do app.</p>
        <form onSubmit={save} noValidate>
          <ErrorText>{error}</ErrorText>
          <Field label="Frase">{(id) => <Textarea id={id} value={text} onChange={(e) => setText(e.target.value)} maxLength={600} />}</Field>
          <Field label="Autor ou referência (opcional)">{(id) => <Input id={id} value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={120} />}</Field>
          <Button type="submit" className="w-full" loading={create.isPending}>Adicionar frase</Button>
        </form>
        {(own.data ?? []).length > 0 && (
          <ul className="mt-5 space-y-2">
            {own.data!.map((r) => (
              <li key={r.id} className="flex items-start gap-2 rounded-xl bg-sand-50 px-3 py-2 text-sm">
                <span className="flex-1 py-2">“{r.text}”{r.author && <span className="text-ink-soft"> — {r.author}</span>}</span>
                <IconButton label="Excluir frase" className="h-9 w-9" onClick={() => remove.mutate(r.id)}><Trash2 size={16} strokeWidth={1.6} /></IconButton>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </section>
  );
}

export const AreaChip = ({ area }: { area: keyof typeof AREAS }) => <span className={clsx('chip', areaTone(area).chip)}>{AREAS[area].label}</span>;
