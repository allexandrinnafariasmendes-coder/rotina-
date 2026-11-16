import { createContext, useContext, useState, type ReactNode } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import clsx from 'clsx';
import {
  Home, CalendarDays, BookOpen, Sparkles, UserRound, Menu, ListTodo, Repeat2, LayoutGrid, Download,
  Briefcase, Flower2, Dumbbell, Wallet, House, Plane, Heart, Target,
} from 'lucide-react';
import { Sheet } from './ui/Sheet';
import { IconButton } from './ui/Button';

const MenuCtx = createContext<() => void>(() => {});

const NAV = [
  { to: '/', label: 'Início', icon: Home, end: true },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/estudos', label: 'Estudos', icon: BookOpen },
  { to: '/espiritualidade', label: 'Fé', icon: Sparkles, aria: 'Espiritualidade' },
  { to: '/perfil', label: 'Perfil', icon: UserRound },
];

const AVAILABLE = [
  { to: '/tarefas', label: 'Tarefas', icon: ListTodo },
  { to: '/habitos', label: 'Hábitos', icon: Repeat2 },
  { to: '/?personalizar=1', label: 'Personalizar painel', icon: LayoutGrid },
  { to: '/importar-rotina', label: 'Importar rotina inicial', icon: Download },
];

const UPCOMING = [
  { label: 'Trabalho e projetos', icon: Briefcase },
  { label: 'Autocuidado e bem-estar', icon: Flower2 },
  { label: 'Atividades físicas', icon: Dumbbell },
  { label: 'Finanças', icon: Wallet },
  { label: 'Organização doméstica', icon: House },
  { label: 'Viagens', icon: Plane },
  { label: 'Família e lazer', icon: Heart },
  { label: 'Metas e Meu ano', icon: Target },
];

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <MenuCtx.Provider value={() => setMenuOpen(true)}>
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">
        Pular para o conteúdo
      </a>
      <div className="mx-auto min-h-dvh max-w-lg pb-nav">
        <main id="conteudo"><Outlet /></main>
      </div>
      <BottomNav />
      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Menu">
        <nav aria-label="Outras áreas">
          <ul className="mb-5 grid grid-cols-2 gap-2">
            {AVAILABLE.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <Link to={to} onClick={() => setMenuOpen(false)} className="flex min-h-[56px] items-center gap-3 rounded-2xl bg-white px-3 py-3 text-sm shadow-soft ring-1 ring-sand-200/70 active:scale-[0.98]">
                  <Icon size={20} strokeWidth={1.5} className="text-rose-500" aria-hidden />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <h3 className="mb-2 font-sans text-xs font-semibold uppercase tracking-wider text-ink-soft">Nas próximas etapas</h3>
          <ul className="grid grid-cols-2 gap-2 pb-2">
            {UPCOMING.map(({ label, icon: Icon }) => (
              <li key={label} className="flex min-h-[48px] items-center gap-3 rounded-2xl bg-sand-50 px-3 py-2 text-sm text-ink-soft">
                <Icon size={18} strokeWidth={1.5} aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </nav>
      </Sheet>
    </MenuCtx.Provider>
  );
}

function BottomNav() {
  return (
    <nav aria-label="Navegação principal" className="fixed inset-x-0 bottom-0 z-40 border-t border-sand-200/70 bg-cream/90 backdrop-blur-md pb-safe">
      <ul className="mx-auto flex max-w-lg justify-around px-2 pt-1.5">
        {NAV.map(({ to, label, icon: Icon, end, aria }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              aria-label={aria}
              className={({ isActive }) =>
                clsx('flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium transition', isActive ? 'text-rose-700' : 'text-ink-soft')
              }
            >
              {({ isActive }) => (
                <>
                  <span className={clsx('flex h-7 w-12 items-center justify-center rounded-full transition', isActive && 'bg-rose-100')}>
                    <Icon size={21} strokeWidth={isActive ? 1.9 : 1.5} aria-hidden />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function PageHeader({ title, subtitle, children }: { title: ReactNode; subtitle?: ReactNode; children?: ReactNode }) {
  const openMenu = useContext(MenuCtx);
  return (
    <header className="flex items-start justify-between gap-2 px-5 pb-3 pt-safe">
      <div className="pt-2">
        {subtitle && <p className="text-sm text-ink-muted first-letter:uppercase">{subtitle}</p>}
        <h1 className="text-[2rem] font-semibold leading-tight">{title}</h1>
      </div>
      <div className="flex items-center gap-1 pt-1">
        {children}
        <IconButton label="Abrir menu" onClick={openMenu}>
          <Menu size={22} strokeWidth={1.5} />
        </IconButton>
      </div>
    </header>
  );
}
