/** A keyboard shortcut. The overlay is generated from this list so it never drifts. */
export interface Shortcut {
  /** Display sequence, e.g. ['g', 'd'] or ['/']. */
  keys: string[];
  label: string;
  group: 'Navigation' | 'General';
}

export const SHORTCUTS: Shortcut[] = [
  { keys: ['/'], label: 'Open command palette / search', group: 'General' },
  { keys: ['?'], label: 'Toggle this shortcut overlay', group: 'General' },
  { keys: ['Esc'], label: 'Close overlays / blur search', group: 'General' },
  { keys: ['g', 'd'], label: 'Go to Dashboard', group: 'Navigation' },
  { keys: ['g', 'w'], label: 'Go to Watchlists', group: 'Navigation' },
  { keys: ['g', 'a'], label: 'Go to Market Activity', group: 'Navigation' },
  { keys: ['g', 'r'], label: 'Go to Replay', group: 'Navigation' },
  { keys: ['g', 's'], label: 'Go to Settings', group: 'Navigation' },
];

/** `g`-prefixed navigation targets. */
export const GOTO_ROUTES: Record<string, string> = {
  d: '/',
  w: '/watchlists',
  a: '/activity',
  r: '/replay',
  s: '/settings',
};
