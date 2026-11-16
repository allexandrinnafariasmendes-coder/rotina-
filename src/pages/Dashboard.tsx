import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronDown, ChevronUp, Eye, EyeOff, SlidersHorizontal } from 'lucide-react';
import clsx from 'clsx';
import { PageHeader } from '@/components/Layout';
import { Button, IconButton } from '@/components/ui/Button';
import { Spinner, useToast } from '@/components/ui/misc';
import {
  AgendaWidget, DEFAULT_ORDER, HabitsWidget, NextWidget, NotesWidget, ProgressWidget, ReflectionWidget,
  RemindersWidget, SpiritualWidget, StudyWidget, TasksWidget, WIDGET_LABELS, type DayCtx,
} from '@/components/dashboard/Widgets';
import { useProfile, useUpdateProfile } from '@/hooks/data';
import { useDay } from '@/hooks/useDay';
import { useNow } from '@/hooks/useNow';
import { greeting } from '@/lib/reflections';
import { toISODate } from '@/lib/schedule';
import { friendlyError } from '@/lib/supabase';
import type { DashboardPrefs, WidgetId } from '@/lib/types';

/** Garante que widgets novos apareçam mesmo em preferências antigas. */
export function normalizePrefs(p?: DashboardPrefs): DashboardPrefs {
  const order = (p?.order ?? []).filter((w) => DEFAULT_ORDER.includes(w));
  for (const w of DEFAULT_ORDER) if (!order.includes(w)) order.push(w);
  return { order, hidden: (p?.hidden ?? []).filter((w) => DEFAULT_ORDER.includes(w)) };
}

export default function DashboardPage() {
  const now = useNow();
  const today = toISODate(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const profile = useProfile();
  const updateProfile = useUpdateProfile();
  const day = useDay(today);
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const editing = params.get('personalizar') === '1';
  const [draft, setDraft] = useState<DashboardPrefs>(() => normalizePrefs());

  const saved = useMemo(() => normalizePrefs(profile.data?.preferences?.dashboard), [profile.data]);
  useEffect(() => { if (editing) setDraft(saved); }, [editing, saved]);

  const prefs = editing ? draft : saved;
  const ctx: DayCtx = { today, nowMin, items: day.items, conflicts: day.conflicts, loading: day.isLoading };
  const firstName = profile.data?.full_name?.split(' ')[0];

  const render: Record<WidgetId, () => JSX.Element> = {
    proximo: () => <NextWidget ctx={ctx} />,
    agenda: () => <AgendaWidget ctx={ctx} />,
    progresso: () => <ProgressWidget ctx={ctx} />,
    tarefas: () => <TasksWidget ctx={ctx} />,
    habitos: () => <HabitsWidget ctx={ctx} />,
    lembretes: () => <RemindersWidget ctx={ctx} />,
    espiritualidade: () => <SpiritualWidget ctx={ctx} />,
    estudos: () => <StudyWidget />,
    notas: () => <NotesWidget />,
    reflexao: () => <ReflectionWidget ctx={ctx} />,
  };

  function move(id: WidgetId, dir: -1 | 1) {
    const order = [...draft.order];
    const i = order.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    setDraft({ ...draft, order });
  }
  const toggleHidden = (id: WidgetId) =>
    setDraft({ ...draft, hidden: draft.hidden.includes(id) ? draft.hidden.filter((x) => x !== id) : [...draft.hidden, id] });

  async function savePrefs() {
    try {
      await updateProfile.mutateAsync({ preferences: { ...(profile.data?.preferences ?? {}), dashboard: draft } });
      setParams({});
      toast('Painel personalizado');
    } catch (err) { toast(friendlyError(err)); }
  }

  return (
    <>
      <PageHeader
        subtitle={format(now, "EEEE, d 'de' MMMM", { locale: ptBR })}
        title={<>{greeting(now)}{firstName ? `, ${firstName}` : ''}</>}
      >
        {!editing && (
          <IconButton label="Personalizar painel" onClick={() => setParams({ personalizar: '1' })}>
            <SlidersHorizontal size={20} strokeWidth={1.5} />
          </IconButton>
        )}
      </PageHeader>

      {editing && (
        <div className="sticky top-0 z-30 mx-5 mb-3 flex items-center justify-between gap-2 rounded-2xl bg-white/95 p-3 shadow-lift ring-1 ring-sand-200 backdrop-blur pt-safe">
          <p className="text-sm text-ink-muted">Reordene ou oculte os cartões.</p>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setParams({})}>Cancelar</Button>
            <Button size="sm" onClick={savePrefs} loading={updateProfile.isPending}>Salvar</Button>
          </div>
        </div>
      )}

      {profile.isLoading || day.isLoading ? (
        <Spinner />
      ) : day.error ? (
        <p role="alert" className="mx-5 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">Não foi possível carregar seus dados: {friendlyError(day.error)}</p>
      ) : (
        <div className="space-y-3 px-5">
          {prefs.order.map((id, idx) => {
            const hidden = prefs.hidden.includes(id);
            if (!editing && hidden) return null;
            if (!editing) return <div key={id}>{render[id]()}</div>;
            return (
              <div key={id} className={clsx('flex items-center gap-2 rounded-2xl bg-white p-2 pl-4 ring-1 ring-sand-200', hidden && 'opacity-50')}>
                <span className="flex-1 text-[15px]">{WIDGET_LABELS[id]}</span>
                <IconButton label={`Subir ${WIDGET_LABELS[id]}`} disabled={idx === 0} onClick={() => move(id, -1)}><ChevronUp size={20} /></IconButton>
                <IconButton label={`Descer ${WIDGET_LABELS[id]}`} disabled={idx === prefs.order.length - 1} onClick={() => move(id, 1)}><ChevronDown size={20} /></IconButton>
                <IconButton label={hidden ? `Mostrar ${WIDGET_LABELS[id]}` : `Ocultar ${WIDGET_LABELS[id]}`} onClick={() => toggleHidden(id)}>
                  {hidden ? <EyeOff size={19} /> : <Eye size={19} />}
                </IconButton>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
