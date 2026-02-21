import { useState, useMemo } from "react";
import { Link } from "react-router";
import { TrendingUp, TrendingDown } from "lucide-react";

<<<<<<< HEAD
export function Portfolio() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [stocks] = useState<Stock[]>(getMockStocks());
  const [loading, setLoading] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    getUserData().then(data => {
      setUserData(data);
      setShowTutorial(!data.tutorialCompleted);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="p-4 flex items-center justify-center min-h-48">
      <p className="text-gray-500">Loading...</p>
    </div>
  );

  if (!userData) return (
    <div className="p-4 text-center text-red-500">
      Failed to load data. Please refresh.
    </div>
  );

  const portfolioStocks = Object.entries(userData.portfolio).map(([symbol, holding]) => {
    const stock = stocks.find(s => s.symbol === symbol);
    if (!stock) return null;
    const currentValue = holding.shares * stock.currentPrice;
    const costBasis = holding.shares * holding.averagePrice;
    const profitLoss = currentValue - costBasis;
    const profitLossPercent = ((profitLoss / costBasis) * 100);
    return { stock, holding, currentValue, profitLoss, profitLossPercent };
  }).filter(Boolean);
=======
import { motion } from "motion/react";

import { getUserData, saveUserData } from "../utils/storage";
import { getMockStocks } from "../utils/mockStocks";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Tutorial } from "../components/Tutorial";
>>>>>>> main

/* ===========================================================
   Stock Ticker Bar — full-width, auto-scrolling marquee
=========================================================== */
function StockTickerBar({ portfolioStocks, allStocks }) {
  const portfolioSymbols = new Set(
    portfolioStocks.map((item) => item?.stock?.symbol)
  );

<<<<<<< HEAD
  const handleCompleteTutorial = async () => {
    const updatedData = { ...userData, tutorialCompleted: true, currentTutorialStep: 6 };
    setUserData(updatedData);
    await saveUserData(updatedData);
    setShowTutorial(false);
  };

  return (
    <div className="p-4 space-y-4">
      {showTutorial && (
        <Tutorial
          currentStep={userData.currentTutorialStep}
          onComplete={handleCompleteTutorial}
          onSkip={handleCompleteTutorial}
        />
      )}

      {/* Balance Card */}
      <Card className="p-6 bg-gradient-to-br from-blue-600 to-blue-700 text-white">
        <div className="space-y-2">
          <p className="text-blue-100 text-sm">Total Balance</p>
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
            <TrendingUp className="w-4 h-4" />
            <span>Holdings</span>
          </div>
          <p className="text-xl font-bold">{portfolioStocks.length}</p>
        </Card>
      </div>

      {/* Add Funds */}
      <Card className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900">Need more funds?</p>
            <p className="text-sm text-gray-600">
              Get $100 for $0.99 · {2 - userData.fundsAdded} use{2 - userData.fundsAdded !== 1 ? 's' : ''} remaining
            </p>
          </div>
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700"
            disabled={userData.fundsAdded >= 2}
            onClick={async () => {
              const updatedData = {
                ...userData,
                balance: userData.balance + 100,
                fundsAdded: userData.fundsAdded + 1
              };
              setUserData(updatedData);
              await saveUserData(updatedData);
            }}
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
            <Button variant="outline" size="sm">Browse Market</Button>
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
=======
  const extraStocks = allStocks
    .filter((s) => !portfolioSymbols.has(s.symbol))
    .map((stock) => ({ stock }));

  const displayStocks = [...portfolioStocks, ...extraStocks];

  const stocksWithChange = useMemo(
    () =>
      displayStocks
        .map((item) => {
          if (!item?.stock) return null;
          const changePct = ((Math.random() - 0.48) * 4).toFixed(2);
          return { ...item, changePct };
        })
        .filter(Boolean),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allStocks.length, portfolioStocks.length]
  );

  const loopedStocks = [...stocksWithChange, ...stocksWithChange];

  const ITEM_WIDTH = 180;
  const totalWidth = stocksWithChange.length * ITEM_WIDTH;
  const SPEED = 45;
  const duration = totalWidth / SPEED;

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
        .ticker-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="w-full bg-white border-b border-gray-200 shadow-sm overflow-hidden">
        <div className="flex overflow-hidden">
          <div className="ticker-track flex">
            {loopedStocks.map((item, index) => {
              if (!item?.stock) return null;
              const stock = item.stock;
              const isOwned = portfolioSymbols.has(stock.symbol);
              const changePct = (item as any).changePct;
              const isUp = parseFloat(changePct) >= 0;

>>>>>>> main
              return (
                <Link
                  to={`/stock/${stock.symbol}`}
                  key={index}
                  className={`flex-shrink-0 flex flex-col justify-center px-6 py-4 border-r border-gray-100 hover:bg-gray-50 transition-colors ${
                    isOwned ? "bg-green-50" : ""
                  }`}
                  style={{ minWidth: `${ITEM_WIDTH}px` }}
                >
<<<<<<< HEAD
                  <Link to={`/stock/${stock.symbol}`}>
                    <Card className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-gray-900">{stock.symbol}</span>
                            <span className="text-xs text-gray-500">{holding.shares} shares</span>
                          </div>
                          <p className="text-sm text-gray-600">{stock.name}</p>
                          <p className="text-xs text-gray-500 mt-1">Avg: ${holding.averagePrice.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">${currentValue.toFixed(2)}</p>
                          <div className={`flex items-center gap-1 text-sm ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                            {isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            <span>{isProfit ? '+' : ''}${profitLoss.toFixed(2)}</span>
                          </div>
                          <p className={`text-xs ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                            {isProfit ? '+' : ''}{profitLossPercent.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
=======
                  <div className="flex items-center gap-2">
                    <span className="text-base font-extrabold text-gray-900 whitespace-nowrap">
                      {stock.symbol}
                    </span>
                    {isOwned && (
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
                    )}
                  </div>
                  <span className="block text-sm text-gray-600 font-medium whitespace-nowrap">
                    ${stock.currentPrice.toFixed(2)}
                  </span>
                  <span
                    className={`block text-sm font-bold whitespace-nowrap ${
                      isUp ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {isUp ? "▲" : "▼"} {Math.abs(parseFloat(changePct))}%
                  </span>
                </Link>
>>>>>>> main
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
  const [userData, setUserData] = useState(getUserData());
  const [stocks] = useState(getMockStocks());

  const [showTutorial, setShowTutorial] = useState(
    !userData?.tutorialCompleted
  );

  const portfolioStocks = useMemo(() => {
    if (!userData?.portfolio) return [];

    return Object.entries(userData.portfolio)
      .map(([symbol, holding]: any) => {
        const stock = stocks.find((s) => s.symbol === symbol);
        if (!stock || !holding) return null;

        const currentValue = holding.shares * stock.currentPrice;
        const costBasis = holding.shares * holding.averagePrice;
        const profitLoss = currentValue - costBasis;
        const profitLossPercent =
          costBasis === 0 ? 0 : (profitLoss / costBasis) * 100;

        return { stock, holding, currentValue, profitLoss, profitLossPercent };
      })
      .filter(Boolean);
  }, [userData, stocks]);

  const totalPortfolioValue = portfolioStocks.reduce(
    (sum, item) => sum + (item?.currentValue || 0),
    0
  );
  const totalProfitLoss = portfolioStocks.reduce(
    (sum, item) => sum + (item?.profitLoss || 0),
    0
  );
  const totalValue = (userData?.balance || 0) + totalPortfolioValue;

  const handleCompleteTutorial = () => {
    const updated = {
      ...userData,
      tutorialCompleted: true,
      currentTutorialStep: 6,
    };
    setUserData(updated);
    saveUserData(updated);
    setShowTutorial(false);
  };

  return (
    /* w-full + no max-width = fills whatever the Layout gives it */
    <div className="w-full space-y-0">

      {showTutorial && (
        <div className="px-4 sm:px-6 lg:px-10 pt-4">
          <Tutorial
            currentStep={userData?.currentTutorialStep}
            onComplete={handleCompleteTutorial}
            onSkip={handleCompleteTutorial}
          />
        </div>
      )}

      {/* ===== TICKER — truly full-width, no padding ===== */}
      <StockTickerBar
        portfolioStocks={portfolioStocks}
        allStocks={stocks}
      />

      {/* ===== REST OF PAGE — padded content ===== */}
      <div className="px-4 sm:px-6 lg:px-10 py-6 space-y-6">

        {/* ===== BALANCE CARD — full width ===== */}
        <Card className="w-full overflow-hidden bg-gradient-to-br from-green-800 to-white-600 text-white rounded-2xl shadow-lg">
          <div className="p-6 sm:p-8 lg:p-10">
            <p className="text-green-100 text-sm sm:text-base mb-1">
              Total Balance
            </p>
            <p className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              ${totalValue.toFixed(2)}
            </p>
            <div className="flex gap-8 sm:gap-16 lg:gap-24 flex-wrap">
              <div>
                <p className="text-green-100 text-sm sm:text-base">Cash</p>
                <p className="font-bold text-xl sm:text-2xl lg:text-3xl">
                  ${(userData?.balance || 0).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-green-100 text-sm sm:text-base">Stocks</p>
                <p className="font-bold text-xl sm:text-2xl lg:text-3xl">
                  ${totalPortfolioValue.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-green-100 text-sm sm:text-base">P/L</p>
                <p
                  className={`font-bold text-xl sm:text-2xl lg:text-3xl ${
                    totalProfitLoss >= 0 ? "text-green-200" : "text-red-300"
                  }`}
                >
                  {totalProfitLoss >= 0 ? "+" : ""}${totalProfitLoss.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* ===== HOLDINGS ===== */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">
              Your Holdings
            </h2>
            <Link to="/market">
              <Button variant="outline">Browse Market</Button>
            </Link>
          </div>

          {portfolioStocks.length === 0 ? (
            <Card className="w-full p-12 text-center">
              <TrendingUp className="w-14 h-14 mx-auto text-gray-300" />
              <p className="mt-4 text-gray-600 font-semibold text-lg">No stocks yet</p>
              <p className="text-sm text-gray-400 mb-6">
                Start building your portfolio!
              </p>
              <Link to="/market">
                <Button>Explore Market</Button>
              </Link>
            </Card>
          ) : (
            /* auto-fill grid: 1 col on phone, 2 on tablet, 3+ on laptop */
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
                    transition={{ delay: index * 0.08 }}
                  >
                    <Link to={`/stock/${stock.symbol}`}>
                      <Card className="p-5 sm:p-6 hover:shadow-lg transition h-full">
                        <div className="flex justify-between items-start">
                          <div className="min-w-0 flex-1">
                            <div className="flex gap-2 items-baseline mb-1">
                              <span className="font-bold text-lg sm:text-xl">
                                {stock.symbol}
                              </span>
                              <span className="text-sm text-gray-400">
                                {holding.shares} shares
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 truncate">
                              {stock.name}
                            </p>
                          </div>
                          <div className="text-right ml-4 flex-shrink-0">
                            <p className="font-bold text-lg sm:text-xl">
                              ${currentValue.toFixed(2)}
                            </p>
                            <div
                              className={`flex items-center gap-1 justify-end text-sm font-semibold ${
                                isProfit ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {isProfit ? (
                                <TrendingUp className="w-4 h-4" />
                              ) : (
                                <TrendingDown className="w-4 h-4" />
                              )}
                              <span>
                                {isProfit ? "+" : ""}${profitLoss.toFixed(2)}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400">
                              {profitLossPercent.toFixed(2)}%
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
      </div>
    </div>
  );
}