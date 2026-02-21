import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { getMockStocks } from '../utils/mockStocks';
import { getUserData, saveUserData } from '../utils/storage';
import { Stock, UserData, Transaction, Achievement } from '../types';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { toast } from 'sonner';

export function StockDetail() {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const [stocks] = useState<Stock[]>(getMockStocks());
  const [userData, setUserData] = useState<UserData | null>(null);
  const [showBuyDialog, setShowBuyDialog] = useState(false);
  const [showSellDialog, setShowSellDialog] = useState(false);
  const [shares, setShares] = useState<string>('1');

  useEffect(() => {
    getUserData().then(setUserData);
  }, []);

  const stock = stocks.find(s => s.symbol === symbol);

  if (!stock) return (
    <div className="p-4">
      <Button variant="ghost" onClick={() => navigate(-1)}>
        <ArrowLeft className="w-4 h-4 mr-2" />Back
      </Button>
      <p className="text-center text-gray-500 mt-8">Stock not found</p>
    </div>
  );

  if (!userData) return (
    <div className="p-4 flex items-center justify-center min-h-48">
      <p className="text-gray-500">Loading...</p>
    </div>
  );

  const holding = userData.portfolio[stock.symbol];
  const isPositive = stock.changePercent >= 0;
  const sharesNum = parseInt(shares) || 0;
  const totalCost = sharesNum * stock.currentPrice;
  const canAfford = totalCost <= userData.balance;
  const canSell = holding && sharesNum <= holding.shares;

  const checkAchievements = (updatedData: UserData): Achievement[] => {
    const newlyUnlocked: Achievement[] = [];
    updatedData.achievements.forEach(achievement => {
      if (achievement.unlocked) return;
      let shouldUnlock = false;
      switch (achievement.id) {
        case 'first_trade':
          shouldUnlock = updatedData.transactions.length >= 1; break;
        case 'profit_maker':
          shouldUnlock = updatedData.transactions.some(t => {
            if (t.type !== 'sell') return false;
            const buyTx = updatedData.transactions.find(bt => bt.symbol === t.symbol && bt.type === 'buy');
            return buyTx && t.price > buyTx.price;
          }); break;
        case 'diversified':
          const sectors = new Set(Object.keys(updatedData.portfolio).map(sym => stocks.find(s => s.symbol === sym)?.sector));
          shouldUnlock = sectors.size >= 3; break;
        case 'big_spender':
          shouldUnlock = updatedData.transactions.some(t => t.shares * t.price >= 50); break;
        case 'day_trader':
          shouldUnlock = updatedData.transactions.length >= 10; break;
        case 'portfolio_builder':
          shouldUnlock = Object.keys(updatedData.portfolio).length >= 5; break;
      }
      if (shouldUnlock) {
        achievement.unlocked = true;
        achievement.unlockedAt = Date.now();
        newlyUnlocked.push(achievement);
      }
    });
    return newlyUnlocked;
  };

  const handleBuy = async () => {
    if (!canAfford || sharesNum <= 0) return;
    const transaction: Transaction = {
      id: Date.now().toString(), symbol: stock.symbol, type: 'buy',
      shares: sharesNum, price: stock.currentPrice, timestamp: Date.now()
    };
    const updatedPortfolio = { ...userData.portfolio };
    if (updatedPortfolio[stock.symbol]) {
      const existing = updatedPortfolio[stock.symbol];
      const totalShares = existing.shares + sharesNum;
      const totalCostBasis = (existing.shares * existing.averagePrice) + (sharesNum * stock.currentPrice);
      updatedPortfolio[stock.symbol] = { shares: totalShares, averagePrice: totalCostBasis / totalShares };
    } else {
      updatedPortfolio[stock.symbol] = { shares: sharesNum, averagePrice: stock.currentPrice };
    }
    const updatedData: UserData = {
      ...userData, balance: userData.balance - totalCost,
      portfolio: updatedPortfolio, transactions: [...userData.transactions, transaction]
    };
    const newAchievements = checkAchievements(updatedData);
    setUserData(updatedData);
    await saveUserData(updatedData);
    setShowBuyDialog(false);
    setShares('1');
    toast.success(`Bought ${sharesNum} shares of ${stock.symbol}!`);
    newAchievements.forEach(a => setTimeout(() => toast.success(`🏆 Achievement Unlocked: ${a.title}!`), 500));
  };

  const handleSell = async () => {
    if (!canSell || sharesNum <= 0 || !holding) return;
    const transaction: Transaction = {
      id: Date.now().toString(), symbol: stock.symbol, type: 'sell',
      shares: sharesNum, price: stock.currentPrice, timestamp: Date.now()
    };
    const updatedPortfolio = { ...userData.portfolio };
    const remainingShares = holding.shares - sharesNum;
    if (remainingShares === 0) {
      delete updatedPortfolio[stock.symbol];
    } else {
      updatedPortfolio[stock.symbol] = { ...holding, shares: remainingShares };
    }
    const updatedData: UserData = {
      ...userData, balance: userData.balance + totalCost,
      portfolio: updatedPortfolio, transactions: [...userData.transactions, transaction]
    };
    const newAchievements = checkAchievements(updatedData);
    setUserData(updatedData);
    await saveUserData(updatedData);
    setShowSellDialog(false);
    setShares('1');
    const profit = (stock.currentPrice - holding.averagePrice) * sharesNum;
    toast.success(`Sold ${sharesNum} shares of ${stock.symbol}! ${profit >= 0 ? 'Profit' : 'Loss'}: $${Math.abs(profit).toFixed(2)}`);
    newAchievements.forEach(a => setTimeout(() => toast.success(`🏆 Achievement Unlocked: ${a.title}!`), 500));
  };

  return (
    <div className="pb-4">
      <div className="p-4 bg-white border-b sticky top-[73px] z-10">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2">
          <ArrowLeft className="w-4 h-4 mr-2" />Back
        </Button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{stock.symbol}</h1>
            <p className="text-gray-600">{stock.name}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">${stock.currentPrice.toFixed(2)}</p>
            <div className={`flex items-center gap-1 justify-end ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span className="font-medium">
                {isPositive ? '+' : ''}${stock.changeAmount.toFixed(2)} ({isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <Card className="p-4">
          <h3 className="font-semibold mb-4">30-Day Price Chart</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={stock.historicalData}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
              />
              <Area type="monotone" dataKey="price" stroke={isPositive ? "#10b981" : "#ef4444"}
                fillOpacity={1} fill="url(#colorPrice)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold">About</h3>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed">{stock.description}</p>
          <div className="mt-3">
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{stock.sector}</span>
          </div>
        </Card>

        {holding && (
          <Card className="p-4 bg-blue-50 border-blue-200">
            <h3 className="font-semibold mb-3">Your Position</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-gray-600">Shares Owned</p><p className="font-bold text-lg">{holding.shares}</p></div>
              <div><p className="text-gray-600">Avg. Price</p><p className="font-bold text-lg">${holding.averagePrice.toFixed(2)}</p></div>
              <div><p className="text-gray-600">Current Value</p><p className="font-bold text-lg">${(holding.shares * stock.currentPrice).toFixed(2)}</p></div>
              <div>
                <p className="text-gray-600">Profit/Loss</p>
                <p className={`font-bold text-lg ${(stock.currentPrice - holding.averagePrice) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${((stock.currentPrice - holding.averagePrice) * holding.shares).toFixed(2)}
                </p>
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-3 sticky bottom-20 bg-gray-50 py-2">
          <Button size="lg" onClick={() => setShowBuyDialog(true)} className="bg-green-600 hover:bg-green-700">Buy</Button>
          <Button size="lg" variant="outline" onClick={() => setShowSellDialog(true)} disabled={!holding} className={!holding ? 'opacity-50' : ''}>Sell</Button>
        </div>
      </div>

      <Dialog open={showBuyDialog} onOpenChange={setShowBuyDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Buy {stock.symbol}</DialogTitle>
            <DialogDescription>Current price: ${stock.currentPrice.toFixed(2)} per share</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Number of Shares</label>
              <Input type="number" min="1" value={shares} onChange={(e) => setShares(e.target.value)} placeholder="Enter shares" />
            </div>
            <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Shares:</span><span className="font-medium">{sharesNum}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Price per share:</span><span className="font-medium">${stock.currentPrice.toFixed(2)}</span></div>
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

      <Dialog open={showSellDialog} onOpenChange={setShowSellDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sell {stock.symbol}</DialogTitle>
            <DialogDescription>Current price: ${stock.currentPrice.toFixed(2)} per share</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Number of Shares</label>
              <Input type="number" min="1" max={holding?.shares || 0} value={shares} onChange={(e) => setShares(e.target.value)} placeholder="Enter shares" />
              <p className="text-xs text-gray-500 mt-1">You own {holding?.shares || 0} shares</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Shares:</span><span className="font-medium">{sharesNum}</span></div>
              <div className="flex justify-between"><span className="text-gray-600">Price per share:</span><span className="font-medium">${stock.currentPrice.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-base border-t pt-2"><span>Total Value:</span><span>${totalCost.toFixed(2)}</span></div>
              {holding && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Profit/Loss:</span>
                  <span className={(stock.currentPrice - holding.averagePrice) * sharesNum >= 0 ? 'text-green-600' : 'text-red-600'}>
                    ${((stock.currentPrice - holding.averagePrice) * sharesNum).toFixed(2)}
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