'use client';

import { ChangeBadge, Panel, cn } from '@pulsegrid/ui';
import { formatPrice } from '@pulsegrid/utils/format';
import Link from 'next/link';

import { AsyncContent } from '../AsyncContent.js';
import { useConnection, useMetrics } from '../../lib/hooks/useMarket.js';
import { type Mover } from '@pulsegrid/types';

function MoverRow({ mover }: { mover: Mover }) {
  return (
    <Link
      href={`/asset/${mover.symbol}`}
      className="flex items-center justify-between rounded px-2 py-1 text-sm hover:bg-elevated/60"
    >
      <span className="font-medium text-foreground">{mover.symbol}</span>
      <span className="flex items-center gap-3 tabular-nums">
        <span className="text-muted">{formatPrice(mover.price)}</span>
        <ChangeBadge changePct={mover.changePct} className="w-16 justify-end" />
      </span>
    </Link>
  );
}

export function TopMoversPanel() {
  const metrics = useMetrics();
  const connection = useConnection();

  return (
    <Panel title="Top Movers" bare>
      <AsyncContent loading={!metrics} connection={connection} empty={!!metrics && metrics.topByChange.length === 0}>
        {metrics && (
          <div className="grid grid-cols-1 gap-2 p-2">
            <div>
              <div className="mb-1 px-2 text-2xs uppercase tracking-wider text-up">Gainers</div>
              <div className="flex flex-col gap-0.5">
                {metrics.topByChange.filter((m) => m.changePct >= 0).slice(0, 5).map((m) => (
                  <MoverRow key={`g${m.symbol}`} mover={m} />
                ))}
              </div>
            </div>
            <div className={cn('border-t border-border pt-2')}>
              <div className="mb-1 px-2 text-2xs uppercase tracking-wider text-down">Losers</div>
              <div className="flex flex-col gap-0.5">
                {[...metrics.topByChange].reverse().filter((m) => m.changePct < 0).slice(0, 5).map((m) => (
                  <MoverRow key={`l${m.symbol}`} mover={m} />
                ))}
              </div>
            </div>
          </div>
        )}
      </AsyncContent>
    </Panel>
  );
}
