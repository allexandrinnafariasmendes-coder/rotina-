-- =====================================================================
-- Minha Rotina — Etapa 2: notificações push
-- Assinaturas Web Push por aparelho, preferências e log anti-duplicata.
-- O envio é feito pela Edge Function `send-reminders` (service role).
-- =====================================================================

-- Um registro por aparelho/navegador inscrito
create table public.push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint      text not null unique check (endpoint like 'https://%'),
  p256dh        text not null,
  auth          text not null,
  user_agent    text check (char_length(user_agent) <= 400),
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- Preferências (uma linha por usuária)
create table public.notification_settings (
  user_id          uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  enabled          boolean not null default true,
  event_reminders  boolean not null default true,  -- usa o "lembrete" de cada compromisso
  daily_digest     boolean not null default true,  -- resumo do dia
  digest_time      time    not null default '07:00',
  quiet_enabled    boolean not null default true,
  quiet_start      time    not null default '22:00',
  quiet_end        time    not null default '05:00',
  timezone         text    not null default 'America/Sao_Paulo' check (char_length(timezone) between 1 and 64),
  updated_at       timestamptz not null default now()
);
create trigger notification_settings_updated_at before update on public.notification_settings
  for each row execute function public.set_updated_at();

-- O que já foi enviado (impede duplicatas mesmo com execuções simultâneas)
create table public.notification_log (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users(id) on delete cascade,
  kind      text not null check (kind in ('event','digest','test')),
  ref_id    text not null,       -- id do compromisso, ou 'digest'
  ref_date  date not null,       -- data da ocorrência
  title     text,
  sent_at   timestamptz not null default now(),
  unique (user_id, kind, ref_id, ref_date)
);
create index notification_log_user_sent_idx on public.notification_log (user_id, sent_at desc);

alter table public.push_subscriptions    enable row level security;
alter table public.notification_settings enable row level security;
alter table public.notification_log      enable row level security;

create policy "dona: acesso total" on public.push_subscriptions for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "dona: acesso total" on public.notification_settings for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- O log é escrito só pelo servidor; a usuária pode consultá-lo
create policy "dona: ler" on public.notification_log for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.push_subscriptions, public.notification_settings, public.notification_log from anon;
grant select, insert, update, delete on public.push_subscriptions, public.notification_settings to authenticated;
grant select on public.notification_log to authenticated;
