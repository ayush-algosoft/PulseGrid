'use client';

import { Kbd } from '@pulsegrid/ui';
import { AnimatePresence, motion } from 'framer-motion';

import { SHORTCUTS } from '../lib/keyboard/registry.js';
import { useUiStore } from '../store/uiStore.js';

export function ShortcutOverlay() {
  const open = useUiStore((s) => s.shortcutsOpen);
  const setShortcuts = useUiStore((s) => s.setShortcuts);
  if (!open) return null;

  const groups = ['Navigation', 'General'] as const;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian/70"
        onMouseDown={() => setShortcuts(false)}
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="w-full max-w-md rounded-xl border border-border-strong bg-panel p-5 shadow-float"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <h2 className="mb-4 text-sm font-semibold text-foreground">Keyboard shortcuts</h2>
          <div className="space-y-4">
            {groups.map((group) => (
              <div key={group}>
                <div className="mb-2 text-2xs uppercase tracking-wider text-subtle">{group}</div>
                <ul className="space-y-1.5">
                  {SHORTCUTS.filter((s) => s.group === group).map((s) => (
                    <li key={s.label} className="flex items-center justify-between text-sm">
                      <span className="text-muted">{s.label}</span>
                      <span className="flex items-center gap-1">
                        {s.keys.map((k) => (
                          <Kbd key={k}>{k}</Kbd>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
