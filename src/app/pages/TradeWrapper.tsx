import { useState, useEffect } from "react";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { TradingInterface } from "../components/TradingInterface";
import { toast } from "sonner";

const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-0a8aeca7`;

export function TradeWrapper() {
  const [gameState, setGameState] = useState<any>(null);
  const [marketData, setMarketData] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // Init game
  useEffect(() => {
    const initGame = async () => {
      try {
        const existingResponse = await fetch(`${serverUrl}/game-state`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        });
        const existingData = await existingResponse.json();
        if (existingData.success) {
          setGameState(existingData.state);
        } else {
          const response = await fetch(`${serverUrl}/init-game`, {
            method: "POST",
            headers: { Authorization: `Bearer ${publicAnonKey}` },
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

  // Fetch market data
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

  const handleAITrade = async () => {
    if (Object.keys(marketData).length === 0) { toast.error("Market data not available"); return; }
    try {
      const response = await fetch(`${serverUrl}/ai-trade`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ marketData }),
      });
      const data = await response.json();
      if (data.success) {
        setGameState(data.state);
        return data.decision;
      } else {
        toast.error(data.error || "AI trade failed");
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
        setGameState(data.state);
        return { userValue: data.userValue, aiValue: data.aiValue, winner: data.winner };
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
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 min-h-screen">
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