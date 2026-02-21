import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router";
import { TrendingUp, TrendingDown, Plus, DollarSign } from "lucide-react";
import { motion } from "framer-motion";

import { getUserData, saveUserData } from "../utils/storage";
import { getMockStocks } from "../utils/mockStocks";

import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Tutorial } from "../components/Tutorial";

/* ===========================================================
   Stock Ticker Bar — full-width, auto-scrolling marquee
=========================================================== */
function StockTickerBar({ portfolioStocks, allStocks }) {
  const portfolioSymbols = new Set(
    portfolioStocks.map((item) => item?.stock?.symbol)
  );

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
          const changePct = ((Math.random() - 0.48) * 4).toFixed(2);
          return { ...item, changePct };
        })
        .filter(Boolean),
    [displayStocks]
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
          0% { transform: translateX(0); }
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
              const changePct = parseFloat((item as any).changePct);
              const isUp = changePct >= 0;

              return (
                <Link
                  to={`/stock/${stock.symbol}`}
                  key={index}
                  className={`flex-shrink-0 flex flex-col justify-center px-6 py-4 border-r border-gray-100 hover:bg-gray-50 transition-colors ${
                    isOwned ? "bg-green-50" : ""
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
                    ${stock.currentPrice.toFixed(2)}
                  </span>
                  <span
                    className={`block text-sm font-bold whitespace-nowrap ${
                      isUp ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {isUp ? "▲" : "▼"} {Math.abs(changePct)}%
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
  const [userData, setUserData] = useState<UserData | null>(null);
  const [stocks] = useState<Stock[]>(getMockStocks());
  const [loading, setLoading] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    getUserData()
      .then((data) => {
        setUserData(data);
        setShowTutorial(!data.tutorialCompleted);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const portfolioStocks = useMemo(() => {
    if (!userData?.portfolio) return [];
    return Object.entries(userData.portfolio)
      .map(([symbol, holding]: any) => {
        const stock = stocks.find((s) => s.symbol === symbol);
        if (!stock || !holding) return null;
        const currentValue = holding.shares * stock.currentPrice;
        const costBasis = holding.shares * holding.averagePrice;
        const profitLoss = currentValue - costBasis;
        const profitLossPercent = costBasis === 0 ? 0 : (profitLoss / costBasis) * 100;
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

  const handleCompleteTutorial = async () => {
    if (!userData) return;
    const updatedData = { ...userData, tutorialCompleted: true, currentTutorialStep: 6 };
    setUserData(updatedData);
    await saveUserData(updatedData);
    setShowTutorial(false);
  };

  if (loading)
    return (
      <div className="p-4 flex items-center justify-center min-h-48">
        <p className="text-gray-500">Loading...</p>
      </div>
    );

  if (!userData)
    return (
      <div className="p-4 text-center text-red-500">
        Failed to load data. Please refresh.
      </div>
    );

  return (
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

      {/* Ticker */}
      <StockTickerBar portfolioStocks={portfolioStocks} allStocks={stocks} />

      {/* Rest of page */}
      <div className="px-4 sm:px-6 lg:px-10 py-6 space-y-6">
        {/* Balance Card */}
        <Card className="w-full overflow-hidden bg-gradient-to-br from-green-800 to-white-600 text-white rounded-2xl shadow-lg">
          <div className="p-6 sm:p-8 lg:p-10">
            <p className="text-green-100 text-sm sm:text-base mb-1">Total Balance</p>
            <p className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">${totalValue.toFixed(2)}</p>
            <div className="flex gap-8 sm:gap-16 lg:gap-24 flex-wrap">
              <div>
                <p className="text-green-100 text-sm sm:text-base">Cash</p>
                <p className="font-bold text-xl sm:text-2xl lg:text-3xl">
                  ${(userData?.balance || 0).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-green-100 text-sm sm:text-base">Stocks</p>
                <p className="font-bold text-xl sm:text-2xl lg:text-3xl">${totalPortfolioValue.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-green-100 text-sm sm:text-base">P/L</p>
                <p className={`font-bold text-xl sm:text-2xl lg:text-3xl ${totalProfitLoss >= 0 ? "text-green-200" : "text-red-300"}`}>
                  {totalProfitLoss >= 0 ? "+" : ""}${totalProfitLoss.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Holdings */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">Your Holdings</h2>
            <Link to="/market">
              <Button variant="outline">Browse Market</Button>
            </Link>
          </div>

          {portfolioStocks.length === 0 ? (
            <Card className="w-full p-12 text-center">
              <TrendingUp className="w-14 h-14 mx-auto text-gray-300" />
              <p className="mt-4 text-gray-600 font-semibold text-lg">No stocks yet</p>
              <p className="text-sm text-gray-400 mb-6">Start building your portfolio!</p>
              <Link to="/market">
                <Button>Explore Market</Button>
              </Link>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {portfolioStocks.map((item, index) => {
                if (!item) return null;
                const { stock, holding, currentValue, profitLoss, profitLossPercent } = item;
                const isProfit = profitLoss >= 0;

                return (
                  <motion.div key={stock.symbol} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }}>
                    <Link to={`/stock/${stock.symbol}`}>
                      <Card className="p-5 sm:p-6 hover:shadow-lg transition h-full">
                        <div className="flex justify-between items-start">
                          <div className="min-w-0 flex-1">
                            <div className="flex gap-2 items-baseline mb-1">
                              <span className="font-bold text-lg sm:text-xl">{stock.symbol}</span>
                              <span className="text-sm text-gray-400">{holding.shares} shares</span>
                            </div>
                            <p className="text-sm text-gray-500 truncate">{stock.name}</p>
                          </div>
                          <div className="text-right ml-4 flex-shrink-0">
                            <p className="font-bold text-lg sm:text-xl">${currentValue.toFixed(2)}</p>
                            <div className={`flex items-center gap-1 justify-end text-sm font-semibold ${isProfit ? "text-green-600" : "text-red-600"}`}>
                              {isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                              <span>{isProfit ? "+" : ""}${profitLoss.toFixed(2)}</span>
                            </div>
                            <p className="text-xs text-gray-400">{profitLossPercent.toFixed(2)}%</p>
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