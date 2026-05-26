'use client';

import { type ConnectionState } from '@pulsegrid/types';
import { DisconnectedBanner, EmptyState, ErrorState, LoadingState } from '@pulsegrid/ui';
import { type ReactNode } from 'react';

import { useForcedState } from '../lib/forceState.js';

interface AsyncContentProps {
  /** True until the first data for this surface has arrived. */
  loading: boolean;
  /** True when data has loaded but there is nothing to show. */
  empty?: boolean;
  /** Connection state; a dropped socket renders the disconnected affordance. */
  connection?: ConnectionState;
  emptyTitle?: string;
  emptyDescription?: string;
  loadingRows?: number;
  onRetry?: () => void;
  children: ReactNode;
}

/**
 * Wraps a panel body and renders one of the four explicit async states —
 * loading, empty, error, disconnected — or the children when healthy. Honors
 * the `?force=` dev override so each state is demonstrable.
 */
export function AsyncContent({
  loading,
  empty,
  connection,
  emptyTitle = 'No data yet',
  emptyDescription,
  loadingRows = 6,
  onRetry,
  children,
}: AsyncContentProps) {
  const forced = useForcedState();

  if (forced === 'loading') return <LoadingState rows={loadingRows} />;
  if (forced === 'error') return <ErrorState description="Forced error state." onRetry={onRetry} />;
  if (forced === 'empty') return <EmptyState title={emptyTitle} description={emptyDescription} />;
  if (forced === 'disconnected') {
    return (
      <div className="flex h-full flex-col">
        <DisconnectedBanner state="reconnecting" onReconnect={onRetry} />
        <div className="flex-1 opacity-50">{children}</div>
      </div>
    );
  }

  if (loading) return <LoadingState rows={loadingRows} />;
  if ((connection === 'reconnecting' || connection === 'closed') && empty) {
    return <DisconnectedBanner state={connection} onReconnect={onRetry} />;
  }
  if (empty) return <EmptyState title={emptyTitle} description={emptyDescription} />;
  return <>{children}</>;
}
