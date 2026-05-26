'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { GOTO_ROUTES } from '../lib/keyboard/registry.js';
import { useUiStore } from '../store/uiStore.js';

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

/**
 * Global keyboard model. Conflict-free: no shortcut fires while typing in an
 * input (except Escape). Supports `g`-prefixed navigation sequences.
 */
export function KeyboardProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pendingG = useRef(false);
  const gTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const ui = useUiStore.getState;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        ui().closeAll();
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        return;
      }
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;

      if (pendingG.current) {
        const route = GOTO_ROUTES[e.key.toLowerCase()];
        pendingG.current = false;
        if (gTimer.current) clearTimeout(gTimer.current);
        if (route) {
          e.preventDefault();
          router.push(route);
          return;
        }
      }

      if (e.key === '/') {
        e.preventDefault();
        ui().setPalette(true);
        return;
      }
      if (e.key === '?') {
        e.preventDefault();
        ui().setShortcuts(!useUiStore.getState().shortcutsOpen);
        return;
      }
      if (e.key === 'g') {
        pendingG.current = true;
        if (gTimer.current) clearTimeout(gTimer.current);
        gTimer.current = setTimeout(() => {
          pendingG.current = false;
        }, 1200);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [router]);

  return <>{children}</>;
}
