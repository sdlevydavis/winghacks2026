import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';
import { Stock } from '../types';
import { STOCK_DEFINITIONS, TRACKED_SYMBOLS, buildSkeletonStock } from '../utils/stockDefinitions';
import { fetchQuote, FinnhubQuote } from '../utils/finnhubApi';

interface StocksContextValue {
  stocks: Stock[];
  isLoading: boolean;
  error: string | null;
  getStock: (symbol: string) => Stock | undefined;
}

const StocksContext = createContext<StocksContextValue | null>(null);

function mergeQuote(stock: Stock, quote: FinnhubQuote): Stock {
  // When markets are closed Finnhub returns c=0 and null for d/dp — fall back to previous close
  const price = quote.c > 0 ? quote.c : quote.pc;
  return {
    ...stock,
    currentPrice: parseFloat(price.toFixed(2)),
    changeAmount: parseFloat((quote.d ?? 0).toFixed(2)),
    changePercent: parseFloat((quote.dp ?? 0).toFixed(2)),
  };
}

export function StocksProvider({ children }: { children: ReactNode }) {
  const [stocks, setStocks] = useState<Stock[]>(
    STOCK_DEFINITIONS.map(buildSkeletonStock)
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch all quotes on mount — stagger requests to stay within Finnhub's free-tier rate limit
  useEffect(() => {
    let cancelled = false;

    async function loadQuotes() {
      // Fetch sequentially with a small gap to avoid 429s from parallel bursts
      const results: PromiseSettledResult<FinnhubQuote>[] = [];
      for (const symbol of TRACKED_SYMBOLS) {
        if (cancelled) return;
        const result = await fetchQuote(symbol)
          .then(q => ({ status: 'fulfilled' as const, value: q }))
          .catch(e => ({ status: 'rejected' as const, reason: e }));
        results.push(result);
        // Small gap between requests
        await new Promise(r => setTimeout(r, 120));
      }

      if (cancelled) return;

      let failCount = 0;
      setStocks(prev =>
        prev.map((stock, i) => {
          const result = results[i];
          if (result.status === 'fulfilled') {
            return mergeQuote(stock, result.value);
          }
          failCount++;
          return stock;
        })
      );

      // Only surface an error when the majority of quotes failed — a single blip is normal
      if (failCount > TRACKED_SYMBOLS.length / 2) {
        setError('Some stock prices could not be loaded. Check your API key.');
      }
      setIsLoading(false);
    }

    loadQuotes();
    return () => { cancelled = true; };
  }, []);

  // Open WebSocket after initial quotes are loaded
  const connectWebSocket = useCallback(() => {
    // Guard against double-open (React StrictMode fires effects twice in dev)
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) return;

    const apiKey = import.meta.env.VITE_FINNHUB_API_KEY as string;
    const ws = new WebSocket(`wss://ws.finnhub.io?token=${apiKey}`);
    wsRef.current = ws;

    ws.onopen = () => {
      TRACKED_SYMBOLS.forEach(symbol => {
        ws.send(JSON.stringify({ type: 'subscribe', symbol }));
      });
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string);
        if (msg.type !== 'trade' || !Array.isArray(msg.data)) return;

        // Take the latest price per symbol in this batch
        const updates = new Map<string, number>();
        for (const trade of msg.data as { s: string; p: number }[]) {
          updates.set(trade.s, trade.p);
        }

        if (updates.size === 0) return;

        setStocks(prev =>
          prev.map(stock => {
            const newPrice = updates.get(stock.symbol);
            if (newPrice === undefined || newPrice === stock.currentPrice) return stock;
            const delta = parseFloat((newPrice - stock.currentPrice).toFixed(2));
            return {
              ...stock,
              currentPrice: parseFloat(newPrice.toFixed(2)),
              changeAmount: parseFloat((stock.changeAmount + delta).toFixed(2)),
            };
          })
        );
      } catch {
        // Ignore malformed messages
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      reconnectTimerRef.current = setTimeout(connectWebSocket, 5000);
    };
  }, []);

  useEffect(() => {
    if (!isLoading) {
      connectWebSocket();
    }
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      const ws = wsRef.current;
      if (ws) {
        if (ws.readyState === WebSocket.OPEN) {
          TRACKED_SYMBOLS.forEach(symbol => {
            ws.send(JSON.stringify({ type: 'unsubscribe', symbol }));
          });
        }
        ws.close();
        wsRef.current = null;
      }
    };
  }, [isLoading, connectWebSocket]);

  const getStock = useCallback(
    (symbol: string) => stocks.find(s => s.symbol === symbol),
    [stocks]
  );

  return (
    <StocksContext.Provider value={{ stocks, isLoading, error, getStock }}>
      {children}
    </StocksContext.Provider>
  );
}

export function useStocks(): StocksContextValue {
  const ctx = useContext(StocksContext);
  if (!ctx) throw new Error('useStocks must be used inside StocksProvider');
  return ctx;
}
