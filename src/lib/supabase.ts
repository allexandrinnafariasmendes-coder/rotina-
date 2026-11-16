import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

// Com placeholders o app abre uma tela explicando a configuração, em vez de quebrar.
export const supabase = createClient(url ?? 'http://localhost', anonKey ?? 'missing-key', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

/** Mensagens de erro do Supabase em português, para a interface. */
export function friendlyError(err: unknown): string {
  const msg = (err as { message?: string })?.message ?? String(err);
  const map: Array<[RegExp, string]> = [
    [/invalid login credentials/i, 'E-mail ou senha incorretos.'],
    [/email not confirmed/i, 'Confirme seu e-mail pelo link que enviamos antes de entrar.'],
    [/user already registered/i, 'Já existe uma conta com este e-mail.'],
    [/password should be at least/i, 'A senha precisa ter pelo menos 8 caracteres.'],
    [/rate limit/i, 'Muitas tentativas seguidas. Aguarde um pouco e tente de novo.'],
    [/failed to fetch|network/i, 'Sem conexão com o servidor. Verifique sua internet.'],
    [/row-level security/i, 'Você não tem permissão para alterar este registro.'],
  ];
  return map.find(([re]) => re.test(msg))?.[1] ?? msg;
}
