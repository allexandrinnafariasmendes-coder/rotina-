import { useState, type FormEvent } from 'react';
import { format, parseISO, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/Layout';
import { Button, IconButton } from '@/components/ui/Button';
import { Empty, Spinner, useToast } from '@/components/ui/misc';
import { Sheet } from '@/components/ui/Sheet';
import { ErrorText, Field, Input, Select, Textarea } from '@/components/ui/Field';
import { useStudyMutations, useStudySessions } from '@/hooks/data';
import { STUDY_TRACKS } from '@/lib/areas';
import { formatDuration, toISODate } from '@/lib/schedule';
import { friendlyError } from '@/lib/supabase';
import type { StudySessionRow, StudyTrack } from '@/lib/types';

export default function StudiesPage() {
  const sessions = useStudySessions();
  const [editing, setEditing] = useState<StudySessionRow | null>(null);
  const [creating, setCreating] = useState(false);
  const weekStart = toISODate(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const week = (sessions.data ?? []).filter((s) => s.session_date >= weekStart);
  const totalWeek = week.reduce((a, s) => a + s.duration_minutes, 0);
  const byTrack = (Object.keys(STUDY_TRACKS) as StudyTrack[])
    .map((t) => ({ t, min: week.filter((s) => s.track === t).reduce((a, s) => a + s.duration_minutes, 0) }))
    .filter((x) => x.min > 0);

  // agrupa por dia
  const groups = (sessions.data ?? []).reduce<Record<string, StudySessionRow[]>>((acc, s) => {
    (acc[s.session_date] ??= []).push(s);
    return acc;
  }, {});

  return (
    <>
      <PageHeader title="Estudos" subtitle="Escola, técnico, ENEM e inglês">
        <IconButton label="Registrar sessão de estudo" onClick={() => setCreating(true)} className="bg-rose-600 text-white hover:bg-rose-700"><Plus size={22} /></IconButton>
      </PageHeader>
      <div className="space-y-3 px-5">
        <section className="card bg-gradient-to-br from-sky-50 to-white" aria-label="Resumo da semana">
          <p className="text-sm text-ink-muted">Horas estudadas nesta semana</p>
          <p className="font-serif text-4xl font-semibold">{totalWeek ? formatDuration(totalWeek) : '0 min'}</p>
          {byTrack.length > 0 && (
            <ul className="mt-3 space-y-2">
              {byTrack.map(({ t, min }) => (
                <li key={t}>
                  <div className="mb-1 flex justify-between text-sm"><span>{STUDY_TRACKS[t]}</span><span className="tabular-nums text-ink-muted">{formatDuration(min)}</span></div>
                  <div className="h-2 rounded-full bg-sky-100"><div className="h-full rounded-full bg-sky-500" style={{ width: `${(min / totalWeek) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <h2 className="pt-2 text-xl font-semibold">Sessões</h2>
        {sessions.isLoading ? <Spinner /> : !sessions.data?.length ? (
          <Empty action={<Button size="sm" onClick={() => setCreating(true)}>Registrar sessão</Button>}>
            Registre cada sessão com matéria, duração e objetivo para acompanhar sua evolução.
          </Empty>
        ) : (
          Object.entries(groups).map(([date, list]) => (
            <section key={date} aria-label={date}>
              <h3 className="mb-1 font-sans text-xs font-semibold uppercase tracking-wider text-ink-soft">{format(parseISO(date), "EEEE, d 'de' MMM", { locale: ptBR })}</h3>
              <ul className="card divide-y divide-sand-100 p-1">
                {list.map((s) => (
                  <li key={s.id}>
                    <button type="button" onClick={() => setEditing(s)} className="flex min-h-[56px] w-full items-center gap-3 px-3 py-2 text-left">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px]">{s.subject}</span>
                        <span className="block truncate text-xs text-ink-soft">{STUDY_TRACKS[s.track]}{s.objective ? ` · ${s.objective}` : ''}</span>
                      </span>
                      <span className="text-sm tabular-nums text-ink-muted">{formatDuration(s.duration_minutes)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
        <p className="px-1 pt-2 text-xs text-ink-soft">Disciplinas, provas, notas, simulados, redação e vocabulário de inglês chegam na etapa de Estudos.</p>
      </div>
      <StudySheet open={creating || !!editing} session={editing} onClose={() => { setCreating(false); setEditing(null); }} />
    </>
  );
}

function StudySheet({ open, session, onClose }: { open: boolean; session: StudySessionRow | null; onClose: () => void }) {
  const { create, update, remove } = useStudyMutations();
  const toast = useToast();
  const [track, setTrack] = useState<StudyTrack>('escola');
  const [subject, setSubject] = useState('');
  const [date, setDate] = useState('');
  const [duration, setDuration] = useState(50);
  const [objective, setObjective] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [lastOpen, setLastOpen] = useState(false);

  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setTrack(session?.track ?? 'escola'); setSubject(session?.subject ?? ''); setDate(session?.session_date ?? toISODate(new Date()));
      setDuration(session?.duration_minutes ?? 50); setObjective(session?.objective ?? ''); setNotes(session?.notes ?? '');
      setError(''); setConfirm(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!subject.trim()) return setError('Informe a matéria.');
    if (!duration || duration < 1 || duration > 720) return setError('A duração deve ficar entre 1 e 720 minutos.');
    const row = { track, subject: subject.trim(), session_date: date, duration_minutes: duration, objective: objective.trim() || null, notes: notes.trim() || null };
    try {
      if (session) await update.mutateAsync({ id: session.id, ...row });
      else await create.mutateAsync(row);
      toast(session ? 'Sessão atualizada' : 'Sessão registrada');
      onClose();
    } catch (err) { setError(friendlyError(err)); }
  }

  return (
    <Sheet open={open} onClose={onClose} title={session ? 'Editar sessão' : 'Sessão de estudo'}
      footer={
        <div className="flex gap-2">
          {session && (
            <Button variant="danger" loading={remove.isPending}
              onClick={() => (confirm ? remove.mutate(session.id, { onSuccess: () => { toast('Sessão excluída'); onClose(); } }) : setConfirm(true))}>
              {confirm ? 'Confirmar exclusão' : 'Excluir'}
            </Button>
          )}
          <Button type="submit" form="study-form" className="flex-1" loading={create.isPending || update.isPending}>Salvar</Button>
        </div>
      }>
      <form id="study-form" onSubmit={submit} noValidate>
        <ErrorText>{error}</ErrorText>
        <Field label="Frente de estudo">{(id) => (
          <Select id={id} value={track} onChange={(e) => setTrack(e.target.value as StudyTrack)}>
            {(Object.keys(STUDY_TRACKS) as StudyTrack[]).map((t) => <option key={t} value={t}>{STUDY_TRACKS[t]}</option>)}
          </Select>
        )}</Field>
        <Field label="Matéria">{(id) => <Input id={id} value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} placeholder="Ex.: Biologia — genética" />}</Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data">{(id) => <Input id={id} type="date" value={date} onChange={(e) => setDate(e.target.value)} />}</Field>
          <Field label="Duração (min)">{(id) => <Input id={id} type="number" inputMode="numeric" min={1} max={720} step={5} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />}</Field>
        </div>
        <Field label="Objetivo">{(id) => <Input id={id} value={objective} onChange={(e) => setObjective(e.target.value)} maxLength={500} placeholder="Ex.: resolver 20 questões" />}</Field>
        <Field label="Observações">{(id) => <Textarea id={id} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />}</Field>
      </form>
    </Sheet>
  );
}
