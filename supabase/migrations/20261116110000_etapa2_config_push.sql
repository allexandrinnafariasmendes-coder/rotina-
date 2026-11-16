-- =====================================================================
-- Configuração do envio de push guardada no Supabase Vault (criptografado).
-- Só a Edge Function (service_role) consegue ler; usuárias e anônimos não.
-- Os segredos são criados uma vez com vault.create_secret(...), fora do repositório:
--   push_vapid_public, push_vapid_private, push_vapid_subject, reminders_cron_secret
-- =====================================================================
create or replace function public.get_push_config()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(name, decrypted_secret), '{}'::jsonb)
  from vault.decrypted_secrets
  where name in ('push_vapid_public', 'push_vapid_private', 'push_vapid_subject', 'reminders_cron_secret');
$$;

revoke all on function public.get_push_config() from public, anon, authenticated;
grant execute on function public.get_push_config() to service_role;

-- Chave PÚBLICA VAPID para o app (é pública por natureza; evita configurar variável no deploy)
create or replace function public.get_vapid_public_key()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'push_vapid_public';
$$;

revoke all on function public.get_vapid_public_key() from public, anon;
grant execute on function public.get_vapid_public_key() to authenticated;
