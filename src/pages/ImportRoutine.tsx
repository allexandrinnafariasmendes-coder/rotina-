import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { PageHeader } from '@/components/Layout';
import { Button } from '@/components/ui/Button';
import { ErrorText, Input, Toggle } from '@/components/ui/Field';
import { Spinner, useToast } from '@/components/ui/misc';
import { recurrenceLabel } from '@/components/EventSheet';
import { useEventMutations, useEvents, useProfile, useUpdateProfile } from '@/hooks/data';
import { INITIAL_ROUTINE, type RoutineTemplate } from '@/lib/initialRoutine';
import { AREAS } from '@/lib/areas';
import { toISODate } from '@/lib/schedule';
import { friendlyError } from '@/lib/supabase';

type Row = RoutineTemplate & { selected: boolean };

export default function ImportRoutinePage() {
  const events = useEvents();
  const profile = useProfile();
  const { create } = useEventMutations();
  const updateProfile = useUpdateProfile();
  const toast = useToast();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>(() => INITIAL_ROUTINE.map((r) => ({ ...r, selected: !!r.time })));
  const [setSleep, setSetSleep] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  const existingKeys = useMemo(
    () => new Set((events.data ?? []).map((e) => `${e.title.toLowerCase()}|${e.start_time?.slice(0, 5) ?? ''}`)),
    [events.data],
  );
  const isDuplicate = (r: Row) => existingKeys.has(`${r.title.toLowerCase()}|${r.time}`);
  const selected = rows.filter((r) => r.selected && !isDuplicate(r));
  const missingTime = selected.filter((r) => !r.time);
  const sleepEmpty = !profile.data?.wake_time && !profile.data?.sleep_time;

  const patch = (key: string, p: Partial<Row>) => {
    setConfirming(false);
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  };

  async function doImport() {
    setError('');
    if (missingTime.length) return setError(`Defina o horário de: ${missingTime.map((r) => r.title).join(', ')}.`);
    if (!confirming) return setConfirming(true);
    try {
      const start = toISODate(new Date());
      await create.mutateAsync(
        selected.map((r) => ({
          title: r.title, area: r.area, start_date: start, start_time: r.time, duration_minutes: r.duration,
          recurrence: r.recurrence, is_fixed: r.fixed, description: null,
        })),
      );
      if (setSleep && sleepEmpty) await updateProfile.mutateAsync({ wake_time: '05:00', sleep_time: '22:00', onboarded_at: new Date().toISOString() });
      toast(`${selected.length} compromissos importados`);
      navigate('/agenda');
    } catch (err) { setError(friendlyError(err)); setConfirming(false); }
  }

  if (events.isLoading || profile.isLoading) return <><PageHeader title="Rotina inicial" /><Spinner /></>;

  return (
    <>
      <PageHeader title="Rotina inicial" subtitle="Importação opcional" />
      <div className="px-5">
        <p className="mb-4 text-sm text-ink-muted">
          Esta é a rotina descrita no planejamento do app. Revise, ajuste horários e durações e escolha o que importar.
          Itens sem horário definido começam desmarcados. Tudo poderá ser editado ou excluído depois na Agenda.
        </p>
        {sleepEmpty && <Toggle label="Definir sono: acordar 05h e dormir 22h" description="Usado no cálculo de horários livres. Editável no Perfil." checked={setSleep} onChange={setSetSleep} />}

        <ul className="space-y-2">
          {rows.map((r) => {
            const dup = isDuplicate(r);
            return (
              <li key={r.key} className={clsx('card p-3', (!r.selected || dup) && 'opacity-60')}>
                <label className="flex cursor-pointer items-start gap-3">
                  <input type="checkbox" className="mt-1 h-5 w-5 accent-rose-500" checked={r.selected && !dup} disabled={dup}
                    onChange={(e) => patch(r.key, { selected: e.target.checked })} />
                  <span className="flex-1">
                    <span className="block text-[15px] font-medium">{r.title}</span>
                    <span className="block text-xs text-ink-soft">
                      {AREAS[r.area].label} · {recurrenceLabel(r.recurrence)}{r.fixed ? ' · fixo' : ''}
                    </span>
                    {r.note && <span className="block text-xs text-ink-muted">{r.note}</span>}
                    {dup && <span className="block text-xs text-rose-700">Já existe na sua agenda.</span>}
                  </span>
                </label>
                {!dup && (
                  <div className="mt-2 grid grid-cols-2 gap-2 pl-8">
                    <label className="text-xs text-ink-muted">Horário
                      <Input type="time" value={r.time} onChange={(e) => patch(r.key, { time: e.target.value, selected: true })} className={clsx('mt-1 py-2', r.selected && !r.time && 'border-rose-300')} />
                    </label>
                    <label className="text-xs text-ink-muted">Duração (min)
                      <Input type="number" inputMode="numeric" min={1} max={1440} step={5} value={r.duration} onChange={(e) => patch(r.key, { duration: Math.max(1, Number(e.target.value) || 1) })} className="mt-1 py-2" />
                    </label>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <div className="sticky bottom-24 mt-4 rounded-2xl bg-cream/95 py-3 backdrop-blur">
          <ErrorText>{error}</ErrorText>
          {confirming && <p className="mb-2 text-sm text-ink-muted">Confirma a criação de {selected.length} compromissos recorrentes a partir de hoje?</p>}
          <Button className="w-full" onClick={doImport} disabled={selected.length === 0} loading={create.isPending}>
            {confirming ? 'Confirmar importação' : `Importar ${selected.length} ${selected.length === 1 ? 'compromisso' : 'compromissos'}`}
          </Button>
        </div>
      </div>
    </>
  );
}
