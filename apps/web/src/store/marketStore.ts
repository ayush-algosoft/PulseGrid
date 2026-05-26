import {
  type Asset,
  type Candle,
  type ConnectionState,
  type EngineStatus,
  type MarketMetricsPayload,
  type NewsEvent,
  type OrderBookPayload,
  type ServerMessage,
  type SymbolStats,
  type TickPayload,
  type TradeEvent,
} from '@pulsegrid/types';
import { create } from 'zustand';

const MAX_TRADES = 200;
const MAX_NEWS = 60;
const MAX_CANDLES = 320;

export interface SymbolTick extends TickPayload {
  symbol: string;
  ts: number;
}

interface MarketState {
  connection: ConnectionState;
  status: EngineStatus | null;
  assets: Asset[];
  tickBySymbol: Record<string, SymbolTick>;
  statsBySymbol: Record<string, SymbolStats>;
  orderbookBySymbol: Record<string, OrderBookPayload>;
  candlesByKey: Record<string, Candle[]>;
  trades: TradeEvent[];
  news: NewsEvent[];
  metrics: MarketMetricsPayload | null;
  /** Wall-clock ms of the last applied batch, for the perf overlay. */
  lastBatchAt: number;

  setConnection: (state: ConnectionState) => void;
  /** Apply a coalesced batch of server messages in a single store update. */
  applyBatch: (messages: ServerMessage[]) => void;
}

function upsertCandle(list: Candle[] | undefined, candle: Candle): Candle[] {
  const next = list ? [...list] : [];
  const last = next[next.length - 1];
  if (last && last.t === candle.t) next[next.length - 1] = candle;
  else next.push(candle);
  if (next.length > MAX_CANDLES) next.splice(0, next.length - MAX_CANDLES);
  return next;
}

export const useMarketStore = create<MarketState>((set) => ({
  connection: 'connecting',
  status: null,
  assets: [],
  tickBySymbol: {},
  statsBySymbol: {},
  orderbookBySymbol: {},
  candlesByKey: {},
  trades: [],
  news: [],
  metrics: null,
  lastBatchAt: 0,

  setConnection: (connection) => set({ connection }),

  applyBatch: (messages) =>
    set((state) => {
      // Clone only the maps we touch; unchanged inner refs stay stable so
      // selectors for untouched symbols don't re-render.
      let tickBySymbol = state.tickBySymbol;
      let statsBySymbol = state.statsBySymbol;
      let orderbookBySymbol = state.orderbookBySymbol;
      let candlesByKey = state.candlesByKey;
      let trades = state.trades;
      let news = state.news;
      let metrics = state.metrics;
      let status = state.status;
      let assets = state.assets;
      let touchedTick = false;
      let touchedStats = false;
      let touchedBook = false;
      let touchedCandle = false;
      let newTrades: TradeEvent[] | null = null;
      let newNews: NewsEvent[] | null = null;

      const ensureTick = () => {
        if (!touchedTick) {
          tickBySymbol = { ...tickBySymbol };
          touchedTick = true;
        }
        return tickBySymbol;
      };
      const ensureBook = () => {
        if (!touchedBook) {
          orderbookBySymbol = { ...orderbookBySymbol };
          touchedBook = true;
        }
        return orderbookBySymbol;
      };
      const ensureStats = () => {
        if (!touchedStats) {
          statsBySymbol = { ...statsBySymbol };
          touchedStats = true;
        }
        return statsBySymbol;
      };
      const ensureCandles = () => {
        if (!touchedCandle) {
          candlesByKey = { ...candlesByKey };
          touchedCandle = true;
        }
        return candlesByKey;
      };

      for (const msg of messages) {
        switch (msg.type) {
          case 'snapshot': {
            assets = msg.assets;
            status = msg.status;
            metrics = msg.metrics.payload;
            tickBySymbol = {};
            for (const t of msg.ticks) tickBySymbol[t.symbol] = { symbol: t.symbol, ts: t.ts, ...t.payload };
            touchedTick = true;
            orderbookBySymbol = {};
            for (const b of msg.orderbooks) orderbookBySymbol[b.symbol] = b.payload;
            touchedBook = true;
            candlesByKey = { ...msg.candles };
            touchedCandle = true;
            newTrades = [...msg.trades].slice(-MAX_TRADES);
            newNews = [...msg.news].slice(-MAX_NEWS);
            break;
          }
          case 'tick':
            ensureTick()[msg.symbol] = { symbol: msg.symbol, ts: msg.ts, ...msg.payload };
            break;
          case 'orderbook':
            ensureBook()[msg.symbol] = msg.payload;
            break;
          case 'candle': {
            const key = `${msg.symbol}:${msg.payload.tf}`;
            const map = ensureCandles();
            map[key] = upsertCandle(map[key], msg.payload.candle);
            ensureStats()[msg.symbol] = msg.payload.stats;
            break;
          }
          case 'metrics':
            metrics = msg.payload;
            break;
          case 'trade':
            newTrades = newTrades ?? [...trades];
            newTrades.push(msg);
            break;
          case 'news':
            newNews = newNews ?? [...news];
            newNews.push(msg);
            break;
          case 'status':
            status = msg;
            break;
          case 'pong':
          case 'error':
            break;
        }
      }

      if (newTrades) trades = newTrades.slice(-MAX_TRADES);
      if (newNews) news = newNews.slice(-MAX_NEWS);

      return {
        assets,
        status,
        metrics,
        tickBySymbol,
        statsBySymbol,
        orderbookBySymbol,
        candlesByKey,
        trades,
        news,
        lastBatchAt: Date.now(),
      };
    }),
}));
