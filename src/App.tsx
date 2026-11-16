import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { AppLayout, PageHeader } from '@/components/Layout';
import { Spinner } from '@/components/ui/misc';
import { ConfigMissingPage, ForgotPasswordPage, LoginPage, ResetPasswordPage, SignupPage } from '@/pages/Auth';
import DashboardPage from '@/pages/Dashboard';

const AgendaPage = lazy(() => import('@/pages/Agenda'));
const StudiesPage = lazy(() => import('@/pages/Studies'));
const SpiritualityPage = lazy(() => import('@/pages/Spirituality'));
const ProfilePage = lazy(() => import('@/pages/Profile'));
const TasksPage = lazy(() => import('@/pages/Tasks'));
const HabitsPage = lazy(() => import('@/pages/Habits'));
const ImportRoutinePage = lazy(() => import('@/pages/ImportRoutine'));

function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Spinner />;
  if (!session) return <Navigate to="/entrar" replace state={{ from: location }} />;
  return <>{children}</>;
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <Spinner />;
  return session ? <Navigate to="/" replace /> : <>{children}</>;
}

function NotFound() {
  return <><PageHeader title="Página não encontrada" /><p className="px-5 text-ink-muted">Use a navegação abaixo para voltar.</p></>;
}

export default function App() {
  const { recovering } = useAuth();
  if (!isSupabaseConfigured) return <ConfigMissingPage />;
  if (recovering) return <ResetPasswordPage />;

  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/entrar" element={<PublicOnly><LoginPage /></PublicOnly>} />
        <Route path="/cadastro" element={<PublicOnly><SignupPage /></PublicOnly>} />
        <Route path="/esqueci-senha" element={<PublicOnly><ForgotPasswordPage /></PublicOnly>} />
        <Route path="/redefinir-senha" element={<RequireAuth><ResetPasswordPage /></RequireAuth>} />
        <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route index element={<DashboardPage />} />
          <Route path="agenda" element={<AgendaPage />} />
          <Route path="estudos" element={<StudiesPage />} />
          <Route path="espiritualidade" element={<SpiritualityPage />} />
          <Route path="perfil" element={<ProfilePage />} />
          <Route path="tarefas" element={<TasksPage />} />
          <Route path="habitos" element={<HabitsPage />} />
          <Route path="importar-rotina" element={<ImportRoutinePage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
