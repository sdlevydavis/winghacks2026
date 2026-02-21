import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router';
import { ArrowLeft, TrendingUp, TrendingDown, Info, Loader2 } from 'lucide-react';
import {
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts';
import { useStocks } from '../context/StocksContext';
import { fetchQuote, fetchCandles, fetchIntradayCandles, candlesToOhlcData, OhlcPoint, fetchCompanyNews, NewsArticle } from '../utils/finnhubApi';
import { getUserData, saveUserData } from '../utils/storage';
import { Stock, UserData, Transaction, Achievement, ShortPosition, OptionContract } from '../types';
import { blackScholes, historicalVolatility, delta } from '../utils/blackScholes';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { toast } from 'sonner';

type TimeRange = '1D' | '1M' | '1YR' | '10Y';
type ChartType = 'area' | 'candlestick';

// Module-level cache keyed by `${symbol}_${timeRange}`
const candleCache = new Map<string, OhlcPoint[]>();

function generateFallbackDaily(basePrice: number, timeRange: TimeRange): OhlcPoint[] {
  const data: OhlcPoint[] = [];
  let price = basePrice * 0.95;
  // 1M → 30 daily points, 1YR → 356 daily points, MAX → 520 weekly points (~10 yrs)
  const isWeekly   = timeRange === '10Y';
  const numPoints  = timeRange === '1YR' ? 356 : timeRange === '10Y' ? 520 : 30;
  const dayStep    = isWeekly ? 7 : 1;
  for (let i = numPoints - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i * dayStep);
    const open = parseFloat(price.toFixed(2));
    const change = (Math.random() - 0.48) * 0.03;
    const close = Math.max(open * (1 + change), 0.01);
    const high = Math.max(open, close) * (1 + Math.random() * 0.005);
    const low  = Math.min(open, close) * (1 - Math.random() * 0.005);
    const time = isWeekly
      ? date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    data.push({
      time,
      open,
      high: parseFloat(high.toFixed(2)),
      low:  parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
    });
    price = close;
  }
  if (data.length > 0) data[data.length - 1].close = parseFloat(basePrice.toFixed(2));
  return data;
}

function generateFallbackIntraday(basePrice: number): OhlcPoint[] {
  const data: OhlcPoint[] = [];
  let price = basePrice * 0.98;
  // 9:30 AM to 4:00 PM = 78 five-minute intervals
  for (let i = 0; i < 78; i++) {
    const totalMinutes = 9 * 60 + 30 + i * 5;
    const hours = Math.floor(totalMinutes / 60);
    const mins  = totalMinutes % 60;
    const time  = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    const open  = parseFloat(price.toFixed(2));
    const change = (Math.random() - 0.49) * 0.008;
    const close = Math.max(open * (1 + change), 0.01);
    const high  = Math.max(open, close) * (1 + Math.random() * 0.002);
    const low   = Math.min(open, close) * (1 - Math.random() * 0.002);
    data.push({
      time,
      open,
      high:  parseFloat(high.toFixed(2)),
      low:   parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
    });
    price = close;
  }
  if (data.length > 0) data[data.length - 1].close = parseFloat(basePrice.toFixed(2));
  return data;
}

// Custom tooltip for candlestick view
function CandlestickTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as OhlcPoint;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-2 text-xs shadow-md">
      <p className="font-semibold text-gray-700 mb-1">{d.time}</p>
      <p className="text-gray-500">O: <span className="font-medium text-gray-900">${d.open.toFixed(2)}</span></p>
      <p className="text-gray-500">H: <span className="font-medium text-green-600">${d.high.toFixed(2)}</span></p>
      <p className="text-gray-500">L: <span className="font-medium text-red-600">${d.low.toFixed(2)}</span></p>
      <p className="text-gray-500">C: <span className="font-medium text-gray-900">${d.close.toFixed(2)}</span></p>
    </div>
  );
}

export function StockDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { getStock } = useStocks();
  const [userData, setUserData] = useState<UserData>(getUserData());
  const [showBuyDialog, setShowBuyDialog] = useState(false);
  const [showSellDialog, setShowSellDialog] = useState(false);
  const [shares, setShares] = useState<string>('1');
  const [buyMode, setBuyMode] = useState<'shares' | 'dollars'>('shares');
  const [dollarAmount, setDollarAmount] = useState<string>('100');
  const [historicalData, setHistoricalData] = useState<OhlcPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('1D');
  const [chartType, setChartType] = useState<ChartType>('area');
  const [selectStart, setSelectStart] = useState<string | null>(null);
  const [selectEnd, setSelectEnd]     = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [zoomRange, setZoomRange]     = useState<[number, number] | null>(null);

  // Short selling
  const [showShortDialog, setShowShortDialog]   = useState(false);
  const [showCoverDialog, setShowCoverDialog]   = useState(false);
  const [shortShares, setShortShares]           = useState<string>('1');

  // Options
  const [showOptionsDialog, setShowOptionsDialog] = useState(false);
  const [optionType, setOptionType]   = useState<'call' | 'put'>('call');
  const [strikeOffset, setStrikeOffset] = useState<number>(0);   // % from current price
  const [optionExpiry, setOptionExpiry] = useState<7 | 14 | 30>(14); // days
  const [optionContracts, setOptionContracts] = useState<string>('1');

  // News
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);

  // On-demand fetch for symbols outside the curated list
  const [onDemandStock, setOnDemandStock] = useState<Stock | null>(null);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockFetchError, setStockFetchError] = useState(false);

  const stock = getStock(symbol ?? '');
  const activeStock = stock ?? onDemandStock;
  const holding = activeStock ? userData.portfolio[activeStock.symbol] : undefined;
  const shortPosition: ShortPosition | undefined = activeStock ? userData.shorts?.[activeStock.symbol] : undefined;

  // Fetch quote on-demand when symbol isn't in the curated list
  useEffect(() => {
    if (stock || !symbol) return;
    setStockLoading(true);
    setStockFetchError(false);
    setOnDemandStock(null);
    const passedName = (location.state as { name?: string } | null)?.name ?? symbol;
    fetchQuote(symbol)
      .then(quote => {
        // Use current price, fall back to previous close (e.g. market closed, ADRs after hours)
        const price = quote.c > 0 ? quote.c : quote.pc;
        if (price === 0) {
          setStockFetchError(true);
          return;
        }
        setOnDemandStock({
          symbol,
          name: passedName,
          currentPrice: price,
          changeAmount: quote.d,
          changePercent: quote.dp,
          description: '',
          sector: 'Other',
          historicalData: [],
        });
      })
      .catch(() => setStockFetchError(true))
      .finally(() => setStockLoading(false));
  }, [symbol, stock, location.state]);

  // Fetch company news when symbol changes
  useEffect(() => {
    if (!symbol) return;
    setNewsLoading(true);
    setNews([]);
    fetchCompanyNews(symbol)
      .then(articles => setNews(articles))
      .catch(() => {})
      .finally(() => setNewsLoading(false));
  }, [symbol]);

  // Keep a ref to the latest stock so the candle effect can read the
  // current price at fallback time without re-triggering on every tick.
  const stockRef = useRef(activeStock);
  useEffect(() => { stockRef.current = activeStock; });

  // Slice historicalData to the zoomed window (or show all if no zoom)
  const displayData = useMemo(() =>
    zoomRange ? historicalData.slice(zoomRange[0], zoomRange[1] + 1) : historicalData,
    [historicalData, zoomRange]
  );

  // Derived y-axis domain covering all OHLC values for the visible window
  const [domainMin, domainMax] = useMemo(() => {
    if (displayData.length === 0) return [0, 1];
    const prices = displayData.flatMap(d => [d.open, d.high, d.low, d.close]);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const pad = (max - min) * 0.05;
    return [min - pad, max + pad];
  }, [displayData]);

  // Candlestick bar shape — uses background bounds + precomputed domain for pixel maths
  const renderCandlestick = useCallback((props: any) => {
    const { x, width, payload, background } = props;
    if (!payload || !background) return null;

    const totalRange = domainMax - domainMin;
    if (totalRange === 0) return null;

    const { open, high, low, close } = payload as OhlcPoint;
    const isUp   = close >= open;
    const color  = isUp ? '#10b981' : '#ef4444';

    // Map a data value to a pixel y-coordinate within the chart area
    const toPixel = (val: number) =>
      background.y + background.height * (1 - (val - domainMin) / totalRange);

    const highY  = toPixel(high);
    const lowY   = toPixel(low);
    const openY  = toPixel(open);
    const closeY = toPixel(close);

    const bodyTop    = Math.min(openY, closeY);
    const bodyHeight = Math.max(Math.abs(closeY - openY), 1);
    const centerX    = x + width / 2;
    const bodyWidth  = Math.max(width - 2, 1);

    return (
      <g>
        {/* High–low wick */}
        <line x1={centerX} y1={highY} x2={centerX} y2={lowY} stroke={color} strokeWidth={1.5} />
        {/* Open–close body */}
        <rect x={x + 1} y={bodyTop} width={bodyWidth} height={bodyHeight} fill={color} />
      </g>
    );
  }, [domainMin, domainMax]);

  // Annualised volatility from 1M candle history (used by Black-Scholes)
  const sigma = useMemo(() =>
    historicalVolatility(historicalData.map(d => d.close)),
    [historicalData]
  );

  // Fetch candle data; fall back to generated history when API is unavailable
  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;

    const cacheKey = `${symbol}_${timeRange}`;

    if (candleCache.has(cacheKey)) {
      setHistoricalData(candleCache.get(cacheKey)!);
      setChartLoading(false);
      return;
    }

    setChartLoading(true);
    setHistoricalData([]);
    setZoomRange(null);

    const applyFallback = () => {
      if (cancelled) return;
      const basePrice = stockRef.current?.currentPrice ?? 100;
      const fallback = timeRange === '1D'
        ? generateFallbackIntraday(basePrice)
        : generateFallbackDaily(basePrice, timeRange);
      candleCache.set(cacheKey, fallback);
      setHistoricalData(fallback);
    };

    const request =
      timeRange === '1D'
        ? fetchIntradayCandles(symbol)
        : fetchCandles(symbol, timeRange);

    request
      .then((candles: any) => {
        if (cancelled) return;
        const data = candlesToOhlcData(candles, timeRange);
        if (data.length > 0) {
          candleCache.set(cacheKey, data);
          setHistoricalData(data);
        } else {
          applyFallback();
        }
      })
      .catch(() => applyFallback())
      .finally(() => {
        if (!cancelled) setChartLoading(false);
      });

    return () => { cancelled = true; };
  }, [symbol, timeRange]);

  if (!activeStock) {
    return (
      <div className="p-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        {stockLoading ? (
          <div className="flex items-center justify-center gap-2 mt-8 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading stock data…</span>
          </div>
        ) : stockFetchError ? (
          <div className="text-center mt-8 space-y-3">
            <p className="text-gray-500">Could not load price for <span className="font-semibold">{symbol}</span>.</p>
            <p className="text-xs text-gray-400">This may be a rate limit or the symbol may be unavailable on Finnhub's free tier.</p>
            <Button size="sm" variant="outline" onClick={() => {
              setStockFetchError(false);
              setStockLoading(true);
              const passedName = (location.state as { name?: string } | null)?.name ?? symbol ?? '';
              fetchQuote(symbol ?? '').then(quote => {
                const price = quote.c > 0 ? quote.c : quote.pc;
                if (price === 0) { setStockFetchError(true); return; }
                setOnDemandStock({ symbol: symbol!, name: passedName, currentPrice: price, changeAmount: quote.d, changePercent: quote.dp, description: '', sector: 'Other', historicalData: [] });
              }).catch(() => setStockFetchError(true)).finally(() => setStockLoading(false));
            }}>Retry</Button>
          </div>
        ) : (
          <p className="text-center text-gray-500 mt-8">Stock not found</p>
        )}
      </div>
    );
  }

  // P&L derived from the currently visible chart window (or zoom slice).
  // Falls back to the live quote values while chart data is still loading.
  const windowStart  = displayData.length > 0 ? displayData[0].open : null;
  const windowEnd    = displayData.length > 0 ? displayData[displayData.length - 1].close : null;
  const windowChange = windowStart != null && windowEnd != null
    ? parseFloat((windowEnd - windowStart).toFixed(2))
    : activeStock.changeAmount;
  const windowChangePct = windowStart != null && windowStart > 0
    ? parseFloat(((windowEnd! - windowStart) / windowStart * 100).toFixed(2))
    : activeStock.changePercent;
  const isPositive   = windowChangePct >= 0;
  const sharesNum    = parseFloat(shares) || 0;
  const buySharesNum = buyMode === 'shares'
    ? sharesNum
    : parseFloat((parseFloat(dollarAmount) / activeStock.currentPrice).toFixed(10)) || 0;
  const totalCost    = parseFloat((sharesNum * activeStock.currentPrice).toFixed(2));
  const buyTotalCost = buyMode === 'shares'
    ? totalCost
    : parseFloat(parseFloat(dollarAmount || '0').toFixed(2));
  const canAfford   = buyTotalCost <= userData.balance;
  const canSell     = holding && sharesNum > 0 && sharesNum <= holding.shares + 0.000001;

  // Short selling derived values
  const shortSharesNum  = parseInt(shortShares) || 0;
  const shortCollateral = shortSharesNum * activeStock.currentPrice;
  const canShort        = shortCollateral > 0 && shortCollateral <= userData.balance;
  const canCover        = !!(shortPosition && shortSharesNum > 0 && shortSharesNum <= shortPosition.shares);
  const coverPnL        = shortPosition
    ? (shortPosition.borrowPrice - activeStock.currentPrice) * shortSharesNum
    : 0;

  // Options derived values
  const contractsNum    = parseInt(optionContracts) || 0;
  const strikePrice     = parseFloat((activeStock.currentPrice * (1 + strikeOffset / 100)).toFixed(2));
  const T               = optionExpiry / 365;
  const premiumPerShare = blackScholes(activeStock.currentPrice, strikePrice, T, 0.05, Math.max(sigma, 0.05), optionType);
  const optionDelta     = delta(activeStock.currentPrice, strikePrice, T, 0.05, Math.max(sigma, 0.05), optionType);
  const totalPremium    = premiumPerShare * contractsNum;
  const canBuyOption    = contractsNum > 0 && totalPremium <= userData.balance;

  const checkAchievements = (updatedData: UserData): Achievement[] => {
    const newlyUnlocked: Achievement[] = [];

    updatedData.achievements.forEach(achievement => {
      if (achievement.unlocked) return;

      let shouldUnlock = false;

      switch (achievement.id) {
        case 'first_trade':
          shouldUnlock = updatedData.transactions.length >= 1;
          break;
        case 'profit_maker':
          shouldUnlock = updatedData.transactions.some(t => {
            if (t.type !== 'sell') return false;
            const buyTx = updatedData.transactions.find(
              bt => bt.symbol === t.symbol && bt.type === 'buy'
            );
            return buyTx && t.price > buyTx.price;
          });
          break;
        case 'diversified': {
          const sectors = new Set(
            Object.keys(updatedData.portfolio).map(sym => getStock(sym)?.sector)
          );
          shouldUnlock = sectors.size >= 3;
          break;
        }
        case 'big_spender':
          shouldUnlock = updatedData.transactions.some(t => t.shares * t.price >= 50);
          break;
        case 'day_trader':
          shouldUnlock = updatedData.transactions.length >= 10;
          break;
        case 'portfolio_builder':
          shouldUnlock = Object.keys(updatedData.portfolio).length >= 5;
          break;
      }

      if (shouldUnlock) {
        achievement.unlocked = true;
        achievement.unlockedAt = Date.now();
        newlyUnlocked.push(achievement);
      }
    });

    return newlyUnlocked;
  };

  const handleBuy = () => {
    if (!canAfford || buySharesNum <= 0) return;

    const transaction: Transaction = {
      id: Date.now().toString(),
      symbol: activeStock.symbol,
      type: 'buy',
      shares: buySharesNum,
      price: activeStock.currentPrice,
      timestamp: Date.now()
    };

    const updatedPortfolio = { ...userData.portfolio };
    if (updatedPortfolio[activeStock.symbol]) {
      const existing = updatedPortfolio[activeStock.symbol];
      const totalShares    = existing.shares + buySharesNum;
      const totalCostBasis = (existing.shares * existing.averagePrice) + (buySharesNum * activeStock.currentPrice);
      updatedPortfolio[activeStock.symbol] = { shares: totalShares, averagePrice: totalCostBasis / totalShares };
    } else {
      updatedPortfolio[activeStock.symbol] = { shares: buySharesNum, averagePrice: activeStock.currentPrice };
    }

    const updatedData: UserData = {
      ...userData,
      balance: userData.balance - buyTotalCost,
      portfolio: updatedPortfolio,
      transactions: [...userData.transactions, transaction]
    };

    const newAchievements = checkAchievements(updatedData);
    setUserData(updatedData);
    saveUserData(updatedData);
    setShowBuyDialog(false);
    setShares('1');
    setDollarAmount('100');
    toast.success(`Bought ${+buySharesNum.toFixed(6)} shares of ${activeStock.symbol}!`);
    newAchievements.forEach(a => {
      const rewardText = (a.reward ?? 0) > 0 ? ` Claim your $${a.reward} reward in Achievements!` : '';
      setTimeout(() => toast.success(`🏆 Achievement Unlocked: ${a.title}!${rewardText}`), 500);
    });
  };

  const handleSell = () => {
    if (!canSell || sharesNum <= 0 || !holding) return;

    const transaction: Transaction = {
      id: Date.now().toString(),
      symbol: activeStock.symbol,
      type: 'sell',
      shares: sharesNum,
      price: activeStock.currentPrice,
      timestamp: Date.now()
    };

    const updatedPortfolio = { ...userData.portfolio };
    const remainingShares  = parseFloat((holding.shares - sharesNum).toFixed(10));
    if (remainingShares <= 0.000001) {
      delete updatedPortfolio[activeStock.symbol];
    } else {
      updatedPortfolio[activeStock.symbol] = { ...holding, shares: remainingShares };
    }

    const updatedData: UserData = {
      ...userData,
      balance: userData.balance + totalCost,
      portfolio: updatedPortfolio,
      transactions: [...userData.transactions, transaction]
    };

    const newAchievements = checkAchievements(updatedData);
    setUserData(updatedData);
    saveUserData(updatedData);
    setShowSellDialog(false);
    setShares('1');
    const profit = (activeStock.currentPrice - holding.averagePrice) * sharesNum;
    toast.success(`Sold ${+sharesNum.toFixed(6)} shares of ${activeStock.symbol}! ${profit >= 0 ? 'Profit' : 'Loss'}: $${Math.abs(profit).toFixed(2)}`);
    newAchievements.forEach(a => {
      const rewardText = (a.reward ?? 0) > 0 ? ` Claim your $${a.reward} reward in Achievements!` : '';
      setTimeout(() => toast.success(`🏆 Achievement Unlocked: ${a.title}!${rewardText}`), 500);
    });
  };

  const handleShort = () => {
    if (!canShort) return;
    const existing = userData.shorts?.[activeStock.symbol];
    let updatedShort: ShortPosition;
    if (existing) {
      const totalShares   = existing.shares + shortSharesNum;
      const avgBorrow     = (existing.borrowPrice * existing.shares + activeStock.currentPrice * shortSharesNum) / totalShares;
      updatedShort = { shares: totalShares, borrowPrice: avgBorrow, collateral: existing.collateral + shortCollateral, timestamp: existing.timestamp };
    } else {
      updatedShort = { shares: shortSharesNum, borrowPrice: activeStock.currentPrice, collateral: shortCollateral, timestamp: Date.now() };
    }
    const updatedData: UserData = {
      ...userData,
      balance: userData.balance - shortCollateral,
      shorts: { ...(userData.shorts ?? {}), [activeStock.symbol]: updatedShort }
    };
    setUserData(updatedData);
    saveUserData(updatedData);
    setShowShortDialog(false);
    setShortShares('1');
    toast.success(`Shorted ${shortSharesNum} shares of ${activeStock.symbol} @ $${activeStock.currentPrice.toFixed(2)}`);
  };

  const handleCover = () => {
    if (!canCover || !shortPosition) return;
    const collateralPerShare = shortPosition.collateral / shortPosition.shares;
    const releasedCollateral = collateralPerShare * shortSharesNum;
    const proceeds           = releasedCollateral + coverPnL;
    const updatedShorts      = { ...(userData.shorts ?? {}) };
    if (shortSharesNum === shortPosition.shares) {
      delete updatedShorts[activeStock.symbol];
    } else {
      updatedShorts[activeStock.symbol] = {
        ...shortPosition,
        shares: shortPosition.shares - shortSharesNum,
        collateral: shortPosition.collateral - releasedCollateral
      };
    }
    const updatedData: UserData = { ...userData, balance: userData.balance + proceeds, shorts: updatedShorts };
    setUserData(updatedData);
    saveUserData(updatedData);
    setShowCoverDialog(false);
    setShortShares('1');
    toast.success(`Covered ${shortSharesNum} shares · P&L: ${coverPnL >= 0 ? '+' : ''}$${coverPnL.toFixed(2)}`);
  };

  const handleBuyOption = () => {
    if (!canBuyOption) return;
    const contract: OptionContract = {
      id: Date.now().toString(),
      symbol: activeStock.symbol,
      type: optionType,
      strikePrice,
      premium: totalPremium,
      contracts: contractsNum,
      expiresAt: Date.now() + optionExpiry * 24 * 60 * 60 * 1000,
      status: 'open',
      purchasedAt: Date.now()
    };
    const updatedData: UserData = {
      ...userData,
      balance: userData.balance - totalPremium,
      options: [...(userData.options ?? []), contract]
    };
    setUserData(updatedData);
    saveUserData(updatedData);
    setShowOptionsDialog(false);
    setOptionContracts('1');
    toast.success(`Bought ${contractsNum} ${optionType} contract${contractsNum > 1 ? 's' : ''} on ${activeStock.symbol} · Strike $${strikePrice.toFixed(2)}`);
  };

  // Drag-to-zoom handlers — Recharts passes e.activeLabel (the time string at cursor)
  const handleChartMouseDown = (e: any) => {
    if (!e?.activeLabel) return;
    setIsSelecting(true);
    setSelectStart(e.activeLabel);
    setSelectEnd(e.activeLabel);
  };

  const handleChartMouseMove = (e: any) => {
    if (!isSelecting || !e?.activeLabel) return;
    setSelectEnd(e.activeLabel);
  };

  const handleChartMouseUp = () => {
    if (isSelecting && selectStart && selectEnd && selectStart !== selectEnd) {
      const startIdx = historicalData.findIndex(d => d.time === selectStart);
      const endIdx   = historicalData.findIndex(d => d.time === selectEnd);
      if (startIdx !== -1 && endIdx !== -1 && Math.abs(endIdx - startIdx) >= 2) {
        setZoomRange([Math.min(startIdx, endIdx), Math.max(startIdx, endIdx)]);
      }
    }
    setIsSelecting(false);
    setSelectStart(null);
    setSelectEnd(null);
  };

  const cancelSelection = () => {
    setIsSelecting(false);
    setSelectStart(null);
    setSelectEnd(null);
  };

  // Toggle helpers — clear chart loading and zoom when switching time range
  const handleTimeRange = (range: TimeRange) => {
    if (range === timeRange) return;
    setTimeRange(range);
    setChartLoading(true);
    setZoomRange(null);
  };

  const chartColor = isPositive ? '#10b981' : '#ef4444';

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="p-4 bg-white border-b sticky top-[73px] z-10">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{activeStock.symbol}</h1>
            <p className="text-gray-600">{activeStock.name}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">${activeStock.currentPrice.toFixed(2)}</p>
            <div className={`flex items-center gap-1 justify-end ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span className="font-medium">
                {isPositive ? '+' : ''}${windowChange.toFixed(2)} ({isPositive ? '+' : ''}{windowChangePct.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Chart */}
        <Card className="p-4">
          {/* Chart controls */}
          <div className="flex items-center justify-between mb-4">
            {/* Time range toggle */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
              {(['1D', '1M', '1YR', '10Y'] as TimeRange[]).map(r => (
                <button
                  key={r}
                  onClick={() => handleTimeRange(r)}
                  className={`px-3 py-1 font-medium transition-colors ${
                    timeRange === r ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Chart type toggle */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
              <button
                onClick={() => setChartType('area')}
                className={`px-3 py-1 font-medium transition-colors ${
                  chartType === 'area' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Area
              </button>
              <button
                onClick={() => setChartType('candlestick')}
                className={`px-3 py-1 font-medium transition-colors ${
                  chartType === 'candlestick' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Candles
              </button>
            </div>
          </div>

          {/* Zoom reset */}
          {zoomRange && (
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setZoomRange(null)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                ✕ Reset zoom
              </button>
            </div>
          )}

          {/* Chart body */}
          {chartLoading ? (
            <div className="h-[220px] bg-gray-100 rounded-lg animate-pulse" />
          ) : historicalData.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-gray-400">
              <p className="text-sm">Chart data unavailable</p>
            </div>
          ) : (
            <div
              style={{ userSelect: 'none', cursor: isSelecting ? 'crosshair' : 'default' }}
            >
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart
                data={displayData}
                margin={{ left: 0, right: 4 }}
                onMouseDown={handleChartMouseDown}
                onMouseMove={handleChartMouseMove}
                onMouseUp={handleChartMouseUp}
                onMouseLeave={cancelSelection}
              >
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={chartColor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                  </linearGradient>
                </defs>

                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 9 }}
                  interval="preserveStartEnd"
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9 }}
                  tickLine={false}
                  axisLine={false}
                  width={55}
                  tickFormatter={(v: number) => `$${v.toFixed(0)}`}
                  domain={chartType === 'candlestick' ? [domainMin, domainMax] : ['auto', 'auto']}
                />

                {chartType === 'area' ? (
                  <>
                    <Tooltip
                      contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: 12 }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
                    />
                    <Area
                      type="monotone"
                      dataKey="close"
                      stroke={chartColor}
                      strokeWidth={2}
                      fill="url(#areaGradient)"
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </>
                ) : (
                  <>
                    <Tooltip content={<CandlestickTooltip />} />
                    <Bar
                      dataKey="close"
                      shape={renderCandlestick}
                      isAnimationActive={false}
                    />
                  </>
                )}

                {/* Selection highlight while dragging */}
                {isSelecting && selectStart && selectEnd && selectStart !== selectEnd && (
                  <ReferenceArea
                    x1={selectStart}
                    x2={selectEnd}
                    fill="#2563eb"
                    fillOpacity={0.12}
                    stroke="#2563eb"
                    strokeOpacity={0.4}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
            </div>
          )}
        </Card>

        {/* About */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold">About</h3>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed">{activeStock.description}</p>
          <div className="mt-3 flex gap-2">
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{activeStock.sector}</span>
          </div>

          {/* Recent News */}
          <div className="mt-4 border-t pt-4">
            <h4 className="text-sm font-semibold text-gray-800 mb-3">Recent News</h4>
            {newsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="space-y-1 animate-pulse">
                    <div className="h-3 bg-gray-200 rounded w-1/4" />
                    <div className="h-4 bg-gray-200 rounded w-full" />
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                  </div>
                ))}
              </div>
            ) : news.length === 0 ? (
              <p className="text-xs text-gray-400">No recent news found.</p>
            ) : (
              <ul className="space-y-4">
                {news.map(article => (
                  <li key={article.id}>
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block"
                    >
                      <p className="text-xs text-gray-400 mb-0.5">
                        {article.source} · {new Date(article.datetime * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </p>
                      <p className="text-sm text-gray-800 group-hover:text-blue-600 leading-snug line-clamp-2">
                        {article.headline}
                      </p>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* Your Position */}
        {holding && (
          <Card className="p-4 bg-blue-50 border-blue-200">
            <h3 className="font-semibold mb-3">Your Position</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-600">Shares Owned</p>
                <p className="font-bold text-lg">{+holding.shares.toFixed(6)}</p>
              </div>
              <div>
                <p className="text-gray-600">Avg. Price</p>
                <p className="font-bold text-lg">${holding.averagePrice.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-600">Current Value</p>
                <p className="font-bold text-lg">${(holding.shares * activeStock.currentPrice).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-gray-600">Profit/Loss</p>
                <p className={`font-bold text-lg ${(activeStock.currentPrice - holding.averagePrice) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${((activeStock.currentPrice - holding.averagePrice) * holding.shares).toFixed(2)}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 sticky bottom-20 bg-gray-50 py-2">
          <Button size="lg" onClick={() => setShowBuyDialog(true)} className="bg-green-600 hover:bg-green-700">
            Buy
          </Button>
          <Button size="lg" variant="outline" onClick={() => setShowSellDialog(true)} disabled={!holding} className={!holding ? 'opacity-50' : ''}>
            Sell
          </Button>
          <Button
            size="lg"
            onClick={() => { setShortShares('1'); shortPosition ? setShowCoverDialog(true) : setShowShortDialog(true); }}
            className={shortPosition ? 'bg-orange-500 hover:bg-orange-600' : 'bg-red-600 hover:bg-red-700'}
          >
            {shortPosition ? `Cover (${shortPosition.shares})` : 'Short'}
          </Button>
          <Button size="lg" onClick={() => { setOptionContracts('1'); setShowOptionsDialog(true); }} className="bg-purple-600 hover:bg-purple-700">
            Options
          </Button>
        </div>
      </div>

      {/* Buy Dialog */}
      <Dialog open={showBuyDialog} onOpenChange={(open) => { setShowBuyDialog(open); if (!open) { setBuyMode('shares'); setShares('1'); setDollarAmount('100'); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Buy {activeStock.symbol}</DialogTitle>
            <DialogDescription>Current price: ${activeStock.currentPrice.toFixed(2)} per share</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Mode toggle */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
              <button
                onClick={() => setBuyMode('shares')}
                className={`flex-1 py-2 font-medium transition-colors ${buyMode === 'shares' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                # Shares
              </button>
              <button
                onClick={() => setBuyMode('dollars')}
                className={`flex-1 py-2 font-medium transition-colors ${buyMode === 'dollars' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                $ Amount
              </button>
            </div>

            {/* Input */}
            <div>
              {buyMode === 'shares' ? (
                <>
                  <label className="text-sm font-medium mb-2 block">Shares (fractional OK, e.g. 0.5)</label>
                  <Input type="number" min="0.001" step="0.001" value={shares} onChange={e => setShares(e.target.value)} placeholder="e.g. 0.5" />
                </>
              ) : (
                <>
                  <label className="text-sm font-medium mb-2 block">Dollar Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">$</span>
                    <Input type="number" min="0.01" step="0.01" value={dollarAmount} onChange={e => setDollarAmount(e.target.value)} placeholder="e.g. 100" className="pl-7" />
                  </div>
                </>
              )}
            </div>

            <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Shares:</span><span className="font-medium">{+buySharesNum.toFixed(6)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Price per share:</span><span className="font-medium">${activeStock.currentPrice.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-base border-t pt-2"><span>Total Cost:</span><span>${buyTotalCost.toFixed(2)}</span></div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Available balance:</span>
                <span className={canAfford ? 'text-green-600' : 'text-red-600'}>${userData.balance.toFixed(2)}</span>
              </div>
            </div>
            <Button onClick={handleBuy} disabled={!canAfford || buySharesNum <= 0} className="w-full bg-green-600 hover:bg-green-700">
              {!canAfford ? 'Insufficient Funds' : 'Confirm Purchase'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sell Dialog */}
      <Dialog open={showSellDialog} onOpenChange={setShowSellDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sell {activeStock.symbol}</DialogTitle>
            <DialogDescription>Current price: ${activeStock.currentPrice.toFixed(2)} per share</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Shares (fractional OK)</label>
              <Input type="number" min="0.001" step="0.001" max={holding?.shares || 0} value={shares} onChange={e => setShares(e.target.value)} placeholder="e.g. 0.5" />
              <p className="text-xs text-gray-500 mt-1">You own {+(holding?.shares || 0).toFixed(6)} shares</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Shares:</span><span className="font-medium">{+sharesNum.toFixed(6)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Price per share:</span><span className="font-medium">${activeStock.currentPrice.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-base border-t pt-2"><span>Total Value:</span><span>${totalCost.toFixed(2)}</span></div>
              {holding && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Profit/Loss:</span>
                  <span className={(activeStock.currentPrice - holding.averagePrice) * sharesNum >= 0 ? 'text-green-600' : 'text-red-600'}>
                    ${((activeStock.currentPrice - holding.averagePrice) * sharesNum).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
            <Button onClick={handleSell} disabled={!canSell || sharesNum <= 0} variant="outline" className="w-full">
              {!canSell ? 'Invalid Amount' : 'Confirm Sale'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Short Dialog */}
      <Dialog open={showShortDialog} onOpenChange={setShowShortDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Short {activeStock.symbol}</DialogTitle>
            <DialogDescription>Borrow and sell shares, profit when price drops</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Shares to Short</label>
              <Input type="number" min="1" value={shortShares} onChange={e => setShortShares(e.target.value)} placeholder="Enter shares" />
            </div>
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Borrow price:</span><span className="font-medium">${activeStock.currentPrice.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Shares:</span><span className="font-medium">{shortSharesNum}</span></div>
              <div className="flex justify-between font-bold text-base border-t border-red-200 pt-2">
                <span>Collateral required:</span><span>${shortCollateral.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Available balance:</span>
                <span className={canShort ? 'text-green-600' : 'text-red-600'}>${userData.balance.toFixed(2)}</span>
              </div>
              <p className="text-xs text-red-600 pt-1">⚠ Collateral is locked until you cover. Losses are unlimited if price rises.</p>
            </div>
            <Button onClick={handleShort} disabled={!canShort} className="w-full bg-red-600 hover:bg-red-700">
              {!canShort ? 'Insufficient Collateral' : `Short ${shortSharesNum} Share${shortSharesNum !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cover Dialog */}
      <Dialog open={showCoverDialog} onOpenChange={setShowCoverDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cover {activeStock.symbol}</DialogTitle>
            <DialogDescription>Buy back shares to close your short position</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {shortPosition && (
              <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg text-sm space-y-1">
                <div className="flex justify-between"><span className="text-gray-600">Shorted at:</span><span className="font-medium">${shortPosition.borrowPrice.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Open shares:</span><span className="font-medium">{shortPosition.shares}</span></div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-2 block">Shares to Cover</label>
              <Input type="number" min="1" max={shortPosition?.shares || 0} value={shortShares} onChange={e => setShortShares(e.target.value)} placeholder="Enter shares" />
            </div>
            <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Cover price:</span><span className="font-medium">${activeStock.currentPrice.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-base border-t pt-2">
                <span>Estimated P&L:</span>
                <span className={coverPnL >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {coverPnL >= 0 ? '+' : ''}${coverPnL.toFixed(2)}
                </span>
              </div>
            </div>
            <Button onClick={handleCover} disabled={!canCover} className="w-full bg-orange-500 hover:bg-orange-600">
              {!canCover ? 'Invalid Amount' : `Cover ${shortSharesNum} Share${shortSharesNum !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Options Dialog */}
      <Dialog open={showOptionsDialog} onOpenChange={setShowOptionsDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Options — {activeStock.symbol}</DialogTitle>
            <DialogDescription>Black-Scholes priced · σ={( Math.max(sigma, 0.05) * 100).toFixed(0)}%</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Call / Put toggle */}
            <div>
              <label className="text-sm font-medium mb-2 block">Type</label>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
                {(['call', 'put'] as const).map(t => (
                  <button key={t} onClick={() => setOptionType(t)}
                    className={`flex-1 py-2 font-medium capitalize transition-colors ${optionType === t ? (t === 'call' ? 'bg-green-600 text-white' : 'bg-red-600 text-white') : 'text-gray-600 hover:bg-gray-50'}`}>
                    {t === 'call' ? '▲ Call' : '▼ Put'}
                  </button>
                ))}
              </div>
            </div>

            {/* Strike price */}
            <div>
              <label className="text-sm font-medium mb-2 block">Strike Price</label>
              <div className="flex gap-1 flex-wrap">
                {([-10, -5, 0, 5, 10] as const).map(offset => (
                  <button key={offset} onClick={() => setStrikeOffset(offset)}
                    className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${strikeOffset === offset ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    ${(activeStock.currentPrice * (1 + offset / 100)).toFixed(2)}{offset === 0 ? ' (ATM)' : ` (${offset > 0 ? '+' : ''}${offset}%)`}
                  </button>
                ))}
              </div>
            </div>

            {/* Expiry */}
            <div>
              <label className="text-sm font-medium mb-2 block">Expiry</label>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
                {([7, 14, 30] as const).map(d => (
                  <button key={d} onClick={() => setOptionExpiry(d)}
                    className={`flex-1 py-2 font-medium transition-colors ${optionExpiry === d ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                    {d}d
                  </button>
                ))}
              </div>
            </div>

            {/* Contracts */}
            <div>
              <label className="text-sm font-medium mb-2 block">Contracts (1 contract = 1 share)</label>
              <Input type="number" min="1" value={optionContracts} onChange={e => setOptionContracts(e.target.value)} placeholder="Contracts" />
            </div>

            {/* Pricing summary */}
            <div className="bg-purple-50 border border-purple-200 p-3 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Strike:</span><span className="font-medium">${strikePrice.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Premium / share:</span><span className="font-medium">${premiumPerShare.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Delta:</span><span className="font-medium">{optionDelta.toFixed(3)}</span></div>
              <div className="flex justify-between font-bold text-base border-t border-purple-200 pt-2">
                <span>Total Premium:</span><span>${totalPremium.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Available balance:</span>
                <span className={canBuyOption ? 'text-green-600' : 'text-red-600'}>${userData.balance.toFixed(2)}</span>
              </div>
            </div>
            <Button onClick={handleBuyOption} disabled={!canBuyOption} className="w-full bg-purple-600 hover:bg-purple-700">
              {!canBuyOption ? 'Insufficient Funds' : `Buy ${contractsNum} ${optionType === 'call' ? '▲ Call' : '▼ Put'} Contract${contractsNum !== 1 ? 's' : ''}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
