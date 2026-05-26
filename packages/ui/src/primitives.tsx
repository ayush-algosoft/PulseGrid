import { type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from 'react';

import { cn } from './cn.js';

type ButtonVariant = 'default' | 'ghost' | 'outline' | 'accent' | 'danger';
type ButtonSize = 'sm' | 'md' | 'icon';

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  default: 'bg-elevated text-foreground hover:bg-border-strong border border-border',
  ghost: 'text-muted hover:text-foreground hover:bg-elevated',
  outline: 'border border-border text-foreground hover:border-border-strong hover:bg-elevated',
  accent: 'bg-cyan/15 text-cyan border border-cyan/30 hover:bg-cyan/25',
  danger: 'bg-down/15 text-down border border-down/30 hover:bg-down/25',
};

const BUTTON_SIZE: Record<ButtonSize, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1.5',
  md: 'h-9 px-3.5 text-sm gap-2',
  icon: 'h-8 w-8',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({ variant = 'default', size = 'md', className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan/60',
        'disabled:cursor-not-allowed disabled:opacity-50',
        BUTTON_VARIANT[variant],
        BUTTON_SIZE[size],
        className,
      )}
      {...props}
    />
  );
}

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
}

export function Card({ className, inset, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-panel shadow-soft',
        inset && 'bg-surface',
        className,
      )}
      {...props}
    />
  );
}

export interface PanelProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  actions?: ReactNode;
  /** Removes inner padding for full-bleed content (charts, grids). */
  bare?: boolean;
}

/** A titled surface — the standard building block for dashboard panes. */
export function Panel({ title, actions, bare, className, children, ...props }: PanelProps) {
  return (
    <Card className={cn('flex min-h-0 flex-col', className)} {...props}>
      {(title || actions) && (
        <header className="flex h-9 shrink-0 items-center justify-between border-b border-border px-3">
          <span className="text-2xs font-semibold uppercase tracking-wider text-subtle">
            {title}
          </span>
          {actions && <div className="flex items-center gap-1">{actions}</div>}
        </header>
      )}
      <div className={cn('min-h-0 flex-1 overflow-hidden', !bare && 'p-3')}>{children}</div>
    </Card>
  );
}

type BadgeTone = 'neutral' | 'up' | 'down' | 'cyan' | 'violet' | 'warning';

const BADGE_TONE: Record<BadgeTone, string> = {
  neutral: 'bg-elevated text-muted border-border',
  up: 'bg-up/12 text-up border-up/25',
  down: 'bg-down/12 text-down border-down/25',
  cyan: 'bg-cyan/12 text-cyan border-cyan/25',
  violet: 'bg-violet/12 text-violet border-violet/25',
  warning: 'bg-warning/12 text-warning border-warning/25',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-2xs font-medium tabular-nums',
        BADGE_TONE[tone],
        className,
      )}
      {...props}
    />
  );
}

/** A keyboard key cap, used in the shortcut overlay and command palette. */
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded border border-border bg-elevated px-1.5',
        'font-mono text-2xs text-muted',
        className,
      )}
    >
      {children}
    </kbd>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded bg-elevated/60',
        'after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer',
        'after:bg-gradient-to-r after:from-transparent after:via-white/5 after:to-transparent',
        'motion-reduce:after:hidden',
        className,
      )}
    />
  );
}
