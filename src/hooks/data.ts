import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays, startOfWeek } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { toISODate } from '@/lib/schedule';
import { useUserId } from './useAuth';
import type {
  EventRow, HabitLogRow, HabitRow, NoteRow, OccurrenceRow, Profile, ReflectionRow, StudySessionRow, TaskRow,
} from '@/lib/types';

/** Lança o erro do Supabase para o React Query tratar. */
async function run<T>(p: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw error;
  return data as T;
}

// ------------------------------------------------------------------ Perfil
export function useProfile() {
  const uid = useUserId();
  return useQuery({
    queryKey: ['profile', uid],
    enabled: !!uid,
    queryFn: () => run<Profile>(supabase.from('profiles').select('*').eq('id', uid).single()),
  });
}

export function useUpdateProfile() {
  const uid = useUserId();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Profile>) =>
      run<Profile>(supabase.from('profiles').update(patch).eq('id', uid).select('*').single()),
    onSuccess: (p) => qc.setQueryData(['profile', uid], p),
  });
}

// ---------------------------------------------------- CRUD genérico por tabela
type TableName = 'events' | 'event_occurrences' | 'tasks' | 'habits' | 'habit_logs' | 'quick_notes' | 'reflections' | 'study_sessions';

function useCrud<T extends { id: string }>(table: TableName) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: [table] });
  const create = useMutation({
    mutationFn: (row: Partial<T> | Partial<T>[]) => run<T[]>(supabase.from(table).insert(row as never).select('*')),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, ...patch }: Partial<T> & { id: string }) =>
      run<T>(supabase.from(table).update(patch as never).eq('id', id).select('*').single()),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => run(supabase.from(table).delete().eq('id', id)),
    onSuccess: invalidate,
  });
  return { create, update, remove };
}

// ------------------------------------------------------------------ Agenda
export function useEvents() {
  const uid = useUserId();
  return useQuery({
    queryKey: ['events', uid],
    enabled: !!uid,
    queryFn: () => run<EventRow[]>(supabase.from('events').select('*').order('start_time', { ascending: true })),
  });
}
export const useEventMutations = () => useCrud<EventRow>('events');

export function useOccurrences(fromISO: string, toISO: string) {
  const uid = useUserId();
  return useQuery({
    queryKey: ['event_occurrences', uid, fromISO, toISO],
    enabled: !!uid,
    queryFn: () =>
      run<OccurrenceRow[]>(
        supabase.from('event_occurrences').select('*').gte('occurrence_date', fromISO).lte('occurrence_date', toISO),
      ),
  });
}

/** Marca/desmarca a ocorrência de um dia como concluída. */
export function useToggleOccurrence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { eventId: string; date: string; occurrenceId: string | null; status: 'done' | 'skipped' | null }) => {
      if (p.occurrenceId) await run(supabase.from('event_occurrences').delete().eq('id', p.occurrenceId));
      if (p.status)
        await run(
          supabase.from('event_occurrences').insert({ event_id: p.eventId, occurrence_date: p.date, status: p.status }),
        );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['event_occurrences'] }),
  });
}

// ------------------------------------------------------------------ Tarefas
export function useTasks() {
  const uid = useUserId();
  return useQuery({
    queryKey: ['tasks', uid],
    enabled: !!uid,
    queryFn: () =>
      run<TaskRow[]>(
        supabase
          .from('tasks')
          .select('*')
          .order('status', { ascending: false })
          .order('due_date', { ascending: true, nullsFirst: false })
          .order('priority', { ascending: true })
          .order('created_at', { ascending: false }),
      ),
  });
}
export const useTaskMutations = () => useCrud<TaskRow>('tasks');

// ------------------------------------------------------------------ Hábitos
export function useHabits() {
  const uid = useUserId();
  return useQuery({
    queryKey: ['habits', uid],
    enabled: !!uid,
    queryFn: () => run<HabitRow[]>(supabase.from('habits').select('*').order('sort_order').order('created_at')),
  });
}
export const useHabitMutations = () => useCrud<HabitRow>('habits');

/** Registros da semana corrente (segunda a domingo) + hoje. */
export function useHabitLogsWeek(ref = new Date()) {
  const uid = useUserId();
  const from = toISODate(startOfWeek(ref, { weekStartsOn: 1 }));
  const to = toISODate(addDays(startOfWeek(ref, { weekStartsOn: 1 }), 6));
  return useQuery({
    queryKey: ['habit_logs', uid, from],
    enabled: !!uid,
    queryFn: () => run<HabitLogRow[]>(supabase.from('habit_logs').select('*').gte('log_date', from).lte('log_date', to)),
  });
}

export function useToggleHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { habitId: string; date: string; logId: string | null }) => {
      if (p.logId) await run(supabase.from('habit_logs').delete().eq('id', p.logId));
      else await run(supabase.from('habit_logs').insert({ habit_id: p.habitId, log_date: p.date }));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habit_logs'] }),
  });
}

// --------------------------------------------------------- Anotações rápidas
export function useNotes() {
  const uid = useUserId();
  return useQuery({
    queryKey: ['quick_notes', uid],
    enabled: !!uid,
    queryFn: () =>
      run<NoteRow[]>(
        supabase.from('quick_notes').select('*').order('pinned', { ascending: false }).order('created_at', { ascending: false }),
      ),
  });
}
export const useNoteMutations = () => useCrud<NoteRow>('quick_notes');

// ---------------------------------------------------------------- Reflexões
export function useReflections() {
  const uid = useUserId();
  return useQuery({
    queryKey: ['reflections', uid],
    enabled: !!uid,
    queryFn: () => run<ReflectionRow[]>(supabase.from('reflections').select('*').order('created_at')),
  });
}
export const useReflectionMutations = () => useCrud<ReflectionRow>('reflections');

// ---------------------------------------------------------- Sessões de estudo
export function useStudySessions(fromISO?: string) {
  const uid = useUserId();
  return useQuery({
    queryKey: ['study_sessions', uid, fromISO ?? 'all'],
    enabled: !!uid,
    queryFn: () => {
      let q = supabase.from('study_sessions').select('*').order('session_date', { ascending: false }).order('created_at', { ascending: false });
      if (fromISO) q = q.gte('session_date', fromISO);
      return run<StudySessionRow[]>(q.limit(500));
    },
  });
}
export const useStudyMutations = () => useCrud<StudySessionRow>('study_sessions');

// ------------------------------------------------------- Exportar meus dados
export async function exportAllData() {
  const tables = ['profiles', 'categories', 'events', 'event_occurrences', 'tasks', 'habits', 'habit_logs', 'quick_notes', 'reflections', 'study_sessions', 'notification_settings'];
  const out: Record<string, unknown> = { app: 'Minha Rotina', exported_at: new Date().toISOString(), version: 1 };
  for (const t of tables) out[t] = await run(supabase.from(t).select('*'));
  return out;
}
