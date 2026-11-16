import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, friendlyError } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { ErrorText, Field, Input } from '@/components/ui/Field';

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 pt-safe pb-safe">
      <div className="mb-8 text-center animate-fade-up">
        <img src="/favicon.svg" alt="" className="mx-auto mb-4 h-14 w-14" />
        <p className="font-serif text-lg italic text-rose-600">Minha Rotina</p>
        <h1 className="mt-1 text-4xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-ink-muted">{subtitle}</p>
      </div>
      <div className="card animate-fade-up p-5">{children}</div>
    </main>
  );
}

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) setError(friendlyError(error));
  }

  return (
    <AuthShell title="Bem-vinda" subtitle="Entre para continuar organizando seus dias.">
      <form onSubmit={submit} noValidate>
        <ErrorText>{error}</ErrorText>
        <Field label="E-mail">{(id) => <Input id={id} type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
        <Field label="Senha">{(id) => <Input id={id} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />}</Field>
        <Button type="submit" className="mt-1 w-full" loading={loading}>Entrar</Button>
      </form>
      <div className="mt-4 flex flex-col items-center gap-2 text-sm">
        <Link to="/esqueci-senha" className="text-ink-muted underline-offset-4 hover:underline">Esqueci minha senha</Link>
        <p className="text-ink-muted">Ainda não tem conta? <Link to="/cadastro" className="font-medium text-rose-700 underline-offset-4 hover:underline">Criar conta</Link></p>
      </div>
    </AuthShell>
  );
}

export function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('A senha precisa ter pelo menos 8 caracteres.');
    if (password !== confirm) return setError('As senhas não coincidem.');
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: name.trim() }, emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) return setError(friendlyError(error));
    if (!data.session) setSent(true); // confirmação de e-mail ativa
  }

  if (sent)
    return (
      <AuthShell title="Quase lá" subtitle="Enviamos um link de confirmação para o seu e-mail.">
        <p className="text-sm text-ink-muted">Abra o link no iPhone e volte para entrar. Se não encontrar, confira a caixa de spam.</p>
        <Link to="/entrar" className="mt-4 block text-center text-sm font-medium text-rose-700">Voltar para o login</Link>
      </AuthShell>
    );

  return (
    <AuthShell title="Criar conta" subtitle="Seu espaço pessoal, só seu.">
      <form onSubmit={submit} noValidate>
        <ErrorText>{error}</ErrorText>
        <Field label="Como quer ser chamada?">{(id) => <Input id={id} autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} />}</Field>
        <Field label="E-mail">{(id) => <Input id={id} type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
        <Field label="Senha" hint="Mínimo de 8 caracteres.">{(id) => <Input id={id} type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />}</Field>
        <Field label="Confirmar senha">{(id) => <Input id={id} type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />}</Field>
        <Button type="submit" className="mt-1 w-full" loading={loading}>Criar conta</Button>
      </form>
      <p className="mt-4 text-center text-sm text-ink-muted">Já tem conta? <Link to="/entrar" className="font-medium text-rose-700">Entrar</Link></p>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/redefinir-senha` });
    setLoading(false);
    if (error) setError(friendlyError(error));
    else setSent(true);
  }

  return (
    <AuthShell title="Recuperar senha" subtitle="Enviaremos um link para criar uma nova senha.">
      {sent ? (
        <p className="text-sm text-ink-muted">Se houver uma conta com esse e-mail, o link chegará em instantes.</p>
      ) : (
        <form onSubmit={submit} noValidate>
          <ErrorText>{error}</ErrorText>
          <Field label="E-mail">{(id) => <Input id={id} type="email" autoComplete="email" inputMode="email" required value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
          <Button type="submit" className="w-full" loading={loading}>Enviar link</Button>
        </form>
      )}
      <Link to="/entrar" className="mt-4 block text-center text-sm font-medium text-rose-700">Voltar para o login</Link>
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const { clearRecovery } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError('A senha precisa ter pelo menos 8 caracteres.');
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return setError(friendlyError(error));
    clearRecovery();
    navigate('/', { replace: true });
  }

  return (
    <AuthShell title="Nova senha" subtitle="Escolha uma senha nova para sua conta.">
      <form onSubmit={submit} noValidate>
        <ErrorText>{error}</ErrorText>
        <Field label="Nova senha" hint="Mínimo de 8 caracteres.">{(id) => <Input id={id} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />}</Field>
        <Button type="submit" className="w-full" loading={loading}>Salvar nova senha</Button>
      </form>
    </AuthShell>
  );
}

export function ConfigMissingPage() {
  return (
    <AuthShell title="Configuração" subtitle="Falta conectar o app ao Supabase.">
      <ol className="list-decimal space-y-2 pl-5 text-sm text-ink-muted">
        <li>Copie <code>.env.example</code> para <code>.env.local</code>.</li>
        <li>Preencha <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> (Supabase → Project Settings → API).</li>
        <li>Reinicie com <code>npm run dev</code>. Na Vercel, cadastre as mesmas variáveis em Environment Variables.</li>
      </ol>
    </AuthShell>
  );
}
