import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { IconButton } from './Button';

/** Painel que sobe da parte de baixo da tela (padrão iOS). */
export function Sheet({ open, onClose, title, children, footer }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode;
}) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const first = panel.current?.querySelector<HTMLElement>('input, textarea, select, button:not([data-close])');
    (first ?? panel.current)?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-ink/25 backdrop-blur-[2px] animate-fade-up" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-3xl bg-cream shadow-lift animate-sheet-in sm:rounded-3xl"
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-sand-200 sm:hidden" aria-hidden />
        <header className="flex items-center justify-between px-5 pb-1 pt-2">
          <h2 id={titleId} className="text-2xl font-semibold">{title}</h2>
          <IconButton label="Fechar" onClick={onClose} data-close>
            <X size={20} strokeWidth={1.6} />
          </IconButton>
        </header>
        <div className="flex-1 overflow-y-auto px-5 pb-4">{children}</div>
        {footer && <footer className="border-t border-sand-200/70 px-5 pt-3 pb-safe">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
