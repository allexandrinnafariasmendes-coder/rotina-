import { useEffect, useState, type FormEvent } from 'react';
import clsx from 'clsx';
import { Sheet } from './ui/Sheet';
import { Button } from './ui/Button';
import { ErrorText, Field, Input, Select, Textarea } from './ui/Field';
import { useToast } from './ui/misc';
import { useTaskMutations } from '@/hooks/data';
import { AREA_OPTIONS } from '@/lib/areas';
import { friendlyError } from '@/lib/supabase';
import type { Area, TaskRow } from '@/lib/types';

export const PRIORITY = { 1: 'Alta', 2: 'Média', 3: 'Baixa' } as const;

export function TaskSheet({ open, onClose, task, defaultDate }: { open: boolean; onClose: () => void; task?: TaskRow | null; defaultDate?: string }) {
  const { create, update, remove } = useTaskMutations();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [area, setArea] = useState<Area>('rotina');
  const [priority, setPriority] = useState<1 | 2 | 3>(2);
  const [due, setDue] = useState('');
  const [planned, setPlanned] = useState('');
  const [estimate, setEstimate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setConfirmDelete(false);
    setTitle(task?.title ?? '');
    setArea(task?.area ?? 'rotina');
    setPriority(task?.priority ?? 2);
    setDue(task?.due_date ?? '');
    setPlanned(task?.planned_date ?? defaultDate ?? '');
    setEstimate(task?.estimated_minutes ? String(task.estimated_minutes) : '');
    setNotes(task?.notes ?? '');
  }, [open, task, defaultDate]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError('Escreva o que precisa ser feito.');
    const row = {
      title: title.trim(),
      area,
      priority,
      due_date: due || null,
      planned_date: planned || null,
      estimated_minutes: estimate ? Number(estimate) : null,
      notes: notes.trim() || null,
    };
    try {
      if (task) await update.mutateAsync({ id: task.id, ...row });
      else await create.mutateAsync(row);
      toast(task ? 'Tarefa atualizada' : 'Tarefa criada');
      onClose();
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  async function doDelete() {
    if (!task) return;
    try {
      await remove.mutateAsync(task.id);
      toast('Tarefa excluída');
      onClose();
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={task ? 'Editar tarefa' : 'Nova tarefa'}
      footer={
        <div className="flex gap-2">
          {task && (
            <Button type="button" variant="danger" loading={remove.isPending} onClick={() => (confirmDelete ? doDelete() : setConfirmDelete(true))}>
              {confirmDelete ? 'Confirmar exclusão' : 'Excluir'}
            </Button>
          )}
          <Button type="submit" form="task-form" className="flex-1" loading={create.isPending || update.isPending}>Salvar</Button>
        </div>
      }>
      <form id="task-form" onSubmit={submit} noValidate>
        <ErrorText>{error}</ErrorText>
        <Field label="Tarefa">{(id) => <Input id={id} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="Ex.: Revisar biologia" />}</Field>
        <fieldset className="mb-4">
          <legend className="field-label">Prioridade</legend>
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-sand-100 p-1" role="radiogroup">
            {([1, 2, 3] as const).map((p) => (
              <button key={p} type="button" role="radio" aria-checked={priority === p} onClick={() => setPriority(p)}
                className={clsx('min-h-[40px] rounded-lg text-sm transition', priority === p ? 'bg-white text-ink shadow-soft' : 'text-ink-muted')}>
                {PRIORITY[p]}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Planejada para">{(id) => <Input id={id} type="date" value={planned} onChange={(e) => setPlanned(e.target.value)} />}</Field>
          <Field label="Prazo">{(id) => <Input id={id} type="date" value={due} onChange={(e) => setDue(e.target.value)} />}</Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Área">{(id) => (
            <Select id={id} value={area} onChange={(e) => setArea(e.target.value as Area)}>
              {AREA_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          )}</Field>
          <Field label="Tempo estimado (min)">{(id) => <Input id={id} type="number" inputMode="numeric" min={1} max={1440} value={estimate} onChange={(e) => setEstimate(e.target.value)} />}</Field>
        </div>
        <Field label="Observações">{(id) => <Textarea id={id} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />}</Field>
      </form>
    </Sheet>
  );
}
