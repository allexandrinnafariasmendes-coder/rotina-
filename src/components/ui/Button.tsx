import clsx from 'clsx';
import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'soft' | 'ghost' | 'danger';

export function Button({
  variant = 'primary', size = 'md', loading, className, children, disabled, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md'; loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(
        'inline-flex select-none items-center justify-center gap-2 rounded-xl font-medium transition',
        'active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50',
        size === 'md' ? 'min-h-[44px] px-4 text-[15px]' : 'min-h-[36px] px-3 text-sm',
        variant === 'primary' && 'bg-rose-600 text-white shadow-soft hover:bg-rose-700',
        variant === 'soft' && 'bg-rose-50 text-rose-700 hover:bg-rose-100',
        variant === 'ghost' && 'text-ink-muted hover:bg-sand-100',
        variant === 'danger' && 'bg-white text-rose-700 ring-1 ring-rose-200 hover:bg-rose-50',
        className,
      )}
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
      {children}
    </button>
  );
}

export function IconButton({ label, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      {...rest}
      aria-label={label}
      title={label}
      className={clsx(
        'inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-muted transition hover:bg-sand-100 active:scale-95 disabled:opacity-40',
        className,
      )}
    >
      {children}
    </button>
  );
}
