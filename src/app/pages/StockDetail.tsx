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
} from 'recharts';
import { useStocks } from '../context/StocksContext';
import { fetchQuote, fetchCandles, fetchIntradayCandles, candlesToOhlcData, OhlcPoint } from '../utils/finnhubApi';
import { getUserData, saveUserData } from '../utils/storage';
import { Stock, UserData, Transaction, Achievement } from '../types';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { toast } from 'sonner';

type TimeRange = '1D' | '1M';
type ChartType = 'area' | 'candlestick';

// Module-level cache keyed by `${symbol}_${timeRange}`
const candleCache = new Map<string, OhlcPoint[]>();

function generateFallbackDaily(basePrice: number): OhlcPoint[] {
  const data: OhlcPoint[] = [];
  let price = basePrice * 0.95;
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const open = parseFloat(price.toFixed(2));
    const change = (Math.random() - 0.48) * 0.03;
    const close = Math.max(open * (1 + change), 0.01);
    const high = Math.max(open, close) * (1 + Math.random() * 0.005);
    const low  = Math.min(open, close) * (1 - Math.random() * 0.005);
    data.push({
      time: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
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
  const [historicalData, setHistoricalData] = useState<OhlcPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');
  const [chartType, setChartType] = useState<ChartType>('area');

  // On-demand fetch for symbols outside the curated list
  const [onDemandStock, setOnDemandStock] = useState<Stock | null>(null);
  const [stockLoading, setStockLoading] = useState(false);

  const stock = getStock(symbol ?? '');
  const activeStock = stock ?? onDemandStock;
  const holding = activeStock ? userData.portfolio[activeStock.symbol] : undefined;

  // Fetch quote on-demand when symbol isn't in the curated list
  useEffect(() => {
    if (stock || !symbol) return;
    setStockLoading(true);
    setOnDemandStock(null);
    const passedName = (location.state as { name?: string } | null)?.name ?? symbol;
    fetchQuote(symbol)
      .then(quote => {
        if (quote.c === 0) return; // symbol not found / market closed with no data
        setOnDemandStock({
          symbol,
          name: passedName,
          currentPrice: quote.c,
          changeAmount: quote.d,
          changePercent: quote.dp,
          description: '',
          sector: 'Other',
          historicalData: [],
        });
      })
      .catch(() => {})
      .finally(() => setStockLoading(false));
  }, [symbol, stock, location.state]);

  // Keep a ref to the latest stock so the candle effect can read the
  // current price at fallback time without re-triggering on every tick.
  const stockRef = useRef(activeStock);
  useEffect(() => { stockRef.current = activeStock; });

  // Derived y-axis domain covering all OHLC values for candlestick chart
  const [domainMin, domainMax] = useMemo(() => {
    if (historicalData.length === 0) return [0, 1];
    const prices = historicalData.flatMap(d => [d.open, d.high, d.low, d.close]);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const pad = (max - min) * 0.05;
    return [min - pad, max + pad];
  }, [historicalData]);

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

    const applyFallback = () => {
      if (cancelled) return;
      const basePrice = stockRef.current?.currentPrice ?? 100;
      const fallback = timeRange === '1D'
        ? generateFallbackIntraday(basePrice)
        : generateFallbackDaily(basePrice);
      candleCache.set(cacheKey, fallback);
      setHistoricalData(fallback);
    };

    const fetchFn = timeRange === '1D' ? fetchIntradayCandles : fetchCandles;

    fetchFn(symbol)
      .then(candles => {
        if (cancelled) return;
        const data = candlesToOhlcData(candles, timeRange === '1D');
        if (data.length > 0) {
          candleCache.set(cacheKey, data);
          setHistoricalData(data);
        } else {
          applyFallback();
        }
      })
      .catch(() => applyFallback())
      .finally(() => { if (!cancelled) setChartLoading(false); });

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
        ) : (
          <p className="text-center text-gray-500 mt-8">Stock not found</p>
        )}
      </div>
    );
  }

  const isPositive  = activeStock.changePercent >= 0;
  const sharesNum   = parseInt(shares) || 0;
  const totalCost   = sharesNum * activeStock.currentPrice;
  const canAfford   = totalCost <= userData.balance;
  const canSell     = holding && sharesNum <= holding.shares;

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
    if (!canAfford || sharesNum <= 0) return;

    const transaction: Transaction = {
      id: Date.now().toString(),
      symbol: activeStock.symbol,
      type: 'buy',
      shares: sharesNum,
      price: activeStock.currentPrice,
      timestamp: Date.now()
    };

    const updatedPortfolio = { ...userData.portfolio };
    if (updatedPortfolio[activeStock.symbol]) {
      const existing = updatedPortfolio[activeStock.symbol];
      const totalShares    = existing.shares + sharesNum;
      const totalCostBasis = (existing.shares * existing.averagePrice) + (sharesNum * activeStock.currentPrice);
      updatedPortfolio[activeStock.symbol] = { shares: totalShares, averagePrice: totalCostBasis / totalShares };
    } else {
      updatedPortfolio[activeStock.symbol] = { shares: sharesNum, averagePrice: activeStock.currentPrice };
    }

    const updatedData: UserData = {
      ...userData,
      balance: userData.balance - totalCost,
      portfolio: updatedPortfolio,
      transactions: [...userData.transactions, transaction]
    };

    const newAchievements = checkAchievements(updatedData);
    setUserData(updatedData);
    saveUserData(updatedData);
    setShowBuyDialog(false);
    setShares('1');
    toast.success(`Bought ${sharesNum} shares of ${activeStock.symbol}!`);
    newAchievements.forEach(a => {
      setTimeout(() => toast.success(`🏆 Achievement Unlocked: ${a.title}!`), 500);
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
    const remainingShares  = holding.shares - sharesNum;
    if (remainingShares === 0) {
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
    toast.success(`Sold ${sharesNum} shares of ${activeStock.symbol}! ${profit >= 0 ? 'Profit' : 'Loss'}: $${Math.abs(profit).toFixed(2)}`);
    newAchievements.forEach(a => {
      setTimeout(() => toast.success(`🏆 Achievement Unlocked: ${a.title}!`), 500);
    });
  };

  // Toggle helpers — clear chart loading when switching time range
  const handleTimeRange = (range: TimeRange) => {
    if (range === timeRange) return;
    setTimeRange(range);
    setChartLoading(true);
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
                {isPositive ? '+' : ''}${activeStock.changeAmount.toFixed(2)} ({isPositive ? '+' : ''}{activeStock.changePercent.toFixed(2)}%)
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
              {(['1D', '1M'] as TimeRange[]).map(r => (
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

          {/* Chart body */}
          {chartLoading ? (
            <div className="h-[220px] bg-gray-100 rounded-lg animate-pulse" />
          ) : historicalData.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-gray-400">
              <p className="text-sm">Chart data unavailable</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={historicalData} margin={{ left: 0, right: 4 }}>
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
              </ComposedChart>
            </ResponsiveContainer>
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
        </Card>

        {/* Your Position */}
        {holding && (
          <Card className="p-4 bg-blue-50 border-blue-200">
            <h3 className="font-semibold mb-3">Your Position</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-600">Shares Owned</p>
                <p className="font-bold text-lg">{holding.shares}</p>
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
          <Button
            size="lg"
            variant="outline"
            onClick={() => setShowSellDialog(true)}
            disabled={!holding}
            className={!holding ? 'opacity-50' : ''}
          >
            Sell
          </Button>
        </div>
      </div>

      {/* Buy Dialog */}
      <Dialog open={showBuyDialog} onOpenChange={setShowBuyDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Buy {activeStock.symbol}</DialogTitle>
            <DialogDescription>Current price: ${activeStock.currentPrice.toFixed(2)} per share</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Number of Shares</label>
              <Input type="number" min="1" value={shares} onChange={e => setShares(e.target.value)} placeholder="Enter shares" />
            </div>
            <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Shares:</span><span className="font-medium">{sharesNum}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Price per share:</span><span className="font-medium">${activeStock.currentPrice.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-base border-t pt-2"><span>Total Cost:</span><span>${totalCost.toFixed(2)}</span></div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Available balance:</span>
                <span className={canAfford ? 'text-green-600' : 'text-red-600'}>${userData.balance.toFixed(2)}</span>
              </div>
            </div>
            <Button onClick={handleBuy} disabled={!canAfford || sharesNum <= 0} className="w-full bg-green-600 hover:bg-green-700">
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
              <label className="text-sm font-medium mb-2 block">Number of Shares</label>
              <Input type="number" min="1" max={holding?.shares || 0} value={shares} onChange={e => setShares(e.target.value)} placeholder="Enter shares" />
              <p className="text-xs text-gray-500 mt-1">You own {holding?.shares || 0} shares</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Shares:</span><span className="font-medium">{sharesNum}</span></div>
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
    </div>
  );
}
