import { useState, useEffect } from "react";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { TradingInterface } from "../components/TradingInterface";
import { toast } from "sonner";
import { getUserData } from "../utils/storage";
const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-0a8aeca7`;

export function TradeWrapper() {
  const [gameState, setGameState] = useState<any>(null);
  const [marketData, setMarketData] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initGame = async () => {
      try {
        const userData = await getUserData();
        const realBalance = userData.balance;
        const realPortfolio: any = {};
        Object.entries(userData.portfolio).forEach(([symbol, h]: any) => {
          realPortfolio[symbol] = h.shares;
        });

        const existingResponse = await fetch(`${serverUrl}/game-state`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        });
        const existingData = await existingResponse.json();

        if (existingData.success) {
          // Patch user side with real data, keep AI state as-is
          const patched = {
            ...existingData.state,
            user: {
              ...existingData.state.user,
              cash: realBalance,
              portfolio: realPortfolio,
            },
          };
          setGameState(patched);
        } else {
          // Fresh game — AI starts with the same balance as the user
          const response = await fetch(`${serverUrl}/init-game`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
            body: JSON.stringify({ startingBalance: realBalance }),
          });
          const data = await response.json();
          if (data.success) setGameState(data.state);
        }
      } catch {
        toast.error("Failed to initialize game");
      } finally {
        setLoading(false);
      }
    };
    initGame();
  }, []);

  const fetchMarketData = async () => {
    try {
      const response = await fetch(`${serverUrl}/market-data`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const result = await response.json();
      if (result.success) setMarketData(result.data);
      else toast.error(result.error || "Failed to fetch market data");
    } catch {
      toast.error("Failed to fetch market data");
    }
  };

  useEffect(() => {
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleTrade = async (symbol: string, action: "buy" | "sell", shares: number) => {
    const price = marketData[symbol]?.c;
    if (!price) { toast.error("Price data not available"); return; }
    try {
      const response = await fetch(`${serverUrl}/user-trade`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ symbol, action, shares, price }),
      });
      const data = await response.json();
      if (data.success) {
        setGameState(data.state);
        toast.success(`${action === "buy" ? "Bought" : "Sold"} ${shares} shares of ${symbol}`);
      } else {
        toast.error(data.error || "Trade failed");
      }
    } catch {
      toast.error("Failed to execute trade");
    }
  };

const handleAITrade = async () => {   // ← make sure 'async' is here
  if (Object.keys(marketData).length === 0) { toast.error("Market data not available"); return; }
  try {
    const response = await fetch(`${serverUrl}/ai-trade`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
      body: JSON.stringify({ marketData }),
    });
    const data = await response.json();
    if (data.success) {
      const userData = await getUserData();   // ← this needs 'async' on the outer function
      const realPortfolio: any = {};
      Object.entries(userData.portfolio).forEach(([symbol, h]: any) => {
        realPortfolio[symbol] = h.shares;
      });
      setGameState({
        ...data.state,
        user: { ...data.state.user, cash: userData.balance, portfolio: realPortfolio },
      });
      return data.decision;
    } else {
      toast.error(data.error || "AI trade failed");
      return null;
    }
  } catch {
    toast.error("Failed to get AI decision");
  }
};
const handleCalculateScores = async () => {
  if (Object.keys(marketData).length === 0) { toast.error("Market data not available"); return; }
  try {
    const response = await fetch(`${serverUrl}/calculate-scores`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
      body: JSON.stringify({ marketData }),
    });
    const data = await response.json();
    if (data.success) {
      // Re-patch with real local user data, same as initGame does
      const userData = await getUserData();
      const realPortfolio: any = {};
      Object.entries(userData.portfolio).forEach(([symbol, h]: any) => {
        realPortfolio[symbol] = h.shares;
      });

      // Recalculate real user value locally instead of trusting server
      const realUserValue = userData.balance + Object.entries(userData.portfolio).reduce((sum, [symbol, h]: any) => {
        return sum + h.shares * (marketData[symbol]?.c || 0);
      }, 0);

      const patched = {
        ...data.state,
        user: {
          ...data.state.user,
          cash: userData.balance,
          portfolio: realPortfolio,
        },
      };
      setGameState(patched);

      const winner = realUserValue > data.aiValue ? "user" : data.aiValue > realUserValue ? "ai" : "tie";
      return { userValue: realUserValue, aiValue: data.aiValue, winner };
    }
  } catch {
    toast.error("Failed to calculate scores");
  }
};
  if (loading) return (
    <div className="flex items-center justify-center min-h-48">
      <p className="text-gray-500">Loading game...</p>
    </div>
  );

  return (
    <div className="min-h-screen">
      <TradingInterface
        gameState={gameState}
        marketData={marketData}
        onTrade={handleTrade}
        onAITrade={handleAITrade}
        onCalculateScores={handleCalculateScores}
        onRefreshMarket={fetchMarketData}
      />
    </div>
  );
}