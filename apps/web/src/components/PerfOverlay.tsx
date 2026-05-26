'use client';

import { useEffect, useRef, useState } from 'react';

import { getMarketClient } from '../lib/ws/marketClient.js';
import { useMarketStore } from '../store/marketStore.js';
import { useUiStore } from '../store/uiStore.js';

/**
 * Toggleable in-app performance overlay (fps, frame count, socket latency).
 * Used to verify the "60 fps feel under load" budget rather than assert it.
 */
export function PerfOverlay() {
  const visible = useUiStore((s) => s.perfOverlay);
  const [fps, setFps] = useState(0);
  const [frames, setFrames] = useState(0);
  const [latency, setLatency] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!visible) return;
    let last = performance.now();
    let count = 0;
    let total = 0;
    const tick = (now: number) => {
      count += 1;
      total += 1;
      if (now - last >= 500) {
        setFps(Math.round((count * 1000) / (now - last)));
        setFrames(total);
        setLatency(getMarketClient().getLatency());
        count = 0;
        last = now;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current !== null) cancelAnimationFrame(raf.current);
    };
  }, [visible]);

  if (!visible) return null;

  const fpsTone = fps >= 55 ? 'text-up' : fps >= 30 ? 'text-warning' : 'text-down';

  return (
    <div className="fixed bottom-3 right-3 z-40 rounded-md border border-border-strong bg-obsidian/90 px-3 py-2 font-mono text-2xs text-muted shadow-float">
      <div className="mb-1 font-semibold uppercase tracking-wider text-subtle">Perf</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 tabular-nums">
        <span>fps</span>
        <span className={`text-right ${fpsTone}`}>{fps}</span>
        <span>frames</span>
        <span className="text-right text-foreground">{frames}</span>
        <span>ws latency</span>
        <span className="text-right text-foreground">{latency}ms</span>
        <span>last batch</span>
        <PerfBatchAge />
      </div>
    </div>
  );
}

function PerfBatchAge() {
  const lastBatchAt = useMarketStore((s) => s.lastBatchAt);
  const [age, setAge] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setAge(lastBatchAt ? Date.now() - lastBatchAt : 0), 250);
    return () => clearInterval(id);
  }, [lastBatchAt]);
  return <span className="text-right text-foreground">{age}ms</span>;
}
