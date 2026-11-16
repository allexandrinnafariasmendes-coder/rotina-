-- =====================================================================
-- Agenda a Edge Function `send-reminders` para rodar a cada minuto.
-- Execute UMA vez no SQL Editor DEPOIS de publicar a função.
-- Substitua os dois valores entre <>:
--   <PROJECT_REF>   → o id do projeto (ex.: abcdefghijklmnop)
--   <CRON_SECRET>   → o mesmo valor configurado com `supabase secrets set CRON_SECRET=...`
-- O segredo fica guardado no Vault, não no código.
-- =====================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select vault.create_secret('https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders', 'reminders_url');
select vault.create_secret('<CRON_SECRET>', 'reminders_cron_secret');

select cron.schedule(
  'minha-rotina-lembretes',
  '* * * * *',
  $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'reminders_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'reminders_cron_secret')
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);

-- Para conferir:  select * from cron.job_run_details order by start_time desc limit 10;
-- Para pausar:    select cron.unschedule('minha-rotina-lembretes');
