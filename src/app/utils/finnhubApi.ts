const API_KEY = import.meta.env.VITE_FINNHUB_API_KEY as string;
const BASE_URL = 'https://finnhub.io/api/v1';

export interface FinnhubQuote {
  c: number;   // current price
  d: number;   // change amount
  dp: number;  // change percent
}

export interface FinnhubCandles {
  o: number[];           // open prices
  h: number[];           // high prices
  l: number[];           // low prices
  c: number[];           // close prices
  t: number[];           // timestamps (Unix seconds)
  s: 'ok' | 'no_data';
}

export interface OhlcPoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export async function fetchQuote(symbol: string): Promise<FinnhubQuote> {
  const res = await fetch(`${BASE_URL}/quote?symbol=${symbol}&token=${API_KEY}`);
  if (!res.ok) throw new Error(`Quote fetch failed for ${symbol}: ${res.status}`);
  return res.json();
}

// 30-day daily candles
export async function fetchCandles(symbol: string): Promise<FinnhubCandles> {
  const to = Math.floor(Date.now() / 1000);
  const from = to - 30 * 24 * 60 * 60;
  const res = await fetch(
    `${BASE_URL}/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${API_KEY}`
  );
  if (!res.ok) throw new Error(`Candles fetch failed for ${symbol}: ${res.status}`);
  return res.json();
}

// 1-day intraday candles at 5-minute resolution
export async function fetchIntradayCandles(symbol: string): Promise<FinnhubCandles> {
  const to = Math.floor(Date.now() / 1000);
  const from = to - 2 * 24 * 60 * 60; // 2 days back to catch the last trading session
  const res = await fetch(
    `${BASE_URL}/stock/candle?symbol=${symbol}&resolution=5&from=${from}&to=${to}&token=${API_KEY}`
  );
  if (!res.ok) throw new Error(`Intraday candles fetch failed for ${symbol}: ${res.status}`);
  return res.json();
}

export interface FinnhubSymbol {
  symbol: string;
  description: string; // company name as returned by Finnhub
  type: string;        // e.g. "Common Stock", "ETP"
}

// Module-level in-memory cache (persists for the session)
let _symbolListCache: FinnhubSymbol[] | null = null;

export async function fetchSymbolList(): Promise<FinnhubSymbol[]> {
  if (_symbolListCache) return _symbolListCache;

  // Try localStorage (24-hour TTL)
  try {
    const raw = localStorage.getItem('fh_sym_list');
    const ts  = localStorage.getItem('fh_sym_list_ts');
    if (raw && ts && Date.now() - Number(ts) < 24 * 60 * 60 * 1000) {
      _symbolListCache = JSON.parse(raw) as FinnhubSymbol[];
      return _symbolListCache;
    }
  } catch { /* ignore */ }

  const res = await fetch(`${BASE_URL}/stock/symbol?exchange=US&token=${API_KEY}`);
  if (!res.ok) throw new Error(`Symbol list fetch failed: ${res.status}`);

  const data: FinnhubSymbol[] = await res.json();
  // Keep only plain common stocks (no dots = no share classes like BRK.A)
  const filtered = data.filter(s => s.type === 'Common Stock' && !s.symbol.includes('.'));

  _symbolListCache = filtered;

  try {
    localStorage.setItem('fh_sym_list', JSON.stringify(filtered));
    localStorage.setItem('fh_sym_list_ts', Date.now().toString());
  } catch { /* quota exceeded – skip caching */ }

  return filtered;
}

export function candlesToOhlcData(candles: FinnhubCandles, intraday = false): OhlcPoint[] {
  if (candles.s !== 'ok' || !candles.c?.length) return [];
  return candles.c.map((close, i) => {
    const date = new Date(candles.t[i] * 1000);
    const time = intraday
      ? date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
      : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return {
      time,
      open:  parseFloat((candles.o?.[i] ?? close).toFixed(2)),
      high:  parseFloat((candles.h?.[i] ?? close).toFixed(2)),
      low:   parseFloat((candles.l?.[i] ?? close).toFixed(2)),
      close: parseFloat(close.toFixed(2)),
    };
  });
}
