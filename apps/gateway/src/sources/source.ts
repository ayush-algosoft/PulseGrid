import { type Asset, type ControlMessage, type EngineStatus } from '@pulsegrid/schemas';

import { type FeedEvent } from '../market-state.js';

/**
 * A market data source feeds the gateway with events. Two implementations exist
 * — an in-process engine (standalone) and a Kafka consumer — and the server
 * treats them identically.
 */
export interface MarketSource {
  start(): Promise<void>;
  stop(): Promise<void>;
  /** Apply a replay/scenario control command. May be a no-op for some sources. */
  control(msg: ControlMessage): void;
  onEvents(cb: (events: FeedEvent[]) => void): void;
  onStatus(cb: (status: EngineStatus) => void): void;
  getAssets(): readonly Asset[];
  getStatus(): EngineStatus;
  /** Liveness; always true once constructed. */
  isLive(): boolean;
  /** Readiness: upstream (Kafka) connected, or always true for standalone. */
  isReady(): boolean;
}
