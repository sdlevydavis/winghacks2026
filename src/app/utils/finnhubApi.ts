const API_KEY = import.meta.env.VITE_FINNHUB_API_KEY as string;
const BASE_URL = 'https://finnhub.io/api/v1';

export interface FinnhubQuote {
  c: number;   // current price
  d: number;   // change amount
  dp: number;  // change percent
  pc: number;  // previous close
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
// finnhubApi.ts
export async function fetchCandles(symbol: string, timeRange: '1M' | '1YR' | '10Y') {
  const nowSec = Math.floor(Date.now() / 1000);

  let fromSec: number;
  let resolution: '5' | '15' | '30' | '60' | 'D' | 'W' | 'M';

  switch (timeRange) {
    case '1M':
      fromSec = nowSec - 30 * 24 * 60 * 60;
      resolution = 'D'; // daily points for a month (clean + light)
      break;

    case '1YR':
      fromSec = nowSec - 365 * 24 * 60 * 60;
      resolution = 'D'; // daily candles for 1 year
      break;

    case '10Y':
    default:
      fromSec = nowSec - 10 * 365 * 24 * 60 * 60; // 10 years
      resolution = 'W'; // weekly so you don't pull thousands of points / hit limits
      break;
  }

  const url = `${BASE_URL}/stock/candle?symbol=${encodeURIComponent(
    symbol
  )}&resolution=${resolution}&from=${fromSec}&to=${nowSec}&token=${API_KEY}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Candles fetch failed: ${res.status}`);

  const data = await res.json();
  // Finnhub returns { s: 'ok'|'no_data', ... }
  if (!data || data.s !== 'ok') return { s: 'no_data' };

  return data;
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

  // Try localStorage (24-hour TTL) — v3 key forces refresh after filter changes
  try {
    const raw = localStorage.getItem('fh_sym_list_v3');
    const ts  = localStorage.getItem('fh_sym_list_v3_ts');
    if (raw && ts && Date.now() - Number(ts) < 24 * 60 * 60 * 1000) {
      _symbolListCache = JSON.parse(raw) as FinnhubSymbol[];
      return _symbolListCache;
    }
  } catch { /* ignore */ }

  const res = await fetch(`${BASE_URL}/stock/symbol?exchange=US&token=${API_KEY}`);
  if (!res.ok) throw new Error(`Symbol list fetch failed: ${res.status}`);

  const data: FinnhubSymbol[] = await res.json();
  // Keep common stocks, ADRs (e.g. TSM, BABA), and ETFs/ETPs (e.g. SPY, QQQ)
  // Exclude dotted share classes like BRK.A
  const filtered = data.filter(s =>
    (s.type === 'Common Stock' || s.type === 'ADR' || s.type === 'ETP') && !s.symbol.includes('.')
  );

  _symbolListCache = filtered;

  try {
    localStorage.setItem('fh_sym_list_v3', JSON.stringify(filtered));
    localStorage.setItem('fh_sym_list_v3_ts', Date.now().toString());
  } catch { /* quota exceeded – skip caching */ }

  return filtered;
}

export interface NewsArticle {
  id: number;
  datetime: number;  // Unix timestamp
  headline: string;
  source: string;
  url: string;
  image: string;
  summary: string;
}

// Module-level cache keyed by symbol, expires after 10 minutes
const _newsCache = new Map<string, { data: NewsArticle[]; ts: number }>();

export async function fetchCompanyNews(symbol: string): Promise<NewsArticle[]> {
  const cached = _newsCache.get(symbol);
  if (cached && Date.now() - cached.ts < 10 * 60 * 1000) return cached.data;

  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const res = await fetch(
    `${BASE_URL}/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${API_KEY}`
  );
  if (!res.ok) throw new Error(`News fetch failed for ${symbol}: ${res.status}`);
  const data: NewsArticle[] = await res.json();
  const articles = data.slice(0, 5);
  _newsCache.set(symbol, { data: articles, ts: Date.now() });
  return articles;
}

export function candlesToOhlcData(
  candles: FinnhubCandles,
  timeRange: '1D' | '1M' | '1YR' | '10Y' = '1M',
): OhlcPoint[] {
  if (candles.s !== 'ok' || !candles.c?.length) return [];
  return candles.c.map((close, i) => {
    const date = new Date(candles.t[i] * 1000);
    let time: string;
    if (timeRange === '1D') {
      time = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    } else if (timeRange === '10Y') {
      // Weekly candles span many years — include year so labels stay unique per month
      time = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    } else {
      // 1M: ~30 daily points, 1YR: ~252 daily points — day-level labels are unique
      time = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return {
      time,
      open:  parseFloat((candles.o?.[i] ?? close).toFixed(2)),
      high:  parseFloat((candles.h?.[i] ?? close).toFixed(2)),
      low:   parseFloat((candles.l?.[i] ?? close).toFixed(2)),
      close: parseFloat(close.toFixed(2)),
    };
  });
}
