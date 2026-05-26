import type { Config } from 'tailwindcss';

import { colors, radii, shadows } from './tokens.js';

/**
 * Shared Tailwind preset implementing the institutional theme. The web app
 * extends this so every surface, accent and radius is consistent and tokenised.
 */
const preset: Partial<Config> = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        obsidian: colors.obsidian,
        base: colors.base,
        surface: colors.surface,
        panel: colors.panel,
        elevated: colors.elevated,
        border: colors.border,
        'border-strong': colors.borderStrong,
        foreground: colors.foreground,
        muted: colors.muted,
        subtle: colors.subtle,
        cyan: colors.cyan,
        emerald: colors.emerald,
        violet: colors.violet,
        up: colors.up,
        down: colors.down,
        warning: colors.warning,
        info: colors.info,
      },
      borderRadius: {
        sm: radii.sm,
        md: radii.md,
        lg: radii.lg,
        xl: radii.xl,
      },
      boxShadow: {
        soft: shadows.sm,
        panel: shadows.md,
        float: shadows.lg,
        ring: shadows.ring,
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      keyframes: {
        'flash-up': {
          '0%': { backgroundColor: 'rgba(52,211,153,0.18)' },
          '100%': { backgroundColor: 'transparent' },
        },
        'flash-down': {
          '0%': { backgroundColor: 'rgba(244,63,94,0.18)' },
          '100%': { backgroundColor: 'transparent' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'flash-up': 'flash-up 0.6s ease-out',
        'flash-down': 'flash-down 0.6s ease-out',
        'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
        shimmer: 'shimmer 1.5s infinite',
      },
    },
  },
};

export default preset;
