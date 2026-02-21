import { useState } from "react";
import { TrendingUp, TrendingDown, Brain, User, Trophy, RefreshCw, X } from "lucide-react";

interface TradingInterfaceProps {
  gameState: any;
  marketData: any;
  onTrade: (symbol: string, action: "buy" | "sell", shares: number) => void;
onAITrade: () => Promise<any>;
  onCalculateScores: () => Promise<{ userValue: number; aiValue: number; winner: string } | void>;
  onRefreshMarket: () => void;
}

export function TradingInterface({
  gameState,
  marketData,
  onTrade,
  onAITrade,
  onCalculateScores,
  onRefreshMarket,
}: TradingInterfaceProps) {
  const [selectedStock, setSelectedStock] = useState("");
  const [shares, setShares] = useState(1);
  const [activeTab, setActiveTab] = useState<"market" | "portfolio">("market");
  const [aiModal, setAiModal] = useState<{ show: boolean; decision: any } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [scoreModal, setScoreModal] = useState<{ show: boolean; userValue: number; aiValue: number; winner: string } | null>(null);
  const [scoreLoading, setScoreLoading] = useState(false);

  if (!gameState) return null;

  const calculatePortfolioValue = (player: any) => {
    let total = player.cash;
    for (const [symbol, shares] of Object.entries(player.portfolio)) {
      const price = marketData[symbol]?.c || 0;
      total += (shares as number) * price;
    }
    return total;
  };

  const userValue = calculatePortfolioValue(gameState.user);
  const aiValue = calculatePortfolioValue(gameState.ai);

const handleAITrade = async () => {
  setAiLoading(true);
  const decision = await onAITrade(); // 👈 get decision from return value
  setAiLoading(false);
  setAiModal({
    show: true,
    decision: decision || { action: "hold", reasoning: "No trade made" },
  });
};

  const handleCalculateScores = async () => {
    setScoreLoading(true);
    const result = await onCalculateScores();
    setScoreLoading(false);
    if (result) {
      setScoreModal({ show: true, ...result });
    } else {
      // fallback: use current portfolio values
      const uv = calculatePortfolioValue(gameState.user);
      const av = calculatePortfolioValue(gameState.ai);
      setScoreModal({
        show: true,
        userValue: uv,
        aiValue: av,
        winner: uv > av ? "user" : av > uv ? "ai" : "tie",
      });
    }
  };

  return (
    <div className="size-full overflow-auto p-4 md:p-6">

      {/* AI Trade Modal */}
      {aiModal?.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAiModal(null)} />
          <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/40 rounded-2xl shadow-2xl p-8 max-w-md w-full z-10">
            <button onClick={() => setAiModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition">
              <X className="size-5" />
            </button>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="bg-purple-600/30 border border-purple-500/50 rounded-full p-4 mb-4">
                <Brain className="size-10 text-purple-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">AI Made a Move</h2>
              <p className="text-slate-400 text-sm mt-1">Google Gemini just traded</p>
            </div>
            <div className={`rounded-xl p-5 mb-5 ${
              aiModal.decision?.action === "buy" ? "bg-green-500/10 border border-green-500/30"
              : aiModal.decision?.action === "sell" ? "bg-red-500/10 border border-red-500/30"
              : "bg-slate-700/50 border border-slate-600"
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-3xl font-black tracking-wide ${
                  aiModal.decision?.action === "buy" ? "text-green-400"
                  : aiModal.decision?.action === "sell" ? "text-red-400"
                  : "text-slate-400"
                }`}>
                  {aiModal.decision?.action?.toUpperCase()}
                </span>
                {aiModal.decision?.symbol && (
                  <span className="text-xl font-bold text-white bg-slate-700 px-3 py-1 rounded-lg">
                    {aiModal.decision.symbol}
                  </span>
                )}
              </div>
              {aiModal.decision?.shares > 0 && (
                <p className="text-slate-300 text-lg mb-2">
                  <span className="font-semibold text-white">{aiModal.decision.shares}</span> shares
                  {marketData[aiModal.decision.symbol]?.c && (
                    <span className="text-slate-400 text-sm ml-2">
                      @ ${marketData[aiModal.decision.symbol].c.toFixed(2)} each
                    </span>
                  )}
                </p>
              )}
              {aiModal.decision?.reasoning && (
                <p className="text-slate-300 text-sm italic mt-2 border-t border-slate-600/50 pt-2">
                  "{aiModal.decision.reasoning}"
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-3 text-center">
                <p className="text-blue-300 text-xs mb-1">Your Portfolio</p>
                <p className="text-white font-bold">${userValue.toFixed(0)}</p>
              </div>
              <div className="bg-purple-600/20 border border-purple-500/30 rounded-lg p-3 text-center">
                <p className="text-purple-300 text-xs mb-1">AI Portfolio</p>
                <p className="text-white font-bold">${aiValue.toFixed(0)}</p>
              </div>
            </div>
            <button onClick={() => setAiModal(null)} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-xl font-semibold transition">
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Score Modal */}
      {scoreModal?.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setScoreModal(null)} />
          <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-yellow-500/40 rounded-2xl shadow-2xl p-8 max-w-md w-full z-10">
            <button onClick={() => setScoreModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white transition">
              <X className="size-5" />
            </button>

            {/* Winner banner */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className={`rounded-full p-4 mb-4 ${
                scoreModal.winner === "user" ? "bg-yellow-500/30 border border-yellow-400/50"
                : scoreModal.winner === "ai" ? "bg-purple-600/30 border border-purple-500/50"
                : "bg-slate-700/50 border border-slate-600"
              }`}>
                <Trophy className={`size-10 ${
                  scoreModal.winner === "user" ? "text-yellow-400"
                  : scoreModal.winner === "ai" ? "text-purple-400"
                  : "text-slate-400"
                }`} />
              </div>
              <h2 className="text-3xl font-black text-white">
                {scoreModal.winner === "user" ? "🎉 You Win!" : scoreModal.winner === "ai" ? "🤖 AI Wins!" : "🤝 It's a Tie!"}
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                {scoreModal.winner === "user" ? "You outperformed the AI!"
                : scoreModal.winner === "ai" ? "The AI outperformed you this round."
                : "Both portfolios are neck and neck."}
              </p>
            </div>

            {/* Portfolio comparison */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className={`rounded-xl p-4 text-center border-2 ${
                scoreModal.winner === "user" ? "bg-green-500/10 border-green-500/50" : "bg-blue-600/10 border-blue-500/30"
              }`}>
                <p className="text-slate-300 text-xs mb-1 flex items-center justify-center gap-1">
                  <User className="size-3" /> You
                </p>
                <p className="text-white font-black text-2xl">${scoreModal.userValue.toFixed(2)}</p>
                {scoreModal.winner === "user" && <p className="text-green-400 text-xs mt-1">▲ Winner</p>}
              </div>
              <div className={`rounded-xl p-4 text-center border-2 ${
                scoreModal.winner === "ai" ? "bg-green-500/10 border-green-500/50" : "bg-purple-600/10 border-purple-500/30"
              }`}>
                <p className="text-slate-300 text-xs mb-1 flex items-center justify-center gap-1">
                  <Brain className="size-3" /> AI
                </p>
                <p className="text-white font-black text-2xl">${scoreModal.aiValue.toFixed(2)}</p>
                {scoreModal.winner === "ai" && <p className="text-green-400 text-xs mt-1">▲ Winner</p>}
              </div>
            </div>

            {/* Difference */}
            <div className="bg-slate-700/50 rounded-lg p-3 text-center mb-5">
              <p className="text-slate-400 text-xs mb-1">Difference</p>
              <p className="text-white font-bold text-lg">
                ${Math.abs(scoreModal.userValue - scoreModal.aiValue).toFixed(2)}
              </p>
            </div>

            {/* Score stats */}
            <div className="grid grid-cols-3 gap-2 mb-5 text-center">
              <div className="bg-slate-700/50 rounded-lg p-2">
                <p className="text-slate-400 text-xs">Your Wins</p>
                <p className="text-white font-bold">{gameState.scores.userWins}</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-2">
                <p className="text-slate-400 text-xs">AI Wins</p>
                <p className="text-white font-bold">{gameState.scores.aiWins}</p>
              </div>
              <div className="bg-yellow-500/20 rounded-lg p-2 border border-yellow-500/30">
                <p className="text-yellow-300 text-xs">Your Points</p>
                <p className="text-yellow-400 font-bold">{gameState.scores.userPoints}</p>
              </div>
            </div>

            <button onClick={() => setScoreModal(null)} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold transition">
              Continue Trading
            </button>
          </div>
        </div>
      )}

      {/* Loading overlays */}
      {(aiLoading || scoreLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-slate-800 border border-purple-500/40 rounded-2xl p-8 flex flex-col items-center gap-4">
            <div className="size-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-white font-semibold">
              {aiLoading ? "AI is analyzing the market..." : "Calculating scores..."}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">TradeQuest</h1>
            <p className="text-slate-300">Trade against AI powered by Google Gemini</p>
          </div>
          <div className="flex gap-3">
            <button onClick={onRefreshMarket} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center gap-2 transition">
              <RefreshCw className="size-4" />
              Refresh Market
            </button>
            <button onClick={handleAITrade} disabled={aiLoading} className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg flex items-center gap-2 transition">
              <Brain className="size-4" />
              AI Trade
            </button>
            <button onClick={handleCalculateScores} disabled={scoreLoading} className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg flex items-center gap-2 transition">
              <Trophy className="size-4" />
              Calculate Score
            </button>
          </div>
        </div>

        {/* Score Display */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <User className="size-6" />
              <h3 className="text-lg font-semibold">Your Portfolio</h3>
            </div>
            <p className="text-3xl font-bold">${userValue.toFixed(2)}</p>
            <p className="text-sm opacity-80 mt-1">Cash: ${gameState.user.cash.toFixed(2)}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <Brain className="size-6" />
              <h3 className="text-lg font-semibold">AI Portfolio</h3>
            </div>
            <p className="text-3xl font-bold">${aiValue.toFixed(2)}</p>
            <p className="text-sm opacity-80 mt-1">Cash: ${gameState.ai.cash.toFixed(2)}</p>
          </div>
          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <Trophy className="size-6" />
              <h3 className="text-lg font-semibold">Your Score</h3>
            </div>
            <p className="text-3xl font-bold">{gameState.scores.userPoints} pts</p>
            <p className="text-sm opacity-80 mt-1">
              Wins: {gameState.scores.userWins} | AI Wins: {gameState.scores.aiWins}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button onClick={() => setActiveTab("market")} className={`px-6 py-3 rounded-lg font-semibold transition ${activeTab === "market" ? "bg-white text-slate-900" : "bg-slate-700 text-white hover:bg-slate-600"}`}>
            Market
          </button>
          <button onClick={() => setActiveTab("portfolio")} className={`px-6 py-3 rounded-lg font-semibold transition ${activeTab === "portfolio" ? "bg-white text-slate-900" : "bg-slate-700 text-white hover:bg-slate-600"}`}>
            Portfolio
          </button>
        </div>

        {/* Market View */}
        {activeTab === "market" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-xl p-6">
              <h2 className="text-2xl font-bold mb-4 text-slate-800">Available Stocks</h2>
              <div className="space-y-3">
                {Object.entries(marketData).map(([symbol, data]: [string, any]) => {
                  const change = data.dp || 0;
                  const isPositive = change >= 0;
                  return (
                    <div key={symbol} onClick={() => setSelectedStock(symbol)} className={`p-4 rounded-lg border-2 cursor-pointer transition ${selectedStock === symbol ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300"}`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-lg font-bold text-slate-800">{symbol}</h3>
                          <p className="text-2xl font-semibold text-slate-700">${data.c?.toFixed(2) || "N/A"}</p>
                        </div>
                        <div className="text-right">
                          <div className={`flex items-center gap-1 ${isPositive ? "text-green-600" : "text-red-600"}`}>
                            {isPositive ? <TrendingUp className="size-5" /> : <TrendingDown className="size-5" />}
                            <span className="font-semibold">{change.toFixed(2)}%</span>
                          </div>
                          <p className="text-sm text-slate-500 mt-1">High: ${data.h?.toFixed(2) || "N/A"}</p>
                          <p className="text-sm text-slate-500">Low: ${data.l?.toFixed(2) || "N/A"}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-xl p-6">
              <h2 className="text-2xl font-bold mb-4 text-slate-800">Trade</h2>
              {selectedStock ? (
                <div>
                  <div className="mb-6 p-4 bg-slate-100 rounded-lg">
                    <h3 className="text-xl font-bold text-slate-800 mb-2">{selectedStock}</h3>
                    <p className="text-3xl font-bold text-slate-700">${marketData[selectedStock]?.c?.toFixed(2) || "N/A"}</p>
                    <p className="text-sm text-slate-600 mt-2">You own: {gameState.user.portfolio[selectedStock] || 0} shares</p>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Number of Shares</label>
                    <input type="number" min="1" value={shares} onChange={(e) => setShares(Math.max(1, parseInt(e.target.value) || 1))} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-slate-700">Total Cost: ${((marketData[selectedStock]?.c || 0) * shares).toFixed(2)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => onTrade(selectedStock, "buy", shares)} className="bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition">Buy</button>
                    <button onClick={() => onTrade(selectedStock, "sell", shares)} className="bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold transition" disabled={(gameState.user.portfolio[selectedStock] || 0) < shares}>Sell</button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <p>Select a stock from the list to start trading</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Portfolio View */}
        {activeTab === "portfolio" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <User className="size-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-slate-800">Your Holdings</h2>
              </div>
              {Object.entries(gameState.user.portfolio).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(gameState.user.portfolio).map(([symbol, shares]) => {
                    const currentPrice = marketData[symbol]?.c || 0;
                    const value = (shares as number) * currentPrice;
                    return (
                      <div key={symbol} className="p-4 bg-slate-50 rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="text-lg font-bold text-slate-800">{symbol}</h3>
                            <p className="text-sm text-slate-600">{shares} shares</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold text-slate-700">${value.toFixed(2)}</p>
                            <p className="text-sm text-slate-500">@ ${currentPrice.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center py-8 text-slate-500">No holdings yet</p>
              )}
              <div className="mt-6 pt-6 border-t border-slate-200">
                <h3 className="font-semibold text-slate-800 mb-3">Recent Trades</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {gameState.user.trades.slice(-5).reverse().map((trade: any, idx: number) => (
                    <div key={idx} className="text-sm p-2 bg-slate-50 rounded">
                      <span className={trade.action === "buy" ? "text-green-600" : "text-red-600"}>{trade.action.toUpperCase()}</span>{" "}
                      {trade.shares} {trade.symbol} @ ${trade.price.toFixed(2)}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="size-6 text-purple-600" />
                <h2 className="text-2xl font-bold text-slate-800">AI Holdings</h2>
              </div>
              {Object.entries(gameState.ai.portfolio).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(gameState.ai.portfolio).map(([symbol, shares]) => {
                    const currentPrice = marketData[symbol]?.c || 0;
                    const value = (shares as number) * currentPrice;
                    return (
                      <div key={symbol} className="p-4 bg-purple-50 rounded-lg">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="text-lg font-bold text-slate-800">{symbol}</h3>
                            <p className="text-sm text-slate-600">{shares} shares</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold text-slate-700">${value.toFixed(2)}</p>
                            <p className="text-sm text-slate-500">@ ${currentPrice.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center py-8 text-slate-500">No holdings yet</p>
              )}
              <div className="mt-6 pt-6 border-t border-slate-200">
                <h3 className="font-semibold text-slate-800 mb-3">AI Recent Trades</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {gameState.ai.trades.slice(-5).reverse().map((trade: any, idx: number) => (
                    <div key={idx} className="text-sm p-2 bg-purple-50 rounded">
                      <div>
                        <span className={trade.action === "buy" ? "text-green-600" : "text-red-600"}>{trade.action.toUpperCase()}</span>{" "}
                        {trade.shares} {trade.symbol} @ ${trade.price.toFixed(2)}
                      </div>
                      {trade.reasoning && <p className="text-xs text-slate-600 mt-1 italic">{trade.reasoning}</p>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}