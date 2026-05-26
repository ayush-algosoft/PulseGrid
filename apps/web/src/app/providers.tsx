'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useRef, type ReactNode } from 'react';

import { CommandPalette } from '../components/CommandPalette.js';
import { KeyboardProvider } from '../components/KeyboardProvider.js';
import { PerfOverlay } from '../components/PerfOverlay.js';
import { ShortcutOverlay } from '../components/ShortcutOverlay.js';
import { getMarketClient } from '../lib/ws/marketClient.js';
import { useSettingsStore } from '../store/settingsStore.js';

export function Providers({ children }: { children: ReactNode }) {
  const queryClient = useRef(
    new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } } }),
  );
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);
  const density = useSettingsStore((s) => s.density);

  useEffect(() => {
    getMarketClient().start();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.reducedMotion = reducedMotion ? 'true' : 'false';
    document.documentElement.dataset.density = density;
  }, [reducedMotion, density]);

  return (
    <QueryClientProvider client={queryClient.current}>
      <KeyboardProvider>
        {children}
        <CommandPalette />
        <ShortcutOverlay />
        <PerfOverlay />
      </KeyboardProvider>
    </QueryClientProvider>
  );
}
