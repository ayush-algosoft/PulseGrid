import { type ReactNode } from 'react';

import { cn } from './cn.js';
import { Button, Skeleton } from './primitives.js';

/** Loading state — skeleton rows, never a spinner on a blank pane. */
export function LoadingState({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2 p-1', className)} aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-6 w-full" />
      ))}
    </div>
  );
}

function CenteredState({
  icon,
  title,
  description,
  action,
  tone,
}: {
  icon: ReactNode;
  title: string;
  description?: string | undefined;
  action?: ReactNode | undefined;
  tone?: 'muted' | 'down' | undefined;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
      <div className={cn('text-2xl', tone === 'down' ? 'text-down' : 'text-subtle')}>{icon}</div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="max-w-xs text-xs text-muted">{description}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

/** Empty state — instructive, never a dead end. */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string | undefined;
  action?: ReactNode | undefined;
}) {
  return <CenteredState icon="◍" title={title} description={description} action={action} />;
}

/** Error state — actionable, with a retry affordance. */
export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
}: {
  title?: string;
  description?: string | undefined;
  onRetry?: (() => void) | undefined;
}) {
  return (
    <CenteredState
      icon="⚠"
      tone="down"
      title={title}
      description={description}
      action={
        onRetry ? (
          <Button size="sm" variant="outline" onClick={onRetry}>
            Retry
          </Button>
        ) : undefined
      }
    />
  );
}

/** Stale / disconnected banner shown when the socket drops. */
export function DisconnectedBanner({
  state,
  onReconnect,
}: {
  state: 'reconnecting' | 'closed';
  onReconnect?: (() => void) | undefined;
}) {
  return (
    <div
      role="status"
      className="flex items-center justify-between gap-3 border-b border-warning/30 bg-warning/10 px-4 py-1.5 text-xs text-warning"
    >
      <span className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-warning" />
        {state === 'reconnecting'
          ? 'Connection lost — reconnecting to the market feed…'
          : 'Disconnected from the market feed. Showing last known values.'}
      </span>
      {onReconnect && (
        <button onClick={onReconnect} className="font-medium underline underline-offset-2">
          Reconnect now
        </button>
      )}
    </div>
  );
}
