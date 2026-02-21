import { useState, useEffect } from "react";
import { projectId, publicAnonKey } from "/utils/supabase/info";
import { TradingInterface } from "./components/TradingInterface";
import { toast } from "sonner";
import { Toaster } from "sonner";

export default function App() {
  const [gameState, setGameState] = useState<any>(null);
  const [marketData, setMarketData] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-0a8aeca7`;

  // Initialize game - load existing state or create new one
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
      } catch (error) {
        console.error("Error initializing game:", error);
        toast.error("Failed to initialize game");
      } finally {
        setLoading(false);
      }
    };

    initGame();
  }, []);

  // Fetch market data from backend
  const fetchMarketData = async () => {
    try {
      const response = await fetch(`${serverUrl}/market-data`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const result = await response.json();
      if (result.success) {
        setMarketData(result.data);
      } else {
        toast.error(result.error || "Failed to fetch market data");
      }
    } catch (error) {
      console.error("Error fetching market data:", error);
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
    if (!price) {
      toast.error("Price data not available");
      return;
    }

    try {
      const response = await fetch(`${serverUrl}/user-trade`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ symbol, action, shares, price }),
      });

      const data = await response.json();
      if (data.success) {
        setGameState(data.state);
        toast.success(`${action === "buy" ? "Bought" : "Sold"} ${shares} shares of ${symbol}`);
      } else {
        toast.error(data.error || "Trade failed");
      }
    } catch (error) {
      console.error("Error executing trade:", error);
      toast.error("Failed to execute trade");
    }
  };

const handleAITrade = async () => {
  if (Object.keys(marketData).length === 0) {
    toast.error("Market data not available");
    return;
  }

  try {
    const response = await fetch(`${serverUrl}/ai-trade`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ marketData }),
    });

    const data = await response.json();
    if (data.success) {
      setGameState(data.state);
      return data.decision; // 👈 return the decision
    } else {
      toast.error(data.error || "AI trade failed");
    }
  } catch (error) {
    console.error("Error getting AI trade:", error);
    toast.error("Failed to get AI decision");
  }
};
  const handleCalculateScores = async () => {
    if (Object.keys(marketData).length === 0) {
      toast.error("Market data not available");
      return;
    }

    try {
      const response = await fetch(`${serverUrl}/calculate-scores`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ marketData }),
      });

      const data = await response.json();
      if (data.success) {
        setGameState(data.state);
        return { userValue: data.userValue, aiValue: data.aiValue, winner: data.winner };
      }
    } catch (error) {
      console.error("Error calculating scores:", error);
      toast.error("Failed to calculate scores");
    }
  };

  if (loading) {
    return (
      <div className="size-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-white text-xl">Loading TradeQuest...</div>
      </div>
    );
  }
import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';
import { supabase } from './utils/supabase';
import { Session } from '@supabase/supabase-js';
import { Login } from './pages/Login';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Loading...</p>
    </div>
  );

  if (!session) return (
    <>
      <Login />
      <Toaster position="top-center" />
    </>
  );

  return (
    <div className="size-full bg-gradient-to-br from-slate-900 to-slate-800">
      <Toaster position="top-right" />
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