'use client';

import {
  Badge,
  Button,
  ChangeBadge,
  ConnectionDot,
  EmptyState,
  ErrorState,
  Kbd,
  LoadingState,
  MarketStatusPill,
  OrderBookLadder,
  Panel,
  Sparkline,
  StatTile,
  TickerValue,
  TimeframeSwitcher,
} from '@pulsegrid/ui';
import { formatCompact, formatPrice } from '@pulsegrid/utils/format';
import { useEffect, useState } from 'react';

const BIDS: [number, number][] = Array.from({ length: 10 }, (_, i) => [42000 - i * 5, 3 + i * 1.4]);
const ASKS: [number, number][] = Array.from({ length: 10 }, (_, i) => [42010 + i * 5, 3 + i * 1.2]);
const SPARK = Array.from({ length: 32 }, (_, i) => 100 + Math.sin(i / 3) * 8 + i * 0.4);

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Panel title={title}>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </Panel>
  );
}

export default function ComponentsPage() {
  const [price, setPrice] = useState(42000);
  const [tf, setTf] = useState<'1s' | '1m' | '5m'>('1m');

  useEffect(() => {
    const id = setInterval(() => setPrice((p) => p + (Math.random() - 0.5) * 40), 800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-3">
      <h1 className="text-lg font-semibold text-foreground">Component inventory</h1>
      <p className="text-xs text-muted">
        Live gallery of the reusable primitives in <span className="font-mono">@pulsegrid/ui</span>.
      </p>

      <Section title="Buttons">
        <Button>Default</Button>
        <Button variant="accent">Accent</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
      </Section>

      <Section title="Badges & status">
        <Badge>neutral</Badge>
        <Badge tone="up">up</Badge>
        <Badge tone="down">down</Badge>
        <Badge tone="cyan">cyan</Badge>
        <Badge tone="violet">violet</Badge>
        <ChangeBadge changePct={1.94} />
        <ChangeBadge changePct={-2.31} />
        <ConnectionDot state="open" />
        <MarketStatusPill status="open" scenario="showcase" />
        <Kbd>⌘</Kbd>
      </Section>

      <Section title="Flash-on-change ticker">
        <TickerValue value={price} formatted={formatPrice(price)} className="text-2xl text-foreground" />
        <Sparkline data={SPARK} />
        <TimeframeSwitcher value={tf} options={['1s', '1m', '5m'] as const} onChange={setTf} />
      </Section>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Panel title="Order book ladder" bare>
          <OrderBookLadder bids={BIDS} asks={ASKS} formatPrice={formatPrice} formatSize={formatCompact} />
        </Panel>
        <div className="grid grid-cols-2 gap-2">
          <StatTile label="Index" value="1,024" sub="+2.4%" tone="up" />
          <StatTile label="Vol Index" value="38.2" sub="annualised" tone="down" />
          <Panel title="Loading" bare>
            <LoadingState rows={3} />
          </Panel>
          <Panel title="States" bare>
            <EmptyState title="No data" description="Nothing here yet." />
          </Panel>
        </div>
      </div>

      <Panel title="Error state" bare>
        <ErrorState description="The feed could not be reached." onRetry={() => undefined} />
      </Panel>
    </div>
  );
}
