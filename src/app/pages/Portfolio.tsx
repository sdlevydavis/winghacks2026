import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { TrendingUp, TrendingDown, Plus, DollarSign } from 'lucide-react';
import { getUserData, saveUserData } from '../utils/storage';
import { getMockStocks } from '../utils/mockStocks';
import { UserData, Stock } from '../types';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Tutorial } from '../components/Tutorial';
import { motion } from 'motion/react';

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

  const totalPortfolioValue = portfolioStocks.reduce((sum, item) => sum + (item?.currentValue || 0), 0);
  const totalValue = userData.balance + totalPortfolioValue;

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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}