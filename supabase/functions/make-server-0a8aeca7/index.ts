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
    const body = await c.req.json().catch(() => ({}));
    const startingBalance = body.startingBalance || 1000;
    // AI always starts with 10000 for a fair challenge regardless of user balance
    const AI_STARTING_BALANCE = 10000;
    const initialState = {
      user: { cash: startingBalance, portfolio: {}, totalValue: startingBalance, trades: [] },
      ai: { cash: AI_STARTING_BALANCE, portfolio: {}, totalValue: AI_STARTING_BALANCE, trades: [] },
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

    const prices = Object.entries(marketData).map(([s, d]: any) => `${s}: $${d.c}`).join(", ");
    const cash = state.ai.cash.toFixed(2);
    const holdings = Object.entries(state.ai.portfolio).map(([s, n]) => `${s}: ${n} shares`).join(", ") || "none";

    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

    const prompt = `You are an aggressive stock trading AI with $${cash} cash.
Current holdings: ${holdings}
Current prices: ${prices}

You MUST make a trade (buy or sell). Do NOT hold. Pick the best opportunity.
- If you have cash, BUY shares in a stock you don't own yet or want more of.
- If you have holdings, consider selling if you can profit or rebalance.
- Buy as many shares as makes sense (at least 1, up to 20% of cash value).

Respond ONLY with JSON: {"action":"buy","symbol":"AAPL","shares":5,"reasoning":"brief reason"}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiApiKey,
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 150,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", errorText);
      return c.json({ error: `Gemini API error: ${errorText}` }, 500);
    }

    const data = await response.json();
    console.log("RAW GEMINI RESPONSE:", JSON.stringify(data));

    // Extract text from response — handle both direct text and function call formats
    const aiResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log("GEMINI TEXT:", aiResponseText);

    let aiDecision: any = null;

    if (aiResponseText) {
      // Strip markdown code fences if present
      const cleaned = aiResponseText.replace(/```json\n?|\n?```/g, "").trim();
      try {
        aiDecision = JSON.parse(cleaned);
      } catch (parseError) {
        console.error("Failed to parse Gemini response:", cleaned);
      }
    }

    // Rule-based fallback: always make a real trade
    if (!aiDecision || aiDecision.action === "hold" || !aiDecision.symbol || !(aiDecision.shares > 0)) {
      console.log("Using rule-based fallback for AI trade");
      const symbolList = Object.keys(marketData);

      // Prefer symbols the AI doesn't own yet
      const unowned = symbolList.filter(s => !state.ai.portfolio[s]);
      const targetSymbol = unowned.length > 0
        ? unowned[Math.floor(Math.random() * unowned.length)]
        : symbolList[Math.floor(Math.random() * symbolList.length)];

      const price = marketData[targetSymbol]?.c || 1;
      // Buy up to 15% of available cash
      const affordableShares = Math.max(1, Math.floor((state.ai.cash * 0.15) / price));

      if (state.ai.cash >= price) {
        aiDecision = {
          action: "buy",
          symbol: targetSymbol,
          shares: affordableShares,
          reasoning: "Diversifying portfolio with available cash"
        };
      } else if (Object.keys(state.ai.portfolio).length > 0) {
        // Sell something if no cash
        const ownedSymbol = Object.keys(state.ai.portfolio)[0];
        const ownedShares = state.ai.portfolio[ownedSymbol];
        aiDecision = {
          action: "sell",
          symbol: ownedSymbol,
          shares: Math.max(1, Math.floor(ownedShares / 2)),
          reasoning: "Raising cash by selling partial position"
        };
      } else {
        aiDecision = { action: "hold", symbol: null, shares: 0, reasoning: "Insufficient funds" };
      }
    }

    // Execute the AI trade
    if (aiDecision.action === "buy" && aiDecision.symbol && aiDecision.shares > 0) {
      const price = marketData[aiDecision.symbol]?.c || 0;
      const totalCost = aiDecision.shares * price;
      if (state.ai.cash >= totalCost && price > 0) {
        state.ai.cash -= totalCost;
        state.ai.portfolio[aiDecision.symbol] = (state.ai.portfolio[aiDecision.symbol] || 0) + aiDecision.shares;
        state.ai.trades.push({
          symbol: aiDecision.symbol,
          action: "buy",
          shares: aiDecision.shares,
          price,
          timestamp: Date.now(),
          reasoning: aiDecision.reasoning
        });
      } else {
        console.log(`AI buy failed: cash=${state.ai.cash}, cost=${totalCost}`);
        // Adjust shares to what AI can afford
        const affordableShares = Math.floor(state.ai.cash / price);
        if (affordableShares > 0) {
          const adjustedCost = affordableShares * price;
          state.ai.cash -= adjustedCost;
          state.ai.portfolio[aiDecision.symbol] = (state.ai.portfolio[aiDecision.symbol] || 0) + affordableShares;
          aiDecision.shares = affordableShares;
          state.ai.trades.push({
            symbol: aiDecision.symbol,
            action: "buy",
            shares: affordableShares,
            price,
            timestamp: Date.now(),
            reasoning: aiDecision.reasoning + " (adjusted for available cash)"
          });
        }
      }
    } else if (aiDecision.action === "sell" && aiDecision.symbol && aiDecision.shares > 0) {
      const availableShares = state.ai.portfolio[aiDecision.symbol] || 0;
      const sharesToSell = Math.min(aiDecision.shares, availableShares);
      if (sharesToSell > 0) {
        const price = marketData[aiDecision.symbol]?.c || 0;
        state.ai.cash += sharesToSell * price;
        state.ai.portfolio[aiDecision.symbol] -= sharesToSell;
        if (state.ai.portfolio[aiDecision.symbol] === 0) delete state.ai.portfolio[aiDecision.symbol];
        aiDecision.shares = sharesToSell;
        state.ai.trades.push({
          symbol: aiDecision.symbol,
          action: "sell",
          shares: sharesToSell,
          price,
          timestamp: Date.now(),
          reasoning: aiDecision.reasoning
        });
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