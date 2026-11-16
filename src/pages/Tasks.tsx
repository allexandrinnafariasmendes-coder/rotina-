import { useState } from 'react';
import clsx from 'clsx';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/Layout';
import { IconButton } from '@/components/ui/Button';
import { CheckButton, Empty, Spinner, useToast } from '@/components/ui/misc';
import { TaskSheet, PRIORITY } from '@/components/TaskSheet';
import { AreaChip, dueText } from '@/components/dashboard/Widgets';
import { useTaskMutations, useTasks } from '@/hooks/data';
import { toISODate } from '@/lib/schedule';
import { friendlyError } from '@/lib/supabase';
import type { TaskRow } from '@/lib/types';

type Filter = 'pendentes' | 'atrasadas' | 'concluidas';

export default function TasksPage() {
  const tasks = useTasks();
  const { update } = useTaskMutations();
  const toast = useToast();
  const today = toISODate(new Date());
  const [filter, setFilter] = useState<Filter>('pendentes');
  const [editing, setEditing] = useState<TaskRow | null>(null);
  const [creating, setCreating] = useState(false);

  const all = tasks.data ?? [];
  const lists: Record<Filter, TaskRow[]> = {
    pendentes: all.filter((t) => t.status === 'todo'),
    atrasadas: all.filter((t) => t.status === 'todo' && t.due_date && t.due_date < today),
    concluidas: all.filter((t) => t.status === 'done').sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? '')),
  };
  const list = lists[filter];

  function toggle(t: TaskRow) {
    const done = t.status === 'done';
    update.mutate(
      { id: t.id, status: done ? 'todo' : 'done', completed_at: done ? null : new Date().toISOString() },
      { onError: (e) => toast(friendlyError(e)) },
    );
  }

  return (
    <>
      <PageHeader title="Tarefas">
        <IconButton label="Nova tarefa" onClick={() => setCreating(true)} className="bg-rose-600 text-white hover:bg-rose-700"><Plus size={22} /></IconButton>
      </PageHeader>
      <div className="px-5">
        <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl bg-sand-100 p-1" role="tablist" aria-label="Filtrar tarefas">
          {(['pendentes', 'atrasadas', 'concluidas'] as Filter[]).map((f) => (
            <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}
              className={clsx('min-h-[40px] rounded-lg text-sm capitalize transition', filter === f ? 'bg-white text-ink shadow-soft' : 'text-ink-muted')}>
              {f === 'concluidas' ? 'Concluídas' : f} <span className="tabular-nums text-ink-soft">{lists[f].length}</span>
            </button>
          ))}
        </div>
        {tasks.isLoading ? <Spinner /> : list.length === 0 ? (
          <Empty>{filter === 'atrasadas' ? 'Nenhuma tarefa atrasada.' : filter === 'concluidas' ? 'Nenhuma tarefa concluída ainda.' : 'Nenhuma tarefa pendente.'}</Empty>
        ) : (
          <ul className="card divide-y divide-sand-100 p-2">
            {list.map((t) => {
              const overdue = t.status === 'todo' && t.due_date && t.due_date < today;
              return (
                <li key={t.id} className="flex items-center gap-3 px-2 py-1">
                  <CheckButton done={t.status === 'done'} label={`${t.status === 'done' ? 'Reabrir' : 'Concluir'} ${t.title}`} onToggle={() => toggle(t)} />
                  <button type="button" onClick={() => setEditing(t)} className="min-h-[52px] min-w-0 flex-1 py-1 text-left">
                    <span className={clsx('block truncate text-[15px]', t.status === 'done' && 'text-ink-soft line-through')}>{t.title}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">
                      <AreaChip area={t.area} />
                      {t.priority !== 2 && <span>Prioridade {PRIORITY[t.priority].toLowerCase()}</span>}
                      {t.due_date && <span className={clsx(overdue && 'font-medium text-rose-700')}>{overdue ? 'Atrasada' : 'Prazo'} {dueText(t.due_date, today)}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <TaskSheet open={creating || !!editing} task={editing} defaultDate={creating ? today : undefined} onClose={() => { setCreating(false); setEditing(null); }} />
    </>
  );
}
