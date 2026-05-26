import { type Watchlist } from '@pulsegrid/types';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WatchlistState {
  watchlists: Watchlist[];
  activeId: string;
  setActive: (id: string) => void;
  addList: (name: string) => void;
  removeList: (id: string) => void;
  addSymbol: (id: string, symbol: string) => void;
  removeSymbol: (id: string, symbol: string) => void;
}

// Seeded so the Watchlists screen is populated on first visit (showcase state).
const DEFAULT_LISTS: Watchlist[] = [
  { id: 'core', name: 'Core Board', symbols: ['BTCUSD', 'ETHUSD', 'NVDA', 'AAPL', 'EURUSD', 'XAUUSD'] },
  { id: 'crypto', name: 'Crypto', symbols: ['BTCUSD', 'ETHUSD', 'SOLUSD'] },
  { id: 'equities', name: 'Equities', symbols: ['AAPL', 'NVDA', 'TSLA'] },
];

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set) => ({
      watchlists: DEFAULT_LISTS,
      activeId: 'core',
      setActive: (activeId) => set({ activeId }),
      addList: (name) =>
        set((s) => {
          const id = `wl-${Date.now()}`;
          return { watchlists: [...s.watchlists, { id, name, symbols: [] }], activeId: id };
        }),
      removeList: (id) =>
        set((s) => {
          const watchlists = s.watchlists.filter((w) => w.id !== id);
          const activeId = s.activeId === id ? (watchlists[0]?.id ?? '') : s.activeId;
          return { watchlists, activeId };
        }),
      addSymbol: (id, symbol) =>
        set((s) => ({
          watchlists: s.watchlists.map((w) =>
            w.id === id && !w.symbols.includes(symbol)
              ? { ...w, symbols: [...w.symbols, symbol] }
              : w,
          ),
        })),
      removeSymbol: (id, symbol) =>
        set((s) => ({
          watchlists: s.watchlists.map((w) =>
            w.id === id ? { ...w, symbols: w.symbols.filter((x) => x !== symbol) } : w,
          ),
        })),
    }),
    { name: 'pulsegrid.watchlists' },
  ),
);
