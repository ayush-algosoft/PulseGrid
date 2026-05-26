/** Format a price with sensible precision for its magnitude. */
export function formatPrice(value: number): string {
  if (value >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (value >= 1) return value.toFixed(2);
  return value.toFixed(4);
}

/** Format a signed percentage, e.g. +1.94%. */
export function formatPct(value: number, digits = 2): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(digits)}%`;
}

/** Compact large numbers: 1234567 -> 1.23M. */
export function formatCompact(value: number): string {
  return Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(
    value,
  );
}

/** Format a notional/currency amount compactly with a leading $. */
export function formatNotional(value: number): string {
  return `$${formatCompact(value)}`;
}

/** Format an epoch-ms timestamp as HH:MM:SS. */
export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour12: false });
}
