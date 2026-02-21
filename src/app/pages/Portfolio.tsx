import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import { TrendingUp, TrendingDown, Plus, DollarSign, BarChart2, Award } from 'lucide-react';
import { getUserData, saveUserData } from '../utils/storage';
import { useStocks } from '../context/StocksContext';
import { fetchQuote } from '../utils/finnhubApi';
import { UserData, Stock, OptionContract } from '../types';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { toast } from 'sonner';
import { Tutorial } from '../components/Tutorial';
import { motion } from 'motion/react';

/* helper — safely call toFixed on anything that might be null/undefined */
const fmt = (n: number | null | undefined, decimals = 2): string =>
  (n ?? 0).toFixed(decimals);

/* ===========================================================
   Stock Ticker Bar — full-width, auto-scrolling marquee
=========================================================== */
function StockTickerBar({
  portfolioStocks,
  allStocks,
}: {
  portfolioStocks: any[];
  allStocks: Stock[];
}) {
  const portfolioSymbols = new Set(portfolioStocks.map((item) => item?.stock?.symbol));

  const displayStocks = [
    ...portfolioStocks,
    ...allStocks
      .filter((s) => !portfolioSymbols.has(s.symbol))
      .map((stock) => ({ stock })),
  ];

  const stocksWithChange = useMemo(
    () =>
      displayStocks
        .map((item) => {
          if (!item?.stock) return null;
          return {
            ...item,
            changePct: item.stock.changePercent ?? ((Math.random() - 0.48) * 4),
          };
        })
        .filter(Boolean),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allStocks.length]
  );

  const loopedStocks = [...stocksWithChange, ...stocksWithChange];
  const ITEM_WIDTH = 180;
  const totalWidth = stocksWithChange.length * ITEM_WIDTH;
  const duration = totalWidth / 45;

  return (
    <>
      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-${totalWidth}px); }
        }
        .ticker-track {
          animation: ticker-scroll ${duration}s linear infinite;
          will-change: transform;
        }
        .ticker-track:hover { animation-play-state: paused; }
      `}</style>

      <div className="w-full bg-white border-b border-gray-200 shadow-sm overflow-hidden">
        <div className="flex overflow-hidden">
          <div className="ticker-track flex">
            {loopedStocks.map((item, index) => {
              if (!item?.stock) return null;
              const stock = item.stock as Stock;
              const isOwned = portfolioSymbols.has(stock.symbol);
              const changePct = parseFloat(fmt((item as any).changePct ?? 0));
              const isUp = changePct >= 0;

              return (
                <Link
                  to={`/stock/${stock.symbol}`}
                  key={index}
                  className={`flex-shrink-0 flex flex-col justify-center px-6 py-4 border-r border-gray-100 hover:bg-gray-50 transition-colors ${
                    isOwned ? 'bg-green-50' : ''
                  }`}
                  style={{ minWidth: `${ITEM_WIDTH}px` }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold text-gray-900 whitespace-nowrap">
                      {stock.symbol}
                    </span>
                    {isOwned && (
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
                    )}
                  </div>
                  <span className="block text-sm text-gray-600 font-medium whitespace-nowrap">
                    ${fmt(stock.currentPrice)}
                  </span>
                  <span>
                    {isUp ? '▲' : '▼'} {Math.abs(changePct)}%
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

/* ===========================================================
   Portfolio Page
=========================================================== */
export function Portfolio() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserData | null>(null);
  const { stocks, isLoading } = useStocks();
  const [showTutorial, setShowTutorial] = useState(false);
  const [onDemandStocks, setOnDemandStocks] = useState<Record<string, Stock>>({});

  useEffect(() => {
    getUserData().then((data) => {
      setUserData(data);
      setShowTutorial(!data.tutorialCompleted);
    });
  }, []);

  // Fetch quotes for symbols not in the curated list
  useEffect(() => {
    if (!userData) return;
    const shortSymbols = Object.keys(userData.shorts ?? {});
    const optionSymbols = (userData.options ?? [])
      .filter((o) => o.status === 'open')
      .map((o) => o.symbol);
    const allSymbols = [
      ...new Set([...Object.keys(userData.portfolio), ...shortSymbols, ...optionSymbols]),
    ];
    const missingSymbols = allSymbols.filter((sym) => !stocks.find((s) => s.symbol === sym));
    if (missingSymbols.length === 0) return;

    Promise.allSettled(
      missingSymbols.map((sym) => fetchQuote(sym).then((quote) => ({ sym, quote })))
    ).then((results) => {
      const fetched: Record<string, Stock> = {};
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          const { sym, quote } = result.value;
          const price = quote.c > 0 ? quote.c : quote.pc;
          if (price === 0) return;
          fetched[sym] = {
            symbol: sym,
            name: sym,
            currentPrice: price,
            changeAmount: quote.d,
            changePercent: quote.dp,
            description: '',
            sector: 'Other',
            historicalData: [],
            assetType: 'Stock',
          };
        }
      });
      setOnDemandStocks(fetched);
    });
  }, [userData?.portfolio, userData?.shorts, userData?.options, stocks]);

  // Expire options past their expiry
  useEffect(() => {
    if (!userData) return;
    const now = Date.now();
    const expiredNow = (userData.options ?? []).filter(
      (o) => o.status === 'open' && o.expiresAt <= now
    );
    if (expiredNow.length === 0) return;
    const updatedOptions = userData.options.map((o) =>
      o.status === 'open' && o.expiresAt <= now ? { ...o, status: 'expired' as const } : o
    );
    const updatedData = { ...userData, options: updatedOptions };
    setUserData(updatedData);
    saveUserData(updatedData);
    expiredNow.forEach((o) =>
      toast(`Option expired: ${o.symbol} ${o.type.toUpperCase()} $${fmt(o.strikePrice)}`)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!userData)
    return (
      <div className="p-4 flex items-center justify-center min-h-48">
        <p className="text-gray-500">Loading...</p>
      </div>
    );

  const portfolioStocks = Object.entries(userData.portfolio)
    .map(([symbol, holding]) => {
      const stock = stocks.find((s) => s.symbol === symbol) ?? onDemandStocks[symbol];
      if (!stock) return null;
      const shares = holding.shares ?? 0;
      const averagePrice = holding.averagePrice ?? 0;
      const currentValue = shares * (stock.currentPrice ?? 0);
      const costBasis = shares * averagePrice;
      const profitLoss = currentValue - costBasis;
      const profitLossPercent = costBasis > 0 ? (profitLoss / costBasis) * 100 : 0;
      return { stock, holding: { ...holding, shares, averagePrice }, currentValue, profitLoss, profitLossPercent };
    })
    .filter(Boolean);

  const totalPortfolioValue = portfolioStocks.reduce((sum, item) => sum + (item?.currentValue || 0), 0);
  const totalPnL = portfolioStocks.reduce((sum, item) => sum + (item?.profitLoss || 0), 0);
  const totalCostBasis = portfolioStocks.reduce(
    (sum, item) => sum + ((item?.holding.shares ?? 0) * (item?.holding.averagePrice ?? 0)),
    0
  );
  const totalPnLPercent = totalCostBasis > 0 ? (totalPnL / totalCostBasis) * 100 : 0;
  const totalValue = (userData.balance ?? 0) + totalPortfolioValue;

  const bestPerformer =
    portfolioStocks.length > 0
      ? portfolioStocks.reduce((best, item) =>
          (item?.profitLossPercent ?? -Infinity) > (best?.profitLossPercent ?? -Infinity) ? item : best
        )
      : null;
  const worstPerformer =
    portfolioStocks.length > 1
      ? portfolioStocks.reduce((worst, item) =>
          (item?.profitLossPercent ?? Infinity) < (worst?.profitLossPercent ?? Infinity) ? item : worst
        )
      : null;

  const priceFor = (sym: string) =>
    (stocks.find((s) => s.symbol === sym) ?? onDemandStocks[sym])?.currentPrice ?? 0;

  const handleExerciseOption = (option: OptionContract) => {
    const currentPrice = priceFor(option.symbol);
    if (currentPrice === 0) return;
    const profit =
      option.type === 'call'
        ? (currentPrice - (option.strikePrice ?? 0)) * (option.contracts ?? 0)
        : ((option.strikePrice ?? 0) - currentPrice) * (option.contracts ?? 0);
    if (profit <= 0) { toast.error('Option is out of the money'); return; }
    const updatedOptions = userData.options.map((o) =>
      o.id === option.id ? { ...o, status: 'exercised' as const } : o
    );
    const updatedData: UserData = { ...userData, balance: (userData.balance ?? 0) + profit, options: updatedOptions };
    setUserData(updatedData);
    saveUserData(updatedData);
    toast.success(`Exercised ${option.symbol} ${option.type} · +$${fmt(profit)}`);
  };

  const handleCompleteTutorial = async () => {
    const updatedData = { ...userData, tutorialCompleted: true, currentTutorialStep: 6 };
    setUserData(updatedData);
    await saveUserData(updatedData);
    setShowTutorial(false);
  };

  const openOptions = (userData.options ?? []).filter((o) => o.status === 'open');
  const closedOptions = (userData.options ?? []).filter((o) => o.status !== 'open');
  const shortEntries = Object.entries(userData.shorts ?? {});

  return (
    <div className="w-full space-y-0">
      {showTutorial && (
        <div className="px-4 sm:px-6 lg:px-10 pt-4">
          <Tutorial
            currentStep={userData.currentTutorialStep}
            onComplete={handleCompleteTutorial}
            onSkip={handleCompleteTutorial}
          />
        </div>
      )}

      {/* Scrolling Ticker */}
      <StockTickerBar portfolioStocks={portfolioStocks} allStocks={stocks} />

      <div className="px-4 sm:px-6 lg:px-10 py-6 space-y-6">

        {/* Balance Card */}
        <Card className="w-full overflow-hidden bg-gradient-to-br from-green-800 to-white text-white rounded-2xl shadow-lg">
          <div className="p-6 sm:p-8 lg:p-10">
            <p className="text-green-100 text-sm mb-1">
              Total Balance{isLoading ? ' (loading prices...)' : ''}
            </p>
            <p className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              ${fmt(totalValue)}
            </p>
            <div className="flex gap-8 sm:gap-16 flex-wrap">
              <div>
                <p className="text-green-100 text-sm">Cash</p>
                <p className="font-bold text-xl sm:text-2xl">${fmt(userData.balance)}</p>
              </div>
              <div>
                <p className="text-green-100 text-sm">Stocks</p>
                <p className="font-bold text-xl sm:text-2xl">${fmt(totalPortfolioValue)}</p>
              </div>
              {portfolioStocks.length > 0 && (
                <div>
                  <p className="text-green-100 text-sm">Unrealized P&amp;L</p>
                  <p className={`font-bold text-xl sm:text-2xl ${totalPnL >= 0 ? 'text-green-200' : 'text-red-300'}`}>
                    {totalPnL >= 0 ? '+' : ''}${fmt(totalPnL)} ({totalPnL >= 0 ? '+' : ''}{fmt(totalPnLPercent)}%)
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Scrollable Stats Row */}
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {[
            { label: 'Buying Power', value: `$${fmt(userData.balance)}`, icon: <DollarSign className="w-4 h-4" /> },
            { label: 'Holdings', value: String(portfolioStocks.length), icon: <BarChart2 className="w-4 h-4" /> },
            ...(bestPerformer ? [{ label: 'Best', value: `+${fmt(bestPerformer!.profitLossPercent)}%`, sub: bestPerformer!.stock.symbol, icon: <Award className="w-4 h-4" /> }] : []),
            ...(worstPerformer ? [{ label: 'Worst', value: `${fmt(worstPerformer!.profitLossPercent)}%`, sub: worstPerformer!.stock.symbol, icon: <TrendingDown className="w-4 h-4" /> }] : []),
          ].map((item, i) => (
            <Card key={i} className="p-4 shrink-0 w-36">
              <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
                {item.icon}
                <span>{item.label}</span>
              </div>
              <p className="text-xl font-bold">{item.value}</p>
              {'sub' in item && <p className="text-xs text-gray-500">{item.sub}</p>}
            </Card>
          ))}
        </div>

        {/* Add Funds */}
        <Card className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-900">Need more funds?</p>
            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => navigate('/earn')}>
              <Plus className="w-4 h-4 mr-1" />
              Add Funds
            </Button>
          </div>
        </Card>

        {/* Holdings */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Your Holdings</h2>
            <Link to="/market">
              <Button variant="outline" size="sm">Browse Market</Button>
            </Link>
          </div>

          {portfolioStocks.length === 0 ? (
            <Card className="p-8 text-center">
              <TrendingUp className="w-12 h-12 mx-auto text-gray-300 mb-2" />
              <p className="text-gray-600 font-medium mb-1">No stocks yet</p>
              <p className="text-sm text-gray-500 mb-4">Start building your portfolio by buying your first stock!</p>
              <Link to="/market"><Button>Explore Market</Button></Link>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {portfolioStocks.map((item, index) => {
                if (!item) return null;
                const { stock, holding, currentValue, profitLoss, profitLossPercent } = item;
                const isProfit = profitLoss >= 0;
                return (
                  <motion.div
                    key={stock.symbol}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link to={`/stock/${stock.symbol}`}>
                      <Card className="p-5 hover:shadow-lg transition h-full">
                        <div className="flex justify-between items-start">
                          <div className="min-w-0 flex-1">
                            <div className="flex gap-2 items-baseline mb-1">
                              <span className="font-bold text-lg">{stock.symbol}</span>
                              <span className="text-sm text-gray-400">{+fmt(holding.shares, 6)} shares</span>
                            </div>
                            <p className="text-sm text-gray-500 truncate">{stock.name}</p>
                            <p className="text-xs text-gray-400 mt-1">Avg: ${fmt(holding.averagePrice)}</p>
                          </div>
                          <div className="text-right ml-4 flex-shrink-0">
                            <p className="font-bold text-lg">${fmt(currentValue)}</p>
                            <div className={`flex items-center gap-1 justify-end text-sm font-semibold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                              {isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                              <span>{isProfit ? '+' : ''}${fmt(profitLoss)}</span>
                            </div>
                            <p className={`text-xs ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                              {isProfit ? '+' : ''}{fmt(profitLossPercent)}%
                            </p>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Short Positions */}
        {shortEntries.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-3">Short Positions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {shortEntries.map(([sym, short]) => {
                const currentPrice = priceFor(sym);
                const borrowPrice = short.borrowPrice ?? 0;
                const shares = short.shares ?? 0;
                const pnl = (borrowPrice - currentPrice) * shares;
                const pnlPct = borrowPrice > 0 ? ((borrowPrice - currentPrice) / borrowPrice) * 100 : 0;
                const isProfit = pnl >= 0;
                return (
                  <motion.div key={sym} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Link to={`/stock/${sym}`}>
                      <Card className="p-4 border-orange-200 bg-orange-50 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-gray-900">{sym}</span>
                              <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">SHORT</span>
                              <span className="text-xs text-gray-500">{shares} shares</span>
                            </div>
                            <p className="text-xs text-gray-500">
                              Borrowed @ ${fmt(borrowPrice)} · Current ${currentPrice > 0 ? fmt(currentPrice) : '—'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                              {isProfit ? '+' : ''}${fmt(pnl)}
                            </p>
                            <p className={`text-xs ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                              {isProfit ? '+' : ''}{fmt(pnlPct)}%
                            </p>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Open Options */}
        {openOptions.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-3">Open Options</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {openOptions.map((option) => {
                const currentPrice = priceFor(option.symbol);
                const strikePrice = option.strikePrice ?? 0;
                const contracts = option.contracts ?? 0;
                const premium = option.premium ?? 0;
                const intrinsic =
                  option.type === 'call'
                    ? Math.max(0, currentPrice - strikePrice) * contracts
                    : Math.max(0, strikePrice - currentPrice) * contracts;
                const isITM =
                  option.type === 'call' ? currentPrice > strikePrice : currentPrice < strikePrice;
                const daysLeft = Math.max(0, Math.ceil(((option.expiresAt ?? 0) - Date.now()) / 86400000));
                const pnl = intrinsic - premium;
                return (
                  <motion.div key={option.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="p-4 border-purple-200 bg-purple-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-bold text-gray-900">{option.symbol}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${option.type === 'call' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {option.type === 'call' ? '▲ CALL' : '▼ PUT'}
                            </span>
                            {isITM && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">ITM</span>}
                          </div>
                          <p className="text-xs text-gray-600">
                            Strike ${fmt(strikePrice)} · {contracts} contract{contracts !== 1 ? 's' : ''}
                          </p>
                          <p className="text-xs text-gray-500">Paid ${fmt(premium)} · Expires {daysLeft}d</p>
                          <p className={`text-xs font-medium mt-1 ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            P&amp;L: {pnl >= 0 ? '+' : ''}${fmt(pnl)}
                          </p>
                        </div>
                        {isITM && currentPrice > 0 && (
                          <Button
                            size="sm"
                            className="bg-purple-600 hover:bg-purple-700 text-xs ml-2 shrink-0"
                            onClick={() => handleExerciseOption(option)}
                          >
                            Exercise
                          </Button>
                        )}
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Options History */}
        {closedOptions.length > 0 && (
          <div className="pb-6">
            <h2 className="text-lg font-semibold mb-3 text-gray-400">Options History</h2>
            <div className="space-y-2">
              {closedOptions.slice(-5).reverse().map((option) => (
                <Card key={option.id} className="p-3 border-gray-100 bg-gray-50">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">
                      {option.symbol} {option.type.toUpperCase()} ${fmt(option.strikePrice)}
                    </span>
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${option.status === 'exercised' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                      {option.status}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}