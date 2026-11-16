import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { Check, Circle } from 'lucide-react';

export function Spinner({ label = 'Carregando' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center py-10 text-ink-soft">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-rose-200 border-t-rose-500" aria-hidden />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function Empty({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-xl bg-sand-50 px-4 py-5 text-center text-sm text-ink-muted">
      <p>{children}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/** Marcador circular de concluído, com alvo de toque de 44px. */
export function CheckButton({ done, onToggle, label, disabled }: { done: boolean; onToggle: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      role="checkbox"
      aria-checked={done}
      aria-label={label}
      className="-m-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition active:scale-90 disabled:opacity-50"
    >
      {done ? (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white">
          <Check size={15} strokeWidth={2.4} />
        </span>
      ) : (
        <Circle size={24} strokeWidth={1.4} className="text-rose-300" />
      )}
    </button>
  );
}

export function Progress({ value, className, label }: { value: number; className?: string; label: string }) {
  const v = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className={clsx('h-2 overflow-hidden rounded-full bg-sand-100', className)} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="h-full rounded-full bg-gradient-to-r from-rose-300 to-rose-500 transition-[width] duration-500" style={{ width: `${v}%` }} />
    </div>
  );
}

// -------------------------------------------------------------- Avisos (toast)
const ToastCtx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const show = useCallback((m: string) => {
    setMsg(m);
    window.setTimeout(() => setMsg((cur) => (cur === m ? null : cur)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center pt-safe">
        {msg && <div className="mt-2 rounded-full bg-ink px-4 py-2 text-sm text-white shadow-lift animate-fade-up">{msg}</div>}
      </div>
    </ToastCtx.Provider>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h2 className="text-xl font-semibold">{children}</h2>
      {action}
    </div>
  );
}
