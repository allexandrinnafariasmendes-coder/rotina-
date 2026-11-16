-- Ajustes apontados pelo Security Advisor do Supabase
alter function public.set_updated_at() set search_path = '';
alter function public.is_valid_area(text) set search_path = '';
-- Função de gatilho não deve ser chamável via API
revoke execute on function public.handle_new_user() from public, anon, authenticated;
-- pg_net fora do schema public (usado pelo agendamento dos lembretes)
drop extension if exists pg_net;
create extension pg_net with schema extensions;
