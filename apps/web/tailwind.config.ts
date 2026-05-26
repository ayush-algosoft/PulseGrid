import preset from '@pulsegrid/ui/tailwind-preset';
import type { Config } from 'tailwindcss';

const config: Config = {
  presets: [preset as Config],
  content: [
    './src/**/*.{ts,tsx}',
    // The UI package ships components that use Tailwind classes.
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: { extend: {} },
  plugins: [],
};

export default config;
