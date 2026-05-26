'use client';

import { Badge, Kbd } from '@pulsegrid/ui';
import { SCENARIO_LIST, SCENARIOS } from '@pulsegrid/utils/scenarios';
import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useAssets } from '../lib/hooks/useMarket.js';
import { getMarketClient } from '../lib/ws/marketClient.js';
import { useUiStore } from '../store/uiStore.js';

interface Command {
  id: string;
  label: string;
  hint?: string;
  group: string;
  run: () => void;
}

export function CommandPalette() {
  const open = useUiStore((s) => s.paletteOpen);
  const setPalette = useUiStore((s) => s.setPalette);
  const togglePerf = useUiStore((s) => s.togglePerf);
  const router = useRouter();
  const assets = useAssets();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = useMemo<Command[]>(() => {
    const nav: Command[] = [
      { id: 'nav-dash', label: 'Go to Dashboard', group: 'Navigation', run: () => router.push('/') },
      { id: 'nav-watch', label: 'Go to Watchlists', group: 'Navigation', run: () => router.push('/watchlists') },
      { id: 'nav-act', label: 'Go to Market Activity', group: 'Navigation', run: () => router.push('/activity') },
      { id: 'nav-replay', label: 'Go to Replay', group: 'Navigation', run: () => router.push('/replay') },
      { id: 'nav-settings', label: 'Go to Settings', group: 'Navigation', run: () => router.push('/settings') },
    ];
    const symbolCmds: Command[] = assets.map((a) => ({
      id: `sym-${a.symbol}`,
      label: `${a.symbol} — ${a.name}`,
      hint: 'Open asset',
      group: 'Assets',
      run: () => router.push(`/asset/${a.symbol}`),
    }));
    const presets: Command[] = SCENARIO_LIST.map((s) => ({
      id: `scn-${s}`,
      label: `Run scenario: ${SCENARIOS[s].label}`,
      hint: SCENARIOS[s].description,
      group: 'Scenarios',
      run: () => getMarketClient().control({ command: 'setScenario', scenario: s }),
    }));
    const general: Command[] = [
      { id: 'perf', label: 'Toggle performance overlay', group: 'General', run: () => togglePerf() },
    ];
    return [...nav, ...symbolCmds, ...presets, ...general];
  }, [assets, router, togglePerf]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  if (!open) return null;

  const run = (cmd: Command | undefined) => {
    if (!cmd) return;
    cmd.run();
    setPalette(false);
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-start justify-center bg-obsidian/70 pt-[12vh]"
        onMouseDown={() => setPalette(false)}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          className="w-full max-w-xl overflow-hidden rounded-xl border border-border-strong bg-panel shadow-float"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands, assets, scenarios…"
            className="w-full border-b border-border bg-transparent px-4 py-3 text-sm text-foreground outline-none placeholder:text-subtle"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, filtered.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                run(filtered[active]);
              }
            }}
          />
          <ul className="max-h-80 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-subtle">No matches</li>
            )}
            {filtered.map((cmd, i) => (
              <li key={cmd.id}>
                <button
                  onMouseEnter={() => setActive(i)}
                  onClick={() => run(cmd)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm ${
                    i === active ? 'bg-elevated text-foreground' : 'text-muted'
                  }`}
                >
                  <span className="truncate">{cmd.label}</span>
                  <Badge tone={i === active ? 'cyan' : 'neutral'}>{cmd.group}</Badge>
                </button>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-2 text-2xs text-subtle">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            navigate
            <Kbd>↵</Kbd>
            select
            <Kbd>Esc</Kbd>
            close
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
