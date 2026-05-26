/**
 * PulseGrid design tokens — the single source of truth for the institutional
 * dark theme. Surfaces are graphite/obsidian; accents are restrained cyan,
 * emerald and violet. Consumed by the Tailwind preset and available for
 * programmatic use (e.g. ECharts theming).
 */
export const colors = {
  // Surfaces, darkest to lightest.
  obsidian: '#0a0b0e',
  base: '#0d0f13',
  surface: '#111419',
  panel: '#161a21',
  elevated: '#1c212a',
  border: '#232934',
  borderStrong: '#2e3643',

  // Text.
  foreground: '#e7eaf0',
  muted: '#98a2b3',
  subtle: '#6b7585',

  // Accents.
  cyan: '#22d3ee',
  emerald: '#34d399',
  violet: '#a78bfa',

  // Semantic market colours.
  up: '#34d399',
  down: '#f43f5e',
  warning: '#fbbf24',
  info: '#38bdf8',
} as const;

export const radii = {
  sm: '0.375rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
} as const;

export const shadows = {
  // Soft, low-spread shadows — depth without glow.
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.4)',
  md: '0 4px 12px -2px rgb(0 0 0 / 0.5)',
  lg: '0 12px 32px -8px rgb(0 0 0 / 0.6)',
  // A single restrained accent ring for focus / active states.
  ring: '0 0 0 1px rgb(34 211 238 / 0.35)',
} as const;

export const typography = {
  fontSans: 'var(--font-sans)',
  fontMono: 'var(--font-mono)',
  scale: {
    xs: '0.6875rem',
    sm: '0.8125rem',
    base: '0.875rem',
    lg: '1rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '2rem',
  },
} as const;

export const spacing = {
  gutter: '1rem',
  panel: '1.25rem',
} as const;

/** ECharts-friendly theme colours derived from the tokens. */
export const chartTheme = {
  up: colors.up,
  down: colors.down,
  axis: colors.subtle,
  grid: 'rgba(255,255,255,0.04)',
  line: colors.cyan,
  area: 'rgba(34,211,238,0.12)',
  text: colors.muted,
} as const;
