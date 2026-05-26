'use client';

import { type ConnectionState, type Level } from '@pulsegrid/types';
import { useEffect, useRef, useState } from 'react';

import { cn } from './cn.js';

/** Direction glyph + colour for a signed change. Never colour alone (a11y). */
export function directionGlyph(value: number): string {
  if (value > 0) return '▲';
  if (value < 0) return '▼';
  return '◦';
}

export function changeToneClass(value: number): string {
  if (value > 0) return 'text-up';
  if (value < 0) return 'text-down';
  return 'text-muted';
}

export interface ChangeBadgeProps {
  changePct: number;
  className?: string;
}

export function ChangeBadge({ changePct, className }: ChangeBadgeProps) {
  const sign = changePct > 0 ? '+' : '';
  return (
    <span
      className={cn('inline-flex items-center gap-1 tabular-nums', changeToneClass(changePct), className)}
    >
      <span aria-hidden>{directionGlyph(changePct)}</span>
      {sign}
      {changePct.toFixed(2)}%
    </span>
  );
}

export interface TickerValueProps {
  value: number;
  formatted: string;
  reducedMotion?: boolean;
  className?: string;
}

/**
 * A numeric value that briefly tints up/down when it changes. Uses tabular
 * figures so digits never shift. Respects reduced-motion both via a prop and
 * the `motion-reduce` utility.
 */
export function TickerValue({ value, formatted, reducedMotion, className }: TickerValueProps) {
  const prev = useRef(value);
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    if (value === prev.current) return;
    const dir = value > prev.current ? 'up' : 'down';
    prev.current = value;
    if (reducedMotion) return;
    setFlash(dir);
    const id = setTimeout(() => setFlash(null), 600);
    return () => clearTimeout(id);
  }, [value, reducedMotion]);

  return (
    <span
      className={cn(
        'rounded px-0.5 tabular-nums',
        flash === 'up' && 'animate-flash-up motion-reduce:animate-none',
        flash === 'down' && 'animate-flash-down motion-reduce:animate-none',
        className,
      )}
    >
      {formatted}
    </span>
  );
}

/** Minimal dependency-free SVG sparkline. */
export function Sparkline({
  data,
  width = 88,
  height = 24,
  positive,
}: {
  data: number[];
  width?: number;
  height?: number;
  positive?: boolean;
}) {
  if (data.length < 2) return <svg width={width} height={height} aria-hidden />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const points = data
    .map((v, i) => `${(i * step).toFixed(2)},${(height - ((v - min) / range) * height).toFixed(2)}`)
    .join(' ');
  const up = positive ?? (data[data.length - 1] ?? 0) >= (data[0] ?? 0);
  return (
    <svg width={width} height={height} aria-hidden className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        strokeWidth={1.5}
        className={up ? 'stroke-up' : 'stroke-down'}
      />
    </svg>
  );
}

export function ConnectionDot({ state }: { state: ConnectionState }) {
  const map: Record<ConnectionState, { tone: string; label: string }> = {
    open: { tone: 'bg-up', label: 'Live' },
    connecting: { tone: 'bg-warning animate-pulse-dot', label: 'Connecting' },
    reconnecting: { tone: 'bg-warning animate-pulse-dot', label: 'Reconnecting' },
    closed: { tone: 'bg-down', label: 'Offline' },
  };
  const { tone, label } = map[state];
  return (
    <span className="inline-flex items-center gap-1.5 text-2xs text-muted" role="status">
      <span className={cn('h-2 w-2 rounded-full', tone)} />
      {label}
    </span>
  );
}

export function MarketStatusPill({ status, scenario }: { status: string; scenario: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-elevated px-2 py-1 text-2xs">
      <span className={cn('h-1.5 w-1.5 rounded-full', status === 'open' ? 'bg-up' : 'bg-subtle')} />
      <span className="font-medium uppercase tracking-wide text-foreground">{status}</span>
      <span className="text-subtle">·</span>
      <span className="text-muted">{scenario}</span>
    </span>
  );
}

export function TimeframeSwitcher<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly T[];
  onChange: (tf: T) => void;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-md border border-border bg-surface p-0.5">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          aria-pressed={opt === value}
          className={cn(
            'rounded px-2 py-0.5 text-2xs font-medium tabular-nums transition-colors',
            opt === value ? 'bg-cyan/15 text-cyan' : 'text-muted hover:text-foreground',
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export interface StatTileProps {
  label: string;
  value: string;
  sub?: string;
  tone?: 'default' | 'up' | 'down';
}

export function StatTile({ label, value, sub, tone = 'default' }: StatTileProps) {
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2">
      <div className="text-2xs uppercase tracking-wider text-subtle">{label}</div>
      <div
        className={cn(
          'mt-0.5 text-lg font-semibold tabular-nums',
          tone === 'up' && 'text-up',
          tone === 'down' && 'text-down',
          tone === 'default' && 'text-foreground',
        )}
      >
        {value}
      </div>
      {sub && <div className="text-2xs text-muted tabular-nums">{sub}</div>}
    </div>
  );
}

/** Top-of-book ladder with depth bars. Bids descend, asks ascend from the mid. */
export function OrderBookLadder({
  bids,
  asks,
  depth = 10,
  formatPrice,
  formatSize,
  reducedMotion,
}: {
  bids: Level[];
  asks: Level[];
  depth?: number;
  formatPrice: (n: number) => string;
  formatSize: (n: number) => string;
  reducedMotion?: boolean;
}) {
  const shownBids = bids.slice(0, depth);
  const shownAsks = asks.slice(0, depth);
  const maxSize = Math.max(
    1,
    ...shownBids.map((l) => l[1]),
    ...shownAsks.map((l) => l[1]),
  );
  const spread = (asks[0]?.[0] ?? 0) - (bids[0]?.[0] ?? 0);

  const Row = ({ level, side }: { level: Level; side: 'bid' | 'ask' }) => {
    const pct = (level[1] / maxSize) * 100;
    return (
      <div className="relative grid grid-cols-2 px-2 py-[3px] text-2xs tabular-nums">
        <div
          className={cn('absolute inset-y-0', side === 'bid' ? 'right-0 bg-up/10' : 'right-0 bg-down/10')}
          style={{ width: `${pct}%` }}
        />
        <span className={cn('relative z-10', side === 'bid' ? 'text-up' : 'text-down')}>
          {formatPrice(level[0])}
        </span>
        <span className="relative z-10 text-right text-muted">{formatSize(level[1])}</span>
      </div>
    );
  };

  return (
    <div className={cn('flex flex-col', reducedMotion && 'transition-none')}>
      <div className="flex flex-col-reverse">
        {shownAsks.map((l, i) => (
          <Row key={`a${i}`} level={l} side="ask" />
        ))}
      </div>
      <div className="flex items-center justify-between border-y border-border px-2 py-1 text-2xs text-subtle">
        <span>Spread</span>
        <span className="tabular-nums text-muted">{formatPrice(spread)}</span>
      </div>
      <div>
        {shownBids.map((l, i) => (
          <Row key={`b${i}`} level={l} side="bid" />
        ))}
      </div>
    </div>
  );
}
