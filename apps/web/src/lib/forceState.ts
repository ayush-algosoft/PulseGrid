'use client';

import { useEffect, useState } from 'react';

export type ForcedState = 'loading' | 'empty' | 'error' | 'disconnected' | null;

const VALID: ForcedState[] = ['loading', 'empty', 'error', 'disconnected'];

/**
 * Dev/demo helper: append `?force=loading|empty|error|disconnected` to the URL
 * to force every async panel into that state. Lets the carefully built
 * resilience states be demonstrated and screenshotted on demand.
 */
export function useForcedState(): ForcedState {
  const [forced, setForced] = useState<ForcedState>(null);
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get('force') as ForcedState;
    setForced(VALID.includes(value) ? value : null);
  }, []);
  return forced;
}
