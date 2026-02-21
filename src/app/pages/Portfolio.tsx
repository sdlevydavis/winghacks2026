import { useState, useEffect } from 'react';
import { Link } from 'react-router';
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
import { useNavigate } from 'react-router';

export function Portfolio() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserData>(getUserData());
  const { stocks, isLoading } = useStocks();
  const [showTutorial, setShowTutorial] = useState(!userData.tutorialCompleted);
  const [onDemandStocks, setOnDemandStocks] = useState<Record<string, Stock>>({});

  // Fetch quotes for any symbol that appears in portfolio/shorts/options but not in curated list
  useEffect(() => {
    const shortSymbols  = Object.keys(userData.shorts ?? {});
    const optionSymbols = (userData.options ?? []).filter(o => o.status === 'open').map(o => o.symbol);
    const allSymbols    = [...new Set([...Object.keys(userData.portfolio), ...shortSymbols, ...optionSymbols])];
    const missingSymbols = allSymbols.filter(sym => !stocks.find(s => s.symbol === sym));
    if (missingSymbols.length === 0) return;

    Promise.allSettled(
      missingSymbols.map(sym => fetchQuote(sym).then(quote => ({ sym, quote })))
    ).then(results => {
      const fetched: Record<string, Stock> = {};
      results.forEach(result => {
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
          };
        }
      });
      setOnDemandStocks(fetched);
    });
  }, [userData.portfolio, userData.shorts, userData.options, stocks]);

  // Expire options that have passed their expiry timestamp
  useEffect(() => {
    const now = Date.now();
    const expiredNow = (userData.options ?? []).filter(o => o.status === 'open' && o.expiresAt <= now);
    if (expiredNow.length === 0) return;
    const updatedOptions = userData.options.map(o =>
      o.status === 'open' && o.expiresAt <= now ? { ...o, status: 'expired' as const } : o
    );
    const updatedData = { ...userData, options: updatedOptions };
    setUserData(updatedData);
    saveUserData(updatedData);
    expiredNow.forEach(o =>
      toast(`Option expired: ${o.symbol} ${o.type.toUpperCase()} $${o.strikePrice.toFixed(2)}`)
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const portfolioStocks = Object.entries(userData.portfolio).map(([symbol, holding]) => {
    const stock = stocks.find(s => s.symbol === symbol) ?? onDemandStocks[symbol];
    if (!stock) return null;

    const currentValue = holding.shares * stock.currentPrice;
    const costBasis = holding.shares * holding.averagePrice;
    const profitLoss = currentValue - costBasis;
    const profitLossPercent = ((profitLoss / costBasis) * 100);

    return {
      stock,
      holding,
      currentValue,
      profitLoss,
      profitLossPercent
    };
  }).filter(Boolean);

  const totalPortfolioValue = portfolioStocks.reduce((sum, item) => sum + (item?.currentValue || 0), 0);
  const totalValue = userData.balance + totalPortfolioValue;

  const totalPnL = portfolioStocks.reduce((sum, item) => sum + (item?.profitLoss || 0), 0);
  const totalCostBasis = portfolioStocks.reduce((sum, item) =>
    sum + ((item?.holding.shares ?? 0) * (item?.holding.averagePrice ?? 0)), 0);
  const totalPnLPercent = totalCostBasis > 0 ? (totalPnL / totalCostBasis) * 100 : 0;

  const bestPerformer = portfolioStocks.length > 0
    ? portfolioStocks.reduce((best, item) =>
        (item?.profitLossPercent ?? -Infinity) > (best?.profitLossPercent ?? -Infinity) ? item : best)
    : null;
  const worstPerformer = portfolioStocks.length > 1
    ? portfolioStocks.reduce((worst, item) =>
        (item?.profitLossPercent ?? Infinity) < (worst?.profitLossPercent ?? Infinity) ? item : worst)
    : null;

  // Helper: current price for any symbol
  const priceFor = (sym: string) =>
    (stocks.find(s => s.symbol === sym) ?? onDemandStocks[sym])?.currentPrice ?? 0;

  const handleExerciseOption = (option: OptionContract) => {
    const currentPrice = priceFor(option.symbol);
    if (currentPrice === 0) return;
    const profit = option.type === 'call'
      ? (currentPrice - option.strikePrice) * option.contracts
      : (option.strikePrice - currentPrice) * option.contracts;
    if (profit <= 0) { toast.error('Option is out of the money'); return; }
    const updatedOptions = userData.options.map(o =>
      o.id === option.id ? { ...o, status: 'exercised' as const } : o
    );
    const updatedData = { ...userData, balance: userData.balance + profit, options: updatedOptions };
    setUserData(updatedData);
    saveUserData(updatedData);
    toast.success(`Exercised ${option.symbol} ${option.type} · +$${profit.toFixed(2)}`);
  };

  const openOptions  = (userData.options ?? []).filter(o => o.status === 'open');
  const closedOptions = (userData.options ?? []).filter(o => o.status !== 'open');
  const shortEntries = Object.entries(userData.shorts ?? {});

  const handleCompleteTutorial = () => {
    const updatedData = {
      ...userData,
      tutorialCompleted: true,
      currentTutorialStep: 6
    };
    setUserData(updatedData);
    saveUserData(updatedData);
    setShowTutorial(false);
  };

  const handleSkipTutorial = () => {
    handleCompleteTutorial();
  };

  return (
    <div className="p-4 space-y-4">
      {showTutorial && (
        <Tutorial
          currentStep={userData.currentTutorialStep}
          onComplete={handleCompleteTutorial}
          onSkip={handleSkipTutorial}
        />
      )}

      {/* Balance Card */}
      <Card className="p-6 bg-gradient-to-br from-blue-600 to-blue-700 text-white">
        <div className="space-y-2">
          <p className="text-blue-100 text-sm">
            Total Balance{isLoading ? ' (loading prices...)' : ''}
          </p>
          <p className="text-4xl font-bold">${totalValue.toFixed(2)}</p>
          <div className="flex gap-4 text-sm">
            <div>
              <p className="text-blue-100">Cash</p>
              <p className="font-semibold">${userData.balance.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-blue-100">Stocks</p>
              <p className="font-semibold">${totalPortfolioValue.toFixed(2)}</p>
            </div>
            {portfolioStocks.length > 0 && (
              <div>
                <p className="text-blue-100">Unrealized P&L</p>
                <p className={`font-semibold ${totalPnL >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                  {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)} ({totalPnL >= 0 ? '+' : ''}{totalPnLPercent.toFixed(2)}%)
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
            <DollarSign className="w-4 h-4" />
            <span>Buying Power</span>
          </div>
          <p className="text-xl font-bold">${userData.balance.toFixed(2)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
            <BarChart2 className="w-4 h-4" />
            <span>Holdings</span>
          </div>
          <p className="text-xl font-bold">{portfolioStocks.length}</p>
        </Card>
        {bestPerformer && (
          <Card className="p-4">
            <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
              <Award className="w-4 h-4" />
              <span>Best Performer</span>
            </div>
            <p className="text-lg font-bold">{bestPerformer.stock.symbol}</p>
            <p className="text-sm font-medium text-green-600">
              +{bestPerformer.profitLossPercent.toFixed(2)}%
            </p>
          </Card>
        )}
        {worstPerformer && (
          <Card className="p-4">
            <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
              <TrendingDown className="w-4 h-4" />
              <span>Worst Performer</span>
            </div>
            <p className="text-lg font-bold">{worstPerformer.stock.symbol}</p>
            <p className="text-sm font-medium text-red-600">
              {worstPerformer.profitLossPercent.toFixed(2)}%
            </p>
          </Card>
        )}
      </div>

      {/* Add Funds Button */}
      <Card className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900">Need more funds?</p>
          </div>
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700"
            onClick={() => navigate("/earn")}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Funds
          </Button>
        </div>
      </Card>

      {/* Portfolio Holdings */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Your Holdings</h2>
          <Link to="/market">
            <Button variant="outline" size="sm">
              Browse Market
            </Button>
          </Link>
        </div>

        {portfolioStocks.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-gray-400 mb-2">
              <TrendingUp className="w-12 h-12 mx-auto" />
            </div>
            <p className="text-gray-600 font-medium mb-1">No stocks yet</p>
            <p className="text-sm text-gray-500 mb-4">
              Start building your portfolio by buying your first stock!
            </p>
            <Link to="/market">
              <Button>Explore Market</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {portfolioStocks.map((item, index) => {
              if (!item) return null;
              const { stock, holding, currentValue, profitLoss, profitLossPercent } = item;
              const isProfit = profitLoss >= 0;

              return (
                <motion.div
                  key={stock.symbol}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link to={`/stock/${stock.symbol}`}>
                    <Card className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-gray-900">{stock.symbol}</span>
                            <span className="text-xs text-gray-500">{+holding.shares.toFixed(6)} shares</span>
                          </div>
                          <p className="text-sm text-gray-600">{stock.name}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Avg: ${holding.averagePrice.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">
                            ${currentValue.toFixed(2)}
                          </p>
                          <div className={`flex items-center gap-1 text-sm ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                            {isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            <span>
                              {isProfit ? '+' : ''}${profitLoss.toFixed(2)}
                            </span>
                          </div>
                          <p className={`text-xs ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                            {isProfit ? '+' : ''}{profitLossPercent.toFixed(2)}%
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
          <h2 className="text-lg font-semibold mb-3">Short Positions</h2>
          <div className="space-y-3">
            {shortEntries.map(([sym, short]) => {
              const currentPrice = priceFor(sym);
              const pnl = (short.borrowPrice - currentPrice) * short.shares;
              const pnlPct = short.borrowPrice > 0 ? ((short.borrowPrice - currentPrice) / short.borrowPrice) * 100 : 0;
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
                            <span className="text-xs text-gray-500">{short.shares} shares</span>
                          </div>
                          <p className="text-xs text-gray-500">Borrowed @ ${short.borrowPrice.toFixed(2)} · Current ${currentPrice > 0 ? currentPrice.toFixed(2) : '—'}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                            {isProfit ? '+' : ''}${pnl.toFixed(2)}
                          </p>
                          <p className={`text-xs ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                            {isProfit ? '+' : ''}{pnlPct.toFixed(2)}%
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
          <h2 className="text-lg font-semibold mb-3">Open Options</h2>
          <div className="space-y-3">
            {openOptions.map(option => {
              const currentPrice = priceFor(option.symbol);
              const intrinsic = option.type === 'call'
                ? Math.max(0, currentPrice - option.strikePrice) * option.contracts
                : Math.max(0, option.strikePrice - currentPrice) * option.contracts;
              const isITM   = option.type === 'call' ? currentPrice > option.strikePrice : currentPrice < option.strikePrice;
              const daysLeft = Math.max(0, Math.ceil((option.expiresAt - Date.now()) / 86400000));
              const pnl      = intrinsic - option.premium;
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
                        <p className="text-xs text-gray-600">Strike ${option.strikePrice.toFixed(2)} · {option.contracts} contract{option.contracts !== 1 ? 's' : ''}</p>
                        <p className="text-xs text-gray-500">Paid ${option.premium.toFixed(2)} · Expires {daysLeft}d</p>
                        <p className={`text-xs font-medium mt-1 ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          P&L: {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                        </p>
                      </div>
                      {isITM && currentPrice > 0 && (
                        <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-xs ml-2 shrink-0"
                          onClick={() => handleExerciseOption(option)}>
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

      {/* Closed / Expired Options history */}
      {closedOptions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 text-gray-400">Options History</h2>
          <div className="space-y-2">
            {closedOptions.slice(-5).reverse().map(option => (
              <Card key={option.id} className="p-3 border-gray-100 bg-gray-50">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">{option.symbol} {option.type.toUpperCase()} ${option.strikePrice.toFixed(2)}</span>
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
  );
}
