export type Area =
  | 'rotina' | 'estudos' | 'espiritualidade' | 'autocuidado' | 'saude' | 'atividade_fisica'
  | 'trabalho' | 'projetos' | 'financas' | 'casa' | 'familia' | 'lazer' | 'viagens' | 'outro';

export type Recurrence = { freq: 'daily' } | { freq: 'weekly'; weekdays: number[] };

export interface DashboardPrefs { order: WidgetId[]; hidden: WidgetId[] }

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_path: string | null;
  birth_date: string | null;
  wake_time: string | null;
  sleep_time: string | null;
  bio: string | null;
  goals: string[];
  interests: string[];
  preferences: { dashboard?: DashboardPrefs; fixed_commitments?: string; personal?: string };
  onboarded_at: string | null;
}

export interface EventRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  location: string | null;
  area: Area;
  category_id: string | null;
  start_date: string; // yyyy-MM-dd
  start_time: string | null; // HH:MM[:SS]
  duration_minutes: number;
  is_fixed: boolean;
  recurrence: Recurrence | null;
  recurrence_until: string | null;
  reminder_minutes: number | null;
}

export interface OccurrenceRow {
  id: string;
  event_id: string;
  occurrence_date: string;
  status: 'done' | 'skipped';
  note: string | null;
}

export interface TaskRow {
  id: string;
  title: string;
  notes: string | null;
  area: Area;
  priority: 1 | 2 | 3;
  due_date: string | null;
  planned_date: string | null;
  planned_time: string | null;
  estimated_minutes: number | null;
  status: 'todo' | 'done';
  completed_at: string | null;
  created_at: string;
}

export interface HabitRow {
  id: string;
  name: string;
  area: Area;
  target_per_week: number;
  active: boolean;
  sort_order: number;
}

export interface HabitLogRow { id: string; habit_id: string; log_date: string }

export interface NoteRow { id: string; content: string; pinned: boolean; created_at: string }

export interface ReflectionRow { id: string; text: string; author: string | null }

export type StudyTrack = 'escola' | 'tecnico' | 'enem' | 'ingles' | 'outro';
export interface StudySessionRow {
  id: string;
  track: StudyTrack;
  subject: string;
  objective: string | null;
  notes: string | null;
  session_date: string;
  duration_minutes: number;
}

export type WidgetId =
  | 'proximo' | 'agenda' | 'progresso' | 'tarefas' | 'habitos' | 'lembretes'
  | 'espiritualidade' | 'estudos' | 'notas' | 'reflexao';
