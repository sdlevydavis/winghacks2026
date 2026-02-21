import { useState } from "react";
import { Brain, User, Trophy, RefreshCw, X } from "lucide-react";

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
  onAITrade,
  onCalculateScores,
  onRefreshMarket,
}: TradingInterfaceProps) {
  const [aiModal, setAiModal] = useState<{ show: boolean; decision: any } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [scoreModal, setScoreModal] = useState<{ show: boolean; userValue: number; aiValue: number; winner: string } | null>(null);
  const [scoreLoading, setScoreLoading] = useState(false);

  if (!gameState) return (
    <div className="flex items-center justify-center min-h-48">
      <p className="text-gray-500">Loading game...</p>
    </div>
  );

  const calculatePortfolioValue = (player: any) => {
    let total = player.cash;
    for (const [symbol, shares] of Object.entries(player.portfolio)) {
      total += (shares as number) * (marketData[symbol]?.c || 0);
    }
    return total;
  };

  const userValue = calculatePortfolioValue(gameState.user);
  const aiValue = calculatePortfolioValue(gameState.ai);

  const handleAITrade = async () => {
    setAiLoading(true);
    const decision = await onAITrade();
    setAiLoading(false);
    setAiModal({ show: true, decision: decision || { action: "hold", reasoning: "No trade made" } });
  };

  const handleCalculateScores = async () => {
    setScoreLoading(true);
    const result = await onCalculateScores();
    setScoreLoading(false);
    if (result) {
      setScoreModal({ show: true, ...result });
    } else {
      const uv = calculatePortfolioValue(gameState.user);
      const av = calculatePortfolioValue(gameState.ai);
      setScoreModal({ show: true, userValue: uv, aiValue: av, winner: uv > av ? "user" : av > uv ? "ai" : "tie" });
    }
  };

  return (
    <div className="w-full space-y-0">

      {/* AI Trade Modal */}
      {aiModal?.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setAiModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full z-10">
            <button onClick={() => setAiModal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition">
              <X className="size-5" />
            </button>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="bg-green-100 rounded-full p-4 mb-4">
                <Brain className="size-10 text-green-700" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">AI Made a Move</h2>
              <p className="text-gray-500 text-sm mt-1">Google Gemini just traded</p>
            </div>
            <div className={`rounded-xl p-5 mb-5 ${
              aiModal.decision?.action === "buy" ? "bg-green-50 border border-green-200"
              : aiModal.decision?.action === "sell" ? "bg-red-50 border border-red-200"
              : "bg-gray-50 border border-gray-200"
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-3xl font-black ${
                  aiModal.decision?.action === "buy" ? "text-green-600"
                  : aiModal.decision?.action === "sell" ? "text-red-600"
                  : "text-gray-400"
                }`}>
                  {aiModal.decision?.action?.toUpperCase()}
                </span>
                {aiModal.decision?.symbol && (
                  <span className="text-xl font-bold text-gray-800 bg-white border border-gray-200 px-3 py-1 rounded-lg">
                    {aiModal.decision.symbol}
                  </span>
                )}
              </div>
              {aiModal.decision?.shares > 0 && (
                <p className="text-gray-700 text-lg mb-2">
                  <span className="font-semibold">{aiModal.decision.shares}</span> shares
                  {marketData[aiModal.decision.symbol]?.c && (
                    <span className="text-gray-500 text-sm ml-2">@ ${marketData[aiModal.decision.symbol].c.toFixed(2)} each</span>
                  )}
                </p>
              )}
              {aiModal.decision?.reasoning && (
                <p className="text-gray-500 text-sm italic mt-2 border-t border-gray-200 pt-2">"{aiModal.decision.reasoning}"</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <p className="text-green-700 text-xs mb-1">Your Portfolio</p>
                <p className="text-gray-900 font-bold">${userValue.toFixed(0)}</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                <p className="text-gray-500 text-xs mb-1">AI Portfolio</p>
                <p className="text-gray-900 font-bold">${aiValue.toFixed(0)}</p>
              </div>
            </div>
            <button onClick={() => setAiModal(null)} className="w-full bg-green-700 hover:bg-green-800 text-white py-3 rounded-xl font-semibold transition">
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Score Modal */}
      {scoreModal?.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setScoreModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full z-10">
            <button onClick={() => setScoreModal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition">
              <X className="size-5" />
            </button>
            <div className="flex flex-col items-center text-center mb-6">
              <div className={`rounded-full p-4 mb-4 ${scoreModal.winner === "user" ? "bg-green-100" : "bg-gray-100"}`}>
                <Trophy className={`size-10 ${scoreModal.winner === "user" ? "text-green-700" : "text-gray-500"}`} />
              </div>
              <h2 className="text-3xl font-black text-gray-900">
                {scoreModal.winner === "user" ? "🎉 You Win!" : scoreModal.winner === "ai" ? "🤖 AI Wins!" : "🤝 It's a Tie!"}
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                {scoreModal.winner === "user" ? "You outperformed the AI!" : scoreModal.winner === "ai" ? "The AI outperformed you this round." : "Both portfolios are neck and neck."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className={`rounded-xl p-4 text-center border-2 ${scoreModal.winner === "user" ? "bg-green-50 border-green-400" : "bg-gray-50 border-gray-200"}`}>
                <p className="text-gray-500 text-xs mb-1 flex items-center justify-center gap-1"><User className="size-3" /> You</p>
                <p className="text-gray-900 font-black text-2xl">${scoreModal.userValue.toFixed(2)}</p>
                {scoreModal.winner === "user" && <p className="text-green-600 text-xs mt-1">▲ Winner</p>}
              </div>
              <div className={`rounded-xl p-4 text-center border-2 ${scoreModal.winner === "ai" ? "bg-green-50 border-green-400" : "bg-gray-50 border-gray-200"}`}>
                <p className="text-gray-500 text-xs mb-1 flex items-center justify-center gap-1"><Brain className="size-3" /> AI</p>
                <p className="text-gray-900 font-black text-2xl">${scoreModal.aiValue.toFixed(2)}</p>
                {scoreModal.winner === "ai" && <p className="text-green-600 text-xs mt-1">▲ Winner</p>}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-center mb-5">
              <p className="text-gray-400 text-xs mb-1">Difference</p>
              <p className="text-gray-900 font-bold text-lg">${Math.abs(scoreModal.userValue - scoreModal.aiValue).toFixed(2)}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-5 text-center">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
                <p className="text-gray-400 text-xs">Your Wins</p>
                <p className="text-gray-900 font-bold">{gameState.scores.userWins}</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
                <p className="text-gray-400 text-xs">AI Wins</p>
                <p className="text-gray-900 font-bold">{gameState.scores.aiWins}</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                <p className="text-green-700 text-xs">Points</p>
                <p className="text-green-800 font-bold">{gameState.scores.userPoints}</p>
              </div>
            </div>
            <button onClick={() => setScoreModal(null)} className="w-full bg-green-700 hover:bg-green-800 text-white py-3 rounded-xl font-semibold transition">
              Continue Trading
            </button>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {(aiLoading || scoreLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl p-8 flex flex-col items-center gap-4 shadow-xl">
            <div className="size-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-800 font-semibold">
              {aiLoading ? "AI is analyzing the market..." : "Calculating scores..."}
            </p>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="px-4 sm:px-6 lg:px-10 py-6 space-y-6">

<div>
  <div className="flex items-center gap-2">
    <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Trade Against</h2>
    <img src="/src/gemini.png" alt="Gemini" className="w-32 object-contain -my-4" />
  </div>
</div>
{/* Action buttons */}
        <div className="flex gap-3 flex-wrap">
          <button onClick={onRefreshMarket} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-2 transition text-sm font-medium">
            <RefreshCw className="size-4" /> Refresh
          </button>
          <button onClick={handleAITrade} disabled={aiLoading} className="px-4 py-2 bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white rounded-lg flex items-center gap-2 transition text-sm font-medium">
            <Brain className="size-4" /> AI Trade
          </button>
          <button onClick={handleCalculateScores} disabled={scoreLoading} className="px-4 py-2 bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white rounded-lg flex items-center gap-2 transition text-sm font-medium">
            <Trophy className="size-4" /> Calculate Score
          </button>
        </div>

        {/* Battle overview card — matches Portfolio balance card */}
        <div className="w-full overflow-hidden bg-gradient-to-br from-green-800 to-green-400 text-white rounded-2xl shadow-lg p-6 sm:p-8">
          <p className="text-green-100 text-sm mb-4">Battle Overview</p>
          <div className="flex gap-8 sm:gap-16 flex-wrap">
            <div>
              <p className="text-green-100 text-sm">Your Portfolio</p>
              <p className="font-bold text-2xl sm:text-3xl">${userValue.toFixed(2)}</p>
              <p className="text-green-200 text-xs mt-1">Cash: ${gameState.user.cash.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-green-100 text-sm">AI Portfolio</p>
              <p className="font-bold text-2xl sm:text-3xl">${aiValue.toFixed(2)}</p>
              <p className="text-green-200 text-xs mt-1">Cash: ${gameState.ai.cash.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-green-100 text-sm">Your Score</p>
              <p className="font-bold text-2xl sm:text-3xl">{gameState.scores.userPoints} pts</p>
              <p className="text-green-200 text-xs mt-1">Wins: {gameState.scores.userWins} | AI: {gameState.scores.aiWins}</p>
            </div>
          </div>
        </div>

        {/* AI Recent Trades */}
        <div className="space-y-3">
          <h3 className="text-xl font-bold text-gray-800">AI Recent Trades</h3>
          {gameState.ai.trades.length === 0 ? (
            <div className="bg-white rounded-2xl shadow p-10 text-center">
              <Brain className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No AI trades yet</p>
              <p className="text-sm text-gray-400 mt-1">Click "AI Trade" to let Gemini make a move!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {gameState.ai.trades.slice(-6).reverse().map((trade: any, idx: number) => (
                <div key={idx} className="bg-white rounded-xl shadow p-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className={`font-bold text-sm ${trade.action === "buy" ? "text-green-600" : "text-red-600"}`}>
                      {trade.action.toUpperCase()}
                    </span>
                    <span className="text-gray-700 font-semibold">{trade.symbol}</span>
                  </div>
                  <p className="text-gray-500 text-sm">{trade.shares} shares @ ${trade.price?.toFixed(2)}</p>
                  {trade.reasoning && <p className="text-xs text-gray-400 mt-1 italic">{trade.reasoning}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Your Recent Trades */}
        <div className="space-y-3 pb-6">
          <h3 className="text-xl font-bold text-gray-800">Your Recent Trades</h3>
          {gameState.user.trades.length === 0 ? (
            <div className="bg-white rounded-2xl shadow p-10 text-center">
              <User className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No trades yet</p>
              <p className="text-sm text-gray-400 mt-1">Go to Market to start trading!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {gameState.user.trades.slice(-6).reverse().map((trade: any, idx: number) => (
                <div key={idx} className="bg-white rounded-xl shadow p-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className={`font-bold text-sm ${trade.action === "buy" ? "text-green-600" : "text-red-600"}`}>
                      {trade.action.toUpperCase()}
                    </span>
                    <span className="text-gray-700 font-semibold">{trade.symbol}</span>
                  </div>
                  <p className="text-gray-500 text-sm">{trade.shares} shares @ ${trade.price?.toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}