import type { Asset } from '@pulsegrid/schemas';

/**
 * The instrument universe the platform tracks. A deliberately mixed book of
 * crypto, equities, FX and commodities so the dashboard shows varied dynamics.
 */
export const ASSETS: readonly Asset[] = [
  { symbol: 'BTCUSD', name: 'Bitcoin', assetClass: 'crypto', quoteCurrency: 'USD', tickSize: 0.5, basePrice: 42_000 },
  { symbol: 'ETHUSD', name: 'Ethereum', assetClass: 'crypto', quoteCurrency: 'USD', tickSize: 0.05, basePrice: 2_300 },
  { symbol: 'SOLUSD', name: 'Solana', assetClass: 'crypto', quoteCurrency: 'USD', tickSize: 0.01, basePrice: 98 },
  { symbol: 'AAPL', name: 'Apple Inc.', assetClass: 'equity', quoteCurrency: 'USD', tickSize: 0.01, basePrice: 188 },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', assetClass: 'equity', quoteCurrency: 'USD', tickSize: 0.01, basePrice: 620 },
  { symbol: 'TSLA', name: 'Tesla Inc.', assetClass: 'equity', quoteCurrency: 'USD', tickSize: 0.01, basePrice: 242 },
  { symbol: 'EURUSD', name: 'Euro / US Dollar', assetClass: 'fx', quoteCurrency: 'USD', tickSize: 0.0001, basePrice: 1.0850 },
  { symbol: 'XAUUSD', name: 'Gold Spot', assetClass: 'commodity', quoteCurrency: 'USD', tickSize: 0.1, basePrice: 2_030 },
] as const;

export const SYMBOLS: readonly string[] = ASSETS.map((a) => a.symbol);

const ASSET_BY_SYMBOL = new Map(ASSETS.map((a) => [a.symbol, a]));

export function getAsset(symbol: string): Asset | undefined {
  return ASSET_BY_SYMBOL.get(symbol);
}
