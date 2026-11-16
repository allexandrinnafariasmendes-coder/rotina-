import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, Download, LogOut, UserRound, X } from 'lucide-react';
import { PageHeader } from '@/components/Layout';
import { Button } from '@/components/ui/Button';
import { ErrorText, Field, Input, Textarea } from '@/components/ui/Field';
import { Spinner, useToast } from '@/components/ui/misc';
import { exportAllData, useProfile, useUpdateProfile } from '@/hooks/data';
import { useAuth } from '@/hooks/useAuth';
import { friendlyError, supabase } from '@/lib/supabase';

function useAvatarUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ['avatar', path],
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from('avatars').createSignedUrl(path!, 60 * 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

function TagInput({ label, values, onChange, placeholder }: { label: string; values: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [text, setText] = useState('');
  const add = () => {
    const v = text.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setText('');
  };
  return (
    <Field label={label}>
      {(id) => (
        <>
          {values.length > 0 && (
            <ul className="mb-2 flex flex-wrap gap-1.5">
              {values.map((v) => (
                <li key={v} className="chip bg-rose-50 py-1 pl-3 pr-1 text-sm text-rose-700">
                  {v}
                  <button type="button" aria-label={`Remover ${v}`} onClick={() => onChange(values.filter((x) => x !== v))} className="inline-flex h-7 w-7 items-center justify-center rounded-full hover:bg-rose-100">
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <Input id={id} value={text} placeholder={placeholder} maxLength={80} onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
            <Button type="button" variant="soft" onClick={add} disabled={!text.trim()}>Adicionar</Button>
          </div>
        </>
      )}
    </Field>
  );
}

export default function ProfilePage() {
  const { session } = useAuth();
  const profile = useProfile();
  const save = useUpdateProfile();
  const qc = useQueryClient();
  const toast = useToast();
  const avatar = useAvatarUrl(profile.data?.avatar_path);
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [birth, setBirth] = useState('');
  const [wake, setWake] = useState('');
  const [sleep, setSleep] = useState('');
  const [bio, setBio] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [fixed, setFixed] = useState('');
  const [personal, setPersonal] = useState('');
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const p = profile.data;
    if (!p) return;
    setName(p.full_name ?? ''); setBirth(p.birth_date ?? '');
    setWake(p.wake_time?.slice(0, 5) ?? ''); setSleep(p.sleep_time?.slice(0, 5) ?? '');
    setBio(p.bio ?? ''); setGoals(p.goals ?? []); setInterests(p.interests ?? []);
    setFixed(p.preferences?.fixed_commitments ?? ''); setPersonal(p.preferences?.personal ?? '');
  }, [profile.data]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await save.mutateAsync({
        full_name: name.trim() || null,
        birth_date: birth || null,
        wake_time: wake || null,
        sleep_time: sleep || null,
        bio: bio.trim() || null,
        goals,
        interests,
        preferences: { ...(profile.data?.preferences ?? {}), fixed_commitments: fixed.trim() || undefined, personal: personal.trim() || undefined },
      });
      toast('Perfil salvo');
    } catch (err) { setError(friendlyError(err)); }
  }

  async function upload(file: File) {
    if (!session) return;
    if (file.size > 5 * 1024 * 1024) return toast('A foto precisa ter até 5 MB.');
    setUploading(true);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${session.user.id}/avatar-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('avatars').upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const old = profile.data?.avatar_path;
      await save.mutateAsync({ avatar_path: path });
      if (old) await supabase.storage.from('avatars').remove([old]);
      qc.invalidateQueries({ queryKey: ['avatar'] });
      toast('Foto atualizada');
    } catch (err) { toast(friendlyError(err)); } finally { setUploading(false); }
  }

  async function removePhoto() {
    const old = profile.data?.avatar_path;
    if (!old) return;
    try {
      await save.mutateAsync({ avatar_path: null });
      await supabase.storage.from('avatars').remove([old]);
      toast('Foto removida');
    } catch (err) { toast(friendlyError(err)); }
  }

  async function doExport() {
    setExporting(true);
    try {
      const data = await exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `minha-rotina-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) { toast(friendlyError(err)); } finally { setExporting(false); }
  }

  if (profile.isLoading) return <><PageHeader title="Perfil" /><Spinner /></>;

  return (
    <>
      <PageHeader title="Perfil" subtitle={session?.user.email} />
      <div className="px-5">
        <div className="mb-5 flex items-center gap-4">
          <div className="relative h-20 w-20 overflow-hidden rounded-full bg-rose-100 ring-4 ring-white shadow-soft">
            {avatar.data ? <img src={avatar.data} alt="Sua foto de perfil" className="h-full w-full object-cover" /> : (
              <span className="flex h-full w-full items-center justify-center text-rose-300"><UserRound size={36} strokeWidth={1.3} aria-hidden /></span>
            )}
          </div>
          <div className="flex flex-col items-start gap-1">
            <input ref={fileRef} type="file" accept="image/*" className="sr-only" aria-label="Escolher foto de perfil"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
            <Button size="sm" variant="soft" onClick={() => fileRef.current?.click()} loading={uploading}><Camera size={16} aria-hidden />{profile.data?.avatar_path ? 'Trocar foto' : 'Adicionar foto'}</Button>
            {profile.data?.avatar_path && <Button size="sm" variant="ghost" onClick={removePhoto}>Remover foto</Button>}
          </div>
        </div>

        <form onSubmit={submit} noValidate>
          <ErrorText>{error}</ErrorText>
          <section className="card mb-3">
            <h2 className="mb-3 text-xl font-semibold">Sobre você</h2>
            <Field label="Nome">{(id) => <Input id={id} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={120} />}</Field>
            <Field label="Data de nascimento (opcional)">{(id) => <Input id={id} type="date" value={birth} onChange={(e) => setBirth(e.target.value)} />}</Field>
            <Field label="Uma frase sobre você (opcional)">{(id) => <Textarea id={id} value={bio} onChange={(e) => setBio(e.target.value)} maxLength={1000} />}</Field>
          </section>

          <section className="card mb-3">
            <h2 className="mb-1 text-xl font-semibold">Sono</h2>
            <p className="mb-3 text-sm text-ink-muted">Usado para calcular seus horários livres na agenda.</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Acordar">{(id) => <Input id={id} type="time" value={wake} onChange={(e) => setWake(e.target.value)} />}</Field>
              <Field label="Dormir">{(id) => <Input id={id} type="time" value={sleep} onChange={(e) => setSleep(e.target.value)} />}</Field>
            </div>
          </section>

          <section className="card mb-3">
            <h2 className="mb-3 text-xl font-semibold">Objetivos e interesses</h2>
            <TagInput label="Objetivos" values={goals} onChange={setGoals} placeholder="Ex.: aprovação no ENEM" />
            <TagInput label="Categorias de interesse" values={interests} onChange={setInterests} placeholder="Ex.: leitura" />
          </section>

          <section className="card mb-3">
            <h2 className="mb-3 text-xl font-semibold">Anotações pessoais</h2>
            <Field label="Compromissos fixos" hint="Um resumo livre; os compromissos em si ficam na Agenda.">{(id) => <Textarea id={id} value={fixed} onChange={(e) => setFixed(e.target.value)} maxLength={2000} />}</Field>
            <Field label="Preferências pessoais">{(id) => <Textarea id={id} value={personal} onChange={(e) => setPersonal(e.target.value)} maxLength={2000} />}</Field>
          </section>

          <Button type="submit" className="mb-6 w-full" loading={save.isPending}>Salvar perfil</Button>
        </form>

        <section className="card mb-3">
          <h2 className="mb-1 text-xl font-semibold">Seus dados</h2>
          <p className="mb-3 text-sm text-ink-muted">Baixe uma cópia completa de tudo o que você registrou (backup em JSON).</p>
          <Button variant="soft" className="w-full" onClick={doExport} loading={exporting}><Download size={16} aria-hidden />Exportar meus dados</Button>
        </section>
        <Button variant="ghost" className="mb-4 w-full" onClick={() => supabase.auth.signOut().then(() => qc.clear())}><LogOut size={16} aria-hidden />Sair da conta</Button>
      </div>
    </>
  );
}
