-- =====================================================================
-- Minha Rotina — Etapa 1: fundação do banco de dados
-- Perfil, categorias, agenda (com recorrência), tarefas, hábitos,
-- anotações rápidas, reflexões e sessões de estudo.
--
-- Princípios:
--   * Toda tabela tem user_id e RLS: cada usuária só enxerga os próprios dados.
--   * Chaves estrangeiras compostas (id, user_id) impedem que um registro
--     aponte para dado de outra pessoa.
--   * Nada é apagado em cascata entre usuárias; exclusões são explícitas.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Utilitário: updated_at automático
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Áreas da vida usadas em todo o app (texto validado por CHECK, fácil de evoluir)
-- rotina, estudos, espiritualidade, autocuidado, saude, atividade_fisica,
-- trabalho, projetos, financas, casa, familia, lazer, viagens, outro
create or replace function public.is_valid_area(a text)
returns boolean
language sql
immutable
as $$
  select a in ('rotina','estudos','espiritualidade','autocuidado','saude','atividade_fisica',
               'trabalho','projetos','financas','casa','familia','lazer','viagens','outro');
$$;

-- ---------------------------------------------------------------------
-- Perfil
-- ---------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text check (char_length(full_name) <= 120),
  avatar_path   text,
  birth_date    date,
  wake_time     time,
  sleep_time    time,
  bio           text check (char_length(bio) <= 1000),
  goals         text[] not null default '{}',
  interests     text[] not null default '{}',
  preferences   jsonb  not null default '{}'::jsonb,
  onboarded_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Cria o perfil vazio assim que a conta é criada (nenhum dado é inventado)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Categorias personalizadas
-- ---------------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  area        text not null default 'outro' check (public.is_valid_area(area)),
  color       text not null default 'rose' check (color in ('rose','sky','butter','sand')),
  created_at  timestamptz not null default now(),
  unique (id, user_id),
  unique (user_id, name)
);

-- ---------------------------------------------------------------------
-- Agenda: compromissos (únicos ou recorrentes)
-- recurrence: null = evento único; caso contrário
--   {"freq": "daily"} ou {"freq": "weekly", "weekdays": [0..6]}  (0 = domingo)
-- ---------------------------------------------------------------------
create table public.events (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title             text not null check (char_length(title) between 1 and 140),
  description       text check (char_length(description) <= 2000),
  location          text check (char_length(location) <= 200),
  area              text not null default 'rotina' check (public.is_valid_area(area)),
  category_id       uuid,
  start_date        date not null,
  start_time        time,                         -- null = dia inteiro
  duration_minutes  integer not null default 30 check (duration_minutes between 1 and 1440),
  is_fixed          boolean not null default false, -- fixo = nunca é movido por sugestões
  recurrence        jsonb check (
                      recurrence is null
                      or (recurrence->>'freq' = 'daily')
                      or (recurrence->>'freq' = 'weekly' and jsonb_typeof(recurrence->'weekdays') = 'array')
                    ),
  recurrence_until  date,
  reminder_minutes  integer check (reminder_minutes between 0 and 10080),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (id, user_id),
  foreign key (category_id, user_id) references public.categories(id, user_id) on delete set null (category_id),
  check (recurrence_until is null or recurrence_until >= start_date)
);

create index events_user_date_idx on public.events (user_id, start_date);
create trigger events_updated_at before update on public.events
  for each row execute function public.set_updated_at();

-- Situação de uma ocorrência específica (concluída ou pulada naquele dia)
create table public.event_occurrences (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  event_id         uuid not null,
  occurrence_date  date not null,
  status           text not null check (status in ('done','skipped')),
  note             text check (char_length(note) <= 1000),
  created_at       timestamptz not null default now(),
  unique (event_id, occurrence_date),
  foreign key (event_id, user_id) references public.events(id, user_id) on delete cascade
);

create index event_occurrences_user_date_idx on public.event_occurrences (user_id, occurrence_date);

-- ---------------------------------------------------------------------
-- Tarefas (flexíveis; podem ser reorganizadas mediante confirmação)
-- ---------------------------------------------------------------------
create table public.tasks (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title              text not null check (char_length(title) between 1 and 200),
  notes              text check (char_length(notes) <= 2000),
  area               text not null default 'rotina' check (public.is_valid_area(area)),
  category_id        uuid,
  priority           smallint not null default 2 check (priority between 1 and 3), -- 1 alta, 3 baixa
  due_date           date,
  planned_date       date,
  planned_time       time,
  estimated_minutes  integer check (estimated_minutes between 1 and 1440),
  status             text not null default 'todo' check (status in ('todo','done')),
  completed_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  foreign key (category_id, user_id) references public.categories(id, user_id) on delete set null (category_id)
);

create index tasks_user_status_idx on public.tasks (user_id, status, due_date);
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Hábitos e registros diários
-- ---------------------------------------------------------------------
create table public.habits (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name             text not null check (char_length(name) between 1 and 80),
  area             text not null default 'rotina' check (public.is_valid_area(area)),
  target_per_week  smallint not null default 7 check (target_per_week between 1 and 7),
  active           boolean not null default true,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  unique (id, user_id)
);

create table public.habit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  habit_id    uuid not null,
  log_date    date not null,
  created_at  timestamptz not null default now(),
  unique (habit_id, log_date),
  foreign key (habit_id, user_id) references public.habits(id, user_id) on delete cascade
);

create index habit_logs_user_date_idx on public.habit_logs (user_id, log_date);

-- ---------------------------------------------------------------------
-- Anotações rápidas
-- ---------------------------------------------------------------------
create table public.quick_notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  content     text not null check (char_length(content) between 1 and 2000),
  pinned      boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger quick_notes_updated_at before update on public.quick_notes
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Reflexões / frases próprias da usuária (somam-se às frases do app)
-- ---------------------------------------------------------------------
create table public.reflections (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  text        text not null check (char_length(text) between 1 and 600),
  author      text check (char_length(author) <= 120),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Sessões de estudo (base para o módulo Estudos)
-- ---------------------------------------------------------------------
create table public.study_sessions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users(id) on delete cascade,
  track             text not null check (track in ('escola','tecnico','enem','ingles','outro')),
  subject           text not null check (char_length(subject) between 1 and 120),
  objective         text check (char_length(objective) <= 500),
  notes             text check (char_length(notes) <= 2000),
  session_date      date not null default current_date,
  duration_minutes  integer not null check (duration_minutes between 1 and 720),
  created_at        timestamptz not null default now()
);

create index study_sessions_user_date_idx on public.study_sessions (user_id, session_date);

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles          enable row level security;
alter table public.categories        enable row level security;
alter table public.events            enable row level security;
alter table public.event_occurrences enable row level security;
alter table public.tasks             enable row level security;
alter table public.habits            enable row level security;
alter table public.habit_logs        enable row level security;
alter table public.quick_notes       enable row level security;
alter table public.reflections       enable row level security;
alter table public.study_sessions    enable row level security;

-- Perfil: a própria usuária lê e edita; criação é feita pelo gatilho
create policy "perfil: ler o próprio"   on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "perfil: editar o próprio" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Demais tabelas: dona tem acesso total, mais ninguém
do $$
declare t text;
begin
  foreach t in array array['categories','events','event_occurrences','tasks','habits',
                           'habit_logs','quick_notes','reflections','study_sessions']
  loop
    execute format(
      'create policy "dona: acesso total" on public.%I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t);
  end loop;
end;
$$;

-- Privilégios mínimos: anônimos não acessam nada
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke insert, delete on public.profiles from authenticated;

-- =====================================================================
-- Storage: fotos de perfil (bucket privado, pasta = id da usuária)
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 5242880, array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do nothing;

create policy "avatars: ler a própria" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: enviar a própria" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: atualizar a própria" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: apagar a própria" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
