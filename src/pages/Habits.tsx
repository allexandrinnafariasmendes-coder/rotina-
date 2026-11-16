import { useState, type FormEvent } from 'react';
import { addDays, format, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import clsx from 'clsx';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/Layout';
import { Button, IconButton } from '@/components/ui/Button';
import { Empty, Spinner, useToast } from '@/components/ui/misc';
import { Sheet } from '@/components/ui/Sheet';
import { ErrorText, Field, Input, Select, Toggle } from '@/components/ui/Field';
import { useHabitLogsWeek, useHabitMutations, useHabits, useToggleHabit } from '@/hooks/data';
import { AREA_OPTIONS } from '@/lib/areas';
import { toISODate } from '@/lib/schedule';
import { friendlyError } from '@/lib/supabase';
import type { Area, HabitRow } from '@/lib/types';

export default function HabitsPage() {
  const habits = useHabits();
  const logs = useHabitLogsWeek();
  const toggle = useToggleHabit();
  const toast = useToast();
  const [editing, setEditing] = useState<HabitRow | null>(null);
  const [creating, setCreating] = useState(false);
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const today = toISODate(new Date());

  return (
    <>
      <PageHeader title="Hábitos" subtitle="Constância, sem cobrança">
        <IconButton label="Novo hábito" onClick={() => setCreating(true)} className="bg-rose-600 text-white hover:bg-rose-700"><Plus size={22} /></IconButton>
      </PageHeader>
      <div className="space-y-3 px-5">
        {habits.isLoading ? <Spinner /> : (habits.data ?? []).length === 0 ? (
          <Empty action={<Button size="sm" onClick={() => setCreating(true)}>Criar hábito</Button>}>
            Cadastre os hábitos que quer acompanhar, como oração, leitura ou hidratação.
          </Empty>
        ) : (
          habits.data!.map((h) => {
            const count = logs.data?.filter((l) => l.habit_id === h.id).length ?? 0;
            return (
              <section key={h.id} className={clsx('card', !h.active && 'opacity-60')} aria-label={h.name}>
                <div className="mb-3 flex items-center justify-between">
                  <button type="button" onClick={() => setEditing(h)} className="min-h-[36px] text-left">
                    <span className="font-serif text-xl font-semibold">{h.name}</span>
                    {!h.active && <span className="ml-2 text-xs text-ink-soft">pausado</span>}
                  </button>
                  <span className="text-sm tabular-nums text-ink-muted">{count}/{h.target_per_week} na semana</span>
                </div>
                <ol className="grid grid-cols-7 gap-1">
                  {days.map((d) => {
                    const iso = toISODate(d);
                    const log = logs.data?.find((l) => l.habit_id === h.id && l.log_date === iso);
                    const future = iso > today;
                    return (
                      <li key={iso}>
                        <button type="button" disabled={future || !h.active || toggle.isPending} aria-pressed={!!log}
                          aria-label={`${h.name}, ${format(d, "EEEE", { locale: ptBR })}`}
                          onClick={() => toggle.mutate({ habitId: h.id, date: iso, logId: log?.id ?? null }, { onError: (e) => toast(friendlyError(e)) })}
                          className={clsx('flex h-12 w-full flex-col items-center justify-center rounded-xl text-[11px] transition disabled:opacity-40',
                            log ? 'bg-rose-500 text-white' : 'bg-sand-50 text-ink-muted', iso === today && !log && 'ring-2 ring-rose-200')}>
                          <span className="capitalize">{format(d, 'EEEEEE', { locale: ptBR })}</span>
                          <span className="font-semibold">{format(d, 'd')}</span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </section>
            );
          })
        )}
      </div>
      <HabitSheet open={creating || !!editing} habit={editing} onClose={() => { setCreating(false); setEditing(null); }} />
    </>
  );
}

function HabitSheet({ open, habit, onClose }: { open: boolean; habit: HabitRow | null; onClose: () => void }) {
  const { create, update, remove } = useHabitMutations();
  const toast = useToast();
  const [name, setName] = useState('');
  const [area, setArea] = useState<Area>('rotina');
  const [target, setTarget] = useState(7);
  const [active, setActive] = useState(true);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [lastOpen, setLastOpen] = useState(false);

  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setName(habit?.name ?? ''); setArea(habit?.area ?? 'rotina'); setTarget(habit?.target_per_week ?? 7);
      setActive(habit?.active ?? true); setError(''); setConfirm(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError('Dê um nome ao hábito.');
    const row = { name: name.trim(), area, target_per_week: target, active };
    try {
      if (habit) await update.mutateAsync({ id: habit.id, ...row });
      else await create.mutateAsync(row);
      toast(habit ? 'Hábito atualizado' : 'Hábito criado');
      onClose();
    } catch (err) { setError(friendlyError(err)); }
  }

  return (
    <Sheet open={open} onClose={onClose} title={habit ? 'Editar hábito' : 'Novo hábito'}
      footer={
        <div className="flex gap-2">
          {habit && (
            <Button variant="danger" loading={remove.isPending}
              onClick={() => (confirm ? remove.mutate(habit.id, { onSuccess: () => { toast('Hábito excluído'); onClose(); } }) : setConfirm(true))}>
              {confirm ? 'Excluir com histórico' : 'Excluir'}
            </Button>
          )}
          <Button type="submit" form="habit-form" className="flex-1" loading={create.isPending || update.isPending}>Salvar</Button>
        </div>
      }>
      <form id="habit-form" onSubmit={submit} noValidate>
        <ErrorText>{error}</ErrorText>
        <Field label="Hábito">{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Ex.: Terço" />}</Field>
        <Field label="Área">{(id) => (
          <Select id={id} value={area} onChange={(e) => setArea(e.target.value as Area)}>
            {AREA_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        )}</Field>
        <Field label="Meta de dias por semana" hint="Metas flexíveis ajudam a manter a constância sem excesso.">{(id) => (
          <Select id={id} value={target} onChange={(e) => setTarget(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n} {n === 1 ? 'dia' : 'dias'}</option>)}
          </Select>
        )}</Field>
        <Toggle label="Ativo" description="Pause um hábito sem perder o histórico." checked={active} onChange={setActive} />
        {confirm && <p className="text-sm text-rose-700">Excluir apaga também todos os registros deste hábito. Para manter o histórico, prefira pausar.</p>}
      </form>
    </Sheet>
  );
}
