import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "../server/kv_store.tsx";

const app = new Hono();

app.use('*', logger(console.log));

app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

app.get("/make-server-0a8aeca7/health", (c) => {
  return c.json({ status: "ok" });
});

app.get("/make-server-0a8aeca7/market-data", async (c) => {
  try {
    const finnhubApiKey = Deno.env.get("FINNHUB_API_KEY");
    if (!finnhubApiKey) {
      return c.json({ error: "Finnhub API key not configured" }, 500);
    }

    const symbols = ["AAPL", "GOOGL", "MSFT", "AMZN", "TSLA", "NVDA", "META"];
    const data: any = {};

    for (const symbol of symbols) {
      const response = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubApiKey}`
      );
      const quote = await response.json();
      data[symbol] = quote;
    }

    return c.json({ success: true, data });
  } catch (error) {
    console.error("Error fetching market data from Finnhub:", error);
    return c.json({ error: `Failed to fetch market data: ${error}` }, 500);
  }
});

app.post("/make-server-0a8aeca7/init-game", async (c) => {
  try {
    const initialState = {
      user: { cash: 100000, portfolio: {}, totalValue: 100000, trades: [] },
      ai: { cash: 100000, portfolio: {}, totalValue: 100000, trades: [] },
      scores: { userWins: 0, aiWins: 0, userPoints: 0 },
      lastAITradeTime: Date.now(),
    };
    await kv.set("game_state", initialState);
    return c.json({ success: true, state: initialState });
  } catch (error) {
    return c.json({ error: `Failed to initialize game: ${error}` }, 500);
  }
});

app.get("/make-server-0a8aeca7/game-state", async (c) => {
  try {
    const state = await kv.get("game_state");
    if (!state) return c.json({ error: "Game not initialized" }, 404);
    return c.json({ success: true, state });
  } catch (error) {
    return c.json({ error: `Failed to get game state: ${error}` }, 500);
  }
});

app.post("/make-server-0a8aeca7/user-trade", async (c) => {
  try {
    const { symbol, action, shares, price } = await c.req.json();
    const state = await kv.get("game_state");
    if (!state) return c.json({ error: "Game not initialized" }, 404);

    const totalCost = shares * price;

    if (action === "buy") {
      if (state.user.cash < totalCost) return c.json({ error: "Insufficient funds" }, 400);
      state.user.cash -= totalCost;
      state.user.portfolio[symbol] = (state.user.portfolio[symbol] || 0) + shares;
    } else if (action === "sell") {
      if ((state.user.portfolio[symbol] || 0) < shares) return c.json({ error: "Insufficient shares" }, 400);
      state.user.cash += totalCost;
      state.user.portfolio[symbol] -= shares;
      if (state.user.portfolio[symbol] === 0) delete state.user.portfolio[symbol];
    }

    state.user.trades.push({ symbol, action, shares, price, timestamp: Date.now() });
    await kv.set("game_state", state);
    return c.json({ success: true, state });
  } catch (error) {
    return c.json({ error: `Failed to execute trade: ${error}` }, 500);
  }
});

app.post("/make-server-0a8aeca7/ai-trade", async (c) => {
  try {
    const { marketData } = await c.req.json();
    const state = await kv.get("game_state");
    if (!state) return c.json({ error: "Game not initialized" }, 404);

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) return c.json({ error: "Gemini API key not configured" }, 500);

    const prices = Object.entries(marketData).map(([s, d]: any) => `${s}:${d.c}`).join(",");
    const cash = state.ai.cash.toFixed(0);
    const holdings = Object.entries(state.ai.portfolio).map(([s, n]) => `${s}:${n}`).join(",") || "none";

    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiApiKey,
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: "You are a stock trading bot. Respond only with valid JSON." }]
        },
        contents: [{
          parts: [{ text: `Cash:${cash} Holdings:${holdings} Prices:${prices}\nMake one trade decision.` }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 100,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              action: { type: "STRING", enum: ["buy", "sell", "hold"] },
              symbol: { type: "STRING" },
              shares: { type: "NUMBER" },
              reasoning: { type: "STRING" }
            },
            required: ["action", "symbol", "shares", "reasoning"]
          }
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      return c.json({ error: `Gemini API error: ${errorText}` }, 500);
    }

    const data = await response.json();
    const aiResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    console.log("RAW GEMINI RESPONSE:", JSON.stringify(aiResponseText));

    if (!aiResponseText) {
      return c.json({ error: "Invalid response from Gemini" }, 500);
    }

    let aiDecision;
    try {
      aiDecision = JSON.parse(aiResponseText);
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", aiResponseText);
      // Rule-based fallback: buy 10% of cash in a random stock
      const symbolList = Object.keys(marketData);
      const randomSymbol = symbolList[Math.floor(Math.random() * symbolList.length)];
      const price = marketData[randomSymbol]?.c || 1;
      const affordableShares = Math.floor((state.ai.cash * 0.1) / price);
      aiDecision = affordableShares > 0
        ? { action: "buy", symbol: randomSymbol, shares: affordableShares, reasoning: "diversify" }
        : { action: "hold", symbol: null, shares: 0, reasoning: "low funds" };
    }

    // Execute the AI trade
    if (aiDecision.action === "buy" && aiDecision.symbol && aiDecision.shares > 0) {
      const price = marketData[aiDecision.symbol]?.c || 0;
      const totalCost = aiDecision.shares * price;
      if (state.ai.cash >= totalCost) {
        state.ai.cash -= totalCost;
        state.ai.portfolio[aiDecision.symbol] = (state.ai.portfolio[aiDecision.symbol] || 0) + aiDecision.shares;
        state.ai.trades.push({ symbol: aiDecision.symbol, action: "buy", shares: aiDecision.shares, price, timestamp: Date.now(), reasoning: aiDecision.reasoning });
      }
    } else if (aiDecision.action === "sell" && aiDecision.symbol && aiDecision.shares > 0) {
      if ((state.ai.portfolio[aiDecision.symbol] || 0) >= aiDecision.shares) {
        const price = marketData[aiDecision.symbol]?.c || 0;
        state.ai.cash += aiDecision.shares * price;
        state.ai.portfolio[aiDecision.symbol] -= aiDecision.shares;
        if (state.ai.portfolio[aiDecision.symbol] === 0) delete state.ai.portfolio[aiDecision.symbol];
        state.ai.trades.push({ symbol: aiDecision.symbol, action: "sell", shares: aiDecision.shares, price, timestamp: Date.now(), reasoning: aiDecision.reasoning });
      }
    }

    state.lastAITradeTime = Date.now();
    await kv.set("game_state", state);

    return c.json({ success: true, decision: aiDecision, state });
  } catch (error) {
    console.error("Error getting AI trade decision:", error);
    return c.json({ error: `Failed to get AI decision: ${error}` }, 500);
  }
});

app.post("/make-server-0a8aeca7/calculate-scores", async (c) => {
  try {
    const { marketData } = await c.req.json();
    const state = await kv.get("game_state");
    if (!state) return c.json({ error: "Game not initialized" }, 404);

    const userValue = calculatePortfolioValue(state.user, marketData);
    const aiValue = calculatePortfolioValue(state.ai, marketData);

    state.user.totalValue = userValue;
    state.ai.totalValue = aiValue;

    if (userValue > aiValue) {
      state.scores.userPoints += Math.floor((userValue - aiValue) / 100);
      state.scores.userWins += 1;
    } else if (aiValue > userValue) {
      state.scores.aiWins += 1;
    }

    await kv.set("game_state", state);
    return c.json({
      success: true, userValue, aiValue,
      winner: userValue > aiValue ? "user" : aiValue > userValue ? "ai" : "tie",
      state
    });
  } catch (error) {
    return c.json({ error: `Failed to calculate scores: ${error}` }, 500);
  }
});

function calculatePortfolioValue(player: any, marketData: any): number {
  let totalValue = player.cash;
  for (const [symbol, shares] of Object.entries(player.portfolio)) {
    totalValue += (shares as number) * (marketData[symbol]?.c || 0);
  }
  return totalValue;
}

Deno.serve(app.fetch);