import { useState, useEffect } from 'react';
import { getUserData, saveUserData } from '../utils/storage';
import { useStocks } from '../context/StocksContext';
import {
  fetchCompanyNews,
  fetchCandles,
  candlesToOhlcData,
  NewsArticle,
  OhlcPoint,
} from '../utils/finnhubApi';
import { UserData, Stock } from '../types';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import {
  BookOpen,
  Coins,
  Newspaper,
  Check,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Sparkles,
  BadgeCheck,
  RefreshCw,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

// ---------------------------------------------------------------------------
// Lesson definitions
// ---------------------------------------------------------------------------
const LESSONS: {
  id: string;
  title: string;
  description: string;
  reward: number;
  content: string[];
  quiz: QuizQuestion[];
}[] = [
  {
    id: 'candlestick_basics',
    title: 'Candlestick Basics',
    description: 'Read price candles — the building block of every chart',
    reward: 75,
    content: [
      'A candlestick shows four prices in one bar: Open, High, Low, and Close (OHLC). The "body" is the rectangle between the open and close. A green body means price closed higher than it opened — bullish. A red body means price closed lower — bearish.',
      'The thin lines above and below (wicks or shadows) show the high and low. A long upper wick means buyers pushed price up but sellers took control. A long lower wick means sellers pushed it down but buyers stepped in.',
      'Common single-candle patterns: Doji (open ≈ close; indecision), Hammer (long lower wick after a downtrend; bullish reversal), Shooting Star (long upper wick after an uptrend; bearish reversal). Engulfing patterns — where a large candle "swallows" the previous one — are among the strongest reversal signals.',
    ],
    quiz: [
      {
        question: 'A green (bullish) candlestick body means the stock...',
        options: [
          'Closed lower than it opened',
          'Closed higher than it opened',
          'Hit a new 52-week high',
          'Had above-average volume',
        ],
        correctIndex: 1,
        explanation:
          'The body spans from open to close. Green = close > open (price went up). Red = close < open (price went down).',
      },
      {
        question: 'A long lower wick on a candlestick typically indicates...',
        options: [
          'Bears dominated the entire session',
          'The stock is about to crash',
          'Sellers pushed price down but buyers stepped back in',
          "The opening price was the day's low",
        ],
        correctIndex: 2,
        explanation:
          'A long lower wick means sellers drove price down during the session, but buyers pushed it back up before the close — a sign of buying interest at lower levels.',
      },
    ],
  },
  {
    id: 'support_resistance',
    title: 'Support & Resistance',
    description: 'Identify price levels where buyers and sellers fight hardest',
    reward: 100,
    content: [
      'Support is a price level where falling prices tend to pause or reverse — buyers outweigh sellers there. Resistance is the opposite: a ceiling where rising prices stall because sellers dominate.',
      'They form because traders remember past turning points. When price revisits a level where it previously bounced, many buyers step in again expecting the same. Three or more touches at the same level — especially on high volume — confirm a significant zone.',
      'Old support often becomes new resistance after it is broken, and vice versa. This "role reversal" is one of the most reliable concepts in technical analysis. Practical use: buy near strong support with a stop-loss just below; take profit near resistance.',
    ],
    quiz: [
      {
        question: 'Support is best described as...',
        options: [
          'A price level where sellers consistently dominate',
          'A price level where buyers tend to step in and halt declines',
          'The 52-week high of a stock',
          'The average daily trading volume',
        ],
        correctIndex: 1,
        explanation:
          'Support is a floor where demand outweighs supply. When price falls to support, more buyers than sellers show up — causing the price to bounce or stall.',
      },
      {
        question:
          'When old support breaks and becomes new resistance, this is called...',
        options: [
          'A dead cat bounce',
          'Role reversal',
          'A double top',
          'A breakout failure',
        ],
        correctIndex: 1,
        explanation:
          'Role reversal means a price level switches its function. Traders who bought at support now have losses at that level, turning it into resistance when price returns.',
      },
    ],
  },
  {
    id: 'trend_lines',
    title: 'Trend Lines & Channels',
    description: 'Draw trend lines to trade in the direction of momentum',
    reward: 75,
    content: [
      'A trend line is a straight line connecting a series of highs or lows. Uptrend line: connect two or more rising lows. As long as price stays above, the uptrend is intact. Downtrend line: connect two or more falling highs.',
      'A channel adds a parallel line on the opposite side, giving a range to trade between. Price tends to bounce between the two lines — buy near the lower rail in an uptrend, sell near the upper rail.',
      'The longer a trend line holds and the more times price touches it, the more significant it is. A break of a trend line on high volume signals a major change in direction. Never force a line to fit — a valid trend line needs at least two clear contact points; three makes it significant.',
    ],
    quiz: [
      {
        question: 'A valid uptrend line connects...',
        options: [
          'A series of declining highs',
          'A series of rising lows',
          "The stock's all-time highs",
          'Moving average crossover points',
        ],
        correctIndex: 1,
        explanation:
          "In an uptrend, price makes higher lows. Connecting these rising lows creates the uptrend line. As long as price stays above this line, the uptrend is considered intact.",
      },
      {
        question: 'A trend line break on high volume typically signals...',
        options: [
          'Normal market noise — ignore it',
          'A brief pause before the trend continues',
          'A potential major change in direction',
          'A good time to add to your existing position',
        ],
        correctIndex: 2,
        explanation:
          'High volume confirms the significance of a move. A trend line break on above-average volume suggests strong conviction — increasing the probability that the trend has genuinely changed.',
      },
    ],
  },
  {
    id: 'moving_averages',
    title: 'Moving Averages',
    description: 'Smooth price noise and spot the true direction of a trend',
    reward: 100,
    content: [
      'A Moving Average (MA) calculates the average closing price over a set number of periods, smoothing out day-to-day noise. Simple Moving Average (SMA) weights all periods equally. The 50-day and 200-day SMAs are the most watched by institutions.',
      'Exponential Moving Average (EMA) gives more weight to recent prices so it reacts faster. Traders often watch the 12-day and 26-day EMAs. When the faster MA crosses the slower one, it signals a shift in momentum.',
      'Golden Cross: the 50-day MA crosses above the 200-day MA — historically a strong bullish signal. Death Cross: the opposite. MAs also act as dynamic support/resistance — in a strong uptrend, price frequently bounces off the 20-day or 50-day MA.',
    ],
    quiz: [
      {
        question: 'A Golden Cross occurs when...',
        options: [
          'The 200-day MA crosses above the 50-day MA',
          'The 50-day MA crosses above the 200-day MA',
          'Price breaks above the 200-day MA',
          'The RSI crosses above 50',
        ],
        correctIndex: 1,
        explanation:
          "The Golden Cross — 50-day crossing above the 200-day — is one of the most-watched bullish signals, indicating short-term momentum is outpacing the long-term trend.",
      },
      {
        question: 'In a strong uptrend, moving averages often act as...',
        options: [
          'Fixed price targets',
          'Dynamic support levels',
          'Resistance levels that price cannot break',
          'Volume indicators',
        ],
        correctIndex: 1,
        explanation:
          'In an uptrend, price frequently pulls back to the 20-day or 50-day MA, finds buyers (support), and bounces higher. These MAs act as "floors" that the trend leans on.',
      },
    ],
  },
  {
    id: 'rsi',
    title: 'Relative Strength Index (RSI)',
    description: 'Measure momentum to spot overbought and oversold conditions',
    reward: 125,
    content: [
      'The RSI is a momentum oscillator ranging from 0 to 100. It measures how fast and how much price has moved recently. RSI above 70 → overbought (the stock may have risen too far, too fast). RSI below 30 → oversold (selling may be exhausted; a bounce could be near).',
      'Divergence is one of the most powerful RSI signals. Bullish divergence: price makes a lower low, but RSI makes a higher low — hidden strength. Bearish divergence: price makes a higher high, but RSI makes a lower high — hidden weakness. Both often precede reversals.',
      'RSI works best in range-bound markets. In a strong trend, RSI can stay above 70 or below 30 for a long time without reversing. Always confirm RSI signals with price action and volume before trading.',
    ],
    quiz: [
      {
        question: 'An RSI reading above 70 typically suggests...',
        options: [
          'The stock is oversold; expect a continued rally',
          'Strong bullish momentum that always continues',
          'The stock may be overbought; a pullback is possible',
          'A guaranteed sell signal',
        ],
        correctIndex: 2,
        explanation:
          'RSI above 70 warns the stock has risen quickly and may be overextended. It is a caution signal, not a guaranteed reversal — especially in strong uptrends where RSI can stay elevated.',
      },
      {
        question: 'Bullish RSI divergence occurs when...',
        options: [
          'Price makes a higher high while RSI makes a lower high',
          'Price makes a lower low while RSI makes a higher low',
          'Both price and RSI are falling together',
          'RSI crosses above the 50 level',
        ],
        correctIndex: 1,
        explanation:
          'Bullish divergence: price hits a new low but RSI does not. Downside momentum is fading even as price still falls — often a sign a reversal is approaching.',
      },
    ],
  },
  {
    id: 'volume',
    title: 'Volume Analysis',
    description: 'Confirm price moves — volume is the footprint of institutions',
    reward: 75,
    content: [
      'Volume is the number of shares traded in a period. It tells you how strong or weak a price move is. Price up + volume up → genuine buying interest. Price up + volume down → weak buying, the move may fade.',
      'Price down + volume up → strong selling pressure. Price down + volume down → exhausted selling; a bounce may be near. Volume spikes (2×–5× average) often mark significant events — earnings, news, or reversals.',
      'On-Balance Volume (OBV) is a running total: add volume on up days, subtract on down days. Rising OBV while price is flat suggests institutions are quietly accumulating — a bullish sign before a price breakout.',
    ],
    quiz: [
      {
        question: 'Price rising on declining volume most likely indicates...',
        options: [
          'Strong, sustained buying with broad participation',
          'Institutional accumulation at current prices',
          'Weak buying momentum — the move may not last',
          'A confirmed breakout from a major pattern',
        ],
        correctIndex: 2,
        explanation:
          'Volume confirms price. A rising price on shrinking volume suggests fewer participants are driving the move — often a sign the rally is losing steam and may reverse.',
      },
      {
        question:
          'On-Balance Volume (OBV) rising while price stays flat suggests...',
        options: [
          'Distribution — institutions are quietly selling',
          'The stock is about to break down significantly',
          'Quiet accumulation — a potential breakout ahead',
          'No meaningful information about future direction',
        ],
        correctIndex: 2,
        explanation:
          'Rising OBV means more volume flows into up days than down days, even if price is flat. This often signals smart money accumulating before a price breakout.',
      },
    ],
  },
  {
    id: 'options_basics',
    title: 'Options: Calls & Puts',
    description: 'Understand the right — not the obligation — to trade',
    reward: 150,
    content: [
      'An option is a contract giving you the right (but not the obligation) to buy or sell a stock at the strike price before expiry. Call: right to BUY. You profit when the stock rises above the strike. Put: right to SELL. You profit when the stock falls below the strike.',
      'The premium is what you pay upfront — your maximum possible loss. Intrinsic value = how far in-the-money (ITM) the option is. Time value = the rest; it decays to zero at expiry (theta decay). The further from expiry, the more time value.',
      'Delta (Δ) measures how much the option price changes per $1 move in the stock. Calls have positive delta (0 to 1); puts have negative delta (0 to −1). An at-the-money option has delta near 0.5. Deep-in-the-money options behave almost like owning the stock (delta ≈ 1).',
    ],
    quiz: [
      {
        question: 'The maximum loss when buying a call option is...',
        options: [
          'Unlimited — the stock can rise to any price',
          'The difference between the strike and current price',
          'The premium paid for the option',
          '50% of the current stock price',
        ],
        correctIndex: 2,
        explanation:
          "When you buy an option, the worst case is it expires worthless. You lose the premium paid — and nothing more. This capped downside is one of options' biggest advantages.",
      },
      {
        question: 'A call option with a Delta of 0.6 means...',
        options: [
          'The option expires in 0.6 years',
          'There is a 60% probability of profit at expiry',
          'For every $1 rise in the stock, the option gains approximately $0.60',
          'The option is 60% in-the-money',
        ],
        correctIndex: 2,
        explanation:
          'Delta measures price sensitivity. A delta of 0.6 means the option moves roughly $0.60 for each $1 move in the underlying stock. It also loosely approximates the probability the option expires ITM.',
      },
    ],
  },
  {
    id: 'short_selling',
    title: 'Short Selling',
    description: 'Profit from falling prices — and understand the real risks',
    reward: 125,
    content: [
      'Short selling lets you profit when a stock falls. You borrow shares, sell at the current price, wait for the price to drop, buy them back cheaper, and return them — pocketing the difference. Example: short at $100, cover at $70 = $30 profit per share.',
      'The risk is asymmetric and theoretically unlimited. A stock can only fall to zero (capped gain for shorts), but it can rise to any price (uncapped loss). A short squeeze occurs when a heavily shorted stock rises sharply, forcing short sellers to cover — driving the price even higher.',
      'Brokers require collateral (margin) as protection against losses. Overnight borrowing fees accumulate while you hold a short position. Always define your maximum loss and use position sizing before entering any short.',
    ],
    quiz: [
      {
        question: 'A short seller profits the most when...',
        options: [
          'The stock price rises as high as possible',
          'The stock price stays exactly flat',
          'The stock price falls as far as possible toward zero',
          'The stock pays a large dividend',
        ],
        correctIndex: 2,
        explanation:
          'Short sellers sell borrowed shares at a high price and buy them back at a lower price. The lower the stock falls, the larger the profit. Maximum profit is achieved if the stock goes to zero.',
      },
      {
        question: 'A short squeeze is triggered by...',
        options: [
          'A company reporting weaker earnings than expected',
          'Rising short interest with no change in stock price',
          'A rising stock forcing short sellers to cover, which drives price even higher',
          'Declining trading volume in a heavily shorted stock',
        ],
        correctIndex: 2,
        explanation:
          'When a shorted stock rises unexpectedly, short sellers rush to buy to limit losses. This buying pressure pushes price higher still, forcing more shorts to cover — a self-reinforcing loop.',
      },
    ],
  },
  {
    id: 'risk_management',
    title: 'Risk Management',
    description: 'The skill that separates long-term traders from one-trade wonders',
    reward: 150,
    content: [
      'Managing risk is the single most important trading skill. Great traders lose on roughly half their trades — they succeed because they lose small and win bigger. The goal is not to be right; it is to make money when you are right more than you lose when you are wrong.',
      'Position sizing: risk at most 1–2% of your total capital on any single trade. With $10,000, that means no more than $100–$200 at risk per trade. Set a stop-loss before entering, not after emotions take over. A stop-loss is a pre-set price at which you exit if the trade moves against you.',
      'Risk/reward ratio: aim to make at least $2–$3 for every $1 you risk. A 1:2 ratio means you can be wrong half the time and still profit. Diversify across sectors and asset types so a single event cannot wipe out your portfolio.',
    ],
    quiz: [
      {
        question: 'The 1–2% position sizing rule means you should...',
        options: [
          "Never risk more than 1–2% of a single trade's face value",
          'Risk 1–2% of your total capital on any single trade',
          'Only hold 1–2 stocks at a time',
          'Allocate 1–2% of trades to options',
        ],
        correctIndex: 1,
        explanation:
          "The rule limits total capital at risk per trade to 1–2%. On a $10,000 portfolio that's $100–$200 maximum loss per trade — ensuring no single loss is catastrophic.",
      },
      {
        question: 'A risk/reward ratio of 1:2 means...',
        options: [
          'You win twice as often as you lose',
          'You risk $1 to potentially make $2',
          'You allocate 50% of capital per trade',
          'You set stop-losses 2% below entry',
        ],
        correctIndex: 1,
        explanation:
          "A 1:2 ratio means for every $1 you're willing to lose, your target profit is $2. With this ratio you only need to be right 34% of the time to break even.",
      },
    ],
  },
  {
    id: 'news_sentiment',
    title: 'News & Market Sentiment',
    description: 'Learn how headlines move prices and how to trade around them',
    reward: 100,
    content: [
      '"Buy the rumor, sell the news" is one of the oldest market sayings. When positive news is expected, traders buy in advance. By the time the news is confirmed, much of the move has already happened — latecomers buy at the top, creating the perfect exit for early buyers.',
      'Earnings reports (4× per year) move stocks sharply. A beat often lifts the stock; a miss hammers it. Even a beat can cause a sell-off if guidance (future outlook) disappoints — this is called "sell the good news." Watch both the number AND the reaction.',
      'Macro events — interest rate decisions, inflation data, jobs reports — move entire sectors. Rising rates typically hurt growth stocks (high-multiple tech); falling rates often boost them. The Fear & Greed Index captures overall market mood and can signal contrarian opportunities.',
    ],
    quiz: [
      {
        question: '"Buy the rumor, sell the news" means...',
        options: [
          'Always buy stocks that appear in news articles',
          'Traders buy on expectations; prices often fall once news is officially confirmed',
          'News articles reliably predict which stocks will rise',
          'Sell all positions before any company announcement',
        ],
        correctIndex: 1,
        explanation:
          "Anticipation drives price. By the time good news is public, buyers who acted on the rumor are exiting. This creates selling pressure right when uninformed traders are buying.",
      },
      {
        question:
          'A stock beats earnings estimates but its price immediately falls. The most likely reason is...',
        options: [
          'The market misunderstood the results',
          'Disappointing forward guidance overshadowed the beat',
          'Large dividend payments reduced share price',
          'A Golden Cross appeared on the chart at the same time',
        ],
        correctIndex: 1,
        explanation:
          '"Sell the good news" often happens when guidance is weak. Even a strong past quarter matters less to investors than what the company expects going forward.',
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Article quiz generator (direction-based)
// ---------------------------------------------------------------------------
function generateArticleQuestions(stock: Stock): QuizQuestion[] {
  const pct = Math.abs(stock.changePercent).toFixed(2);
  const isUp = stock.changePercent >= 0;

  if (isUp) {
    return [
      {
        question: `${stock.symbol} is up ${pct}% today. Which options position profits directly from a rising stock price?`,
        options: [
          'Buying call options',
          'Buying put options',
          'Short selling the stock',
          'Holding cash',
        ],
        correctIndex: 0,
        explanation:
          'Call options give you the right to buy at the strike price. When the stock rises above the strike, calls gain intrinsic value — making them profitable to sell or exercise.',
      },
      {
        question:
          'Positive news often causes prices to move before the official announcement. This is best described by:',
        options: [
          '"Cut your losses, let your winners run"',
          '"Buy the rumor, sell the news"',
          '"Don\'t catch a falling knife"',
          '"The trend is your friend"',
        ],
        correctIndex: 1,
        explanation:
          'Traders anticipate good news and buy in advance. Once confirmed, many sell the fact — which is why stocks sometimes dip right after positive announcements.',
      },
    ];
  } else {
    return [
      {
        question: `${stock.symbol} is down ${pct}% today. Which position profits from a falling stock price?`,
        options: [
          'Buying (owning) shares of the stock',
          'Buying call options on the stock',
          'Short selling the stock',
          'Buying investment-grade bonds',
        ],
        correctIndex: 2,
        explanation:
          'Short sellers borrow shares and sell at a higher price, then buy back cheaper — pocketing the difference. A falling price increases their unrealized profit.',
      },
      {
        question:
          'When a stock drops sharply on bad news, disciplined risk management means prioritizing:',
        options: [
          'Immediately buying more to average your cost down',
          'Checking whether the drop triggered your pre-set stop-loss level',
          'Selling every position across your entire portfolio',
          'Ignoring the news and holding no matter what',
        ],
        correctIndex: 1,
        explanation:
          'A stop-loss is a price level defined in advance where you exit a losing trade. Checking it first removes emotion and prevents a small loss from becoming a large one.',
      },
    ];
  }
}

// ---------------------------------------------------------------------------
// Module-level candle cache (persists for the session)
// ---------------------------------------------------------------------------
const earnCandleCache = new Map<string, OhlcPoint[]>();

const ARTICLE_REWARD = 50;

// ---------------------------------------------------------------------------
// Reusable quiz block
// ---------------------------------------------------------------------------
function QuizBlock({
  questions,
  answers,
  checked,
  onSelect,
  onCheck,
  onRetry,
  onClaim,
  reward,
}: {
  questions: QuizQuestion[];
  answers: (number | null)[];
  checked: boolean;
  onSelect: (qi: number, oi: number) => void;
  onCheck: () => void;
  onRetry: () => void;
  onClaim: () => void;
  reward: number;
}) {
  const allAnswered = answers.every((a) => a !== null);
  const allCorrect =
    checked && questions.every((q, i) => answers[i] === q.correctIndex);

  return (
    <div className="space-y-4 pt-3 border-t mt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        Test Your Knowledge
      </p>
      {questions.map((q, qi) => (
        <div key={qi} className="space-y-2">
          <p className="text-sm font-medium text-gray-800">
            {qi + 1}. {q.question}
          </p>
          <div className="space-y-1.5">
            {q.options.map((opt, oi) => {
              const selected = answers[qi] === oi;
              const isCorrect = oi === q.correctIndex;
              let cls =
                'w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ';
              if (!checked) {
                cls += selected
                  ? 'border-blue-400 bg-blue-50 text-blue-800 font-medium'
                  : 'border-gray-200 hover:bg-gray-50 text-gray-700';
              } else {
                if (isCorrect)
                  cls += 'border-green-400 bg-green-50 text-green-800 font-medium';
                else if (selected) cls += 'border-red-400 bg-red-50 text-red-700';
                else cls += 'border-gray-100 bg-gray-50 text-gray-400';
              }
              return (
                <button
                  key={oi}
                  disabled={checked}
                  onClick={() => onSelect(qi, oi)}
                  className={cls}
                >
                  <span className="font-semibold mr-2">
                    {['A', 'B', 'C', 'D'][oi]}.
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
          {checked && (
            <p
              className={`text-xs px-2 py-1.5 rounded-md leading-snug ${
                answers[qi] === q.correctIndex
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {answers[qi] === q.correctIndex ? '✓ Correct — ' : '✗ Incorrect — '}
              {q.explanation}
            </p>
          )}
        </div>
      ))}

      {!checked ? (
        <Button
          onClick={onCheck}
          disabled={!allAnswered}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          {allAnswered ? 'Check Answers' : 'Answer all questions to continue'}
        </Button>
      ) : allCorrect ? (
        <Button onClick={onClaim} className="w-full bg-green-600 hover:bg-green-700">
          Claim +${reward} Reward
        </Button>
      ) : (
        <Button onClick={onRetry} variant="outline" className="w-full gap-2">
          <RefreshCw className="w-4 h-4" /> Try Again
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export function Earn() {
  const [userData, setUserData] = useState<UserData>(getUserData());
  const { stocks, isLoading: stocksLoading } = useStocks();

  // Lesson dialog
  const [selectedLesson, setSelectedLesson] = useState<(typeof LESSONS)[0] | null>(null);
  const [lessonAnswers, setLessonAnswers] = useState<(number | null)[]>([null, null]);
  const [lessonChecked, setLessonChecked] = useState(false);

  // IAP dialog
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  // Mover data (all articles per stock)
  const [moverItems, setMoverItems] = useState<{ stock: Stock; articles: NewsArticle[] }[]>([]);
  const [moversLoading, setMoversLoading] = useState(true);

  // Expanded mover card + its sparkline
  const [expandedMover, setExpandedMover] = useState<string | null>(null);
  const [moverCandles, setMoverCandles] = useState<OhlcPoint[]>([]);
  const [candlesLoading, setCandlesLoading] = useState(false);

  // Article quiz dialog
  const [selectedArticle, setSelectedArticle] = useState<{
    stock: Stock;
    article: NewsArticle;
  } | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<NewsArticle[]>([]);
  const [articleAnswers, setArticleAnswers] = useState<(number | null)[]>([null, null]);
  const [articleChecked, setArticleChecked] = useState(false);

  const completedLessons = userData.completedLessons ?? [];
  const claimedArticles = userData.claimedArticles ?? [];

  // Fetch top-mover news (all articles per mover)
  useEffect(() => {
    if (stocks.length === 0) return;
    const movers = [...stocks]
      .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))
      .slice(0, 3);

    setMoversLoading(true);
    Promise.allSettled(
      movers.map((stock) =>
        fetchCompanyNews(stock.symbol).then((articles) => ({ stock, articles }))
      )
    ).then((results) => {
      setMoverItems(
        results
          .filter(
            (
              r
            ): r is PromiseFulfilledResult<{
              stock: Stock;
              articles: NewsArticle[];
            }> => r.status === 'fulfilled'
          )
          .map((r) => r.value)
          .filter((item) => item.articles.length > 0)
      );
      setMoversLoading(false);
    });
  }, [stocks]);

  // Fetch 30-day candles when a mover card is expanded
  useEffect(() => {
    if (!expandedMover) {
      setMoverCandles([]);
      return;
    }
    if (earnCandleCache.has(expandedMover)) {
      setMoverCandles(earnCandleCache.get(expandedMover)!);
      return;
    }
    let cancelled = false;
    setCandlesLoading(true);
    setMoverCandles([]);
    fetchCandles(expandedMover)
      .then((data) => {
        if (cancelled) return;
        const points = candlesToOhlcData(data);
        earnCandleCache.set(expandedMover, points);
        setMoverCandles(points);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setCandlesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [expandedMover]);

  // ---- handlers ----
  const openLesson = (lesson: (typeof LESSONS)[0]) => {
    setSelectedLesson(lesson);
    setLessonAnswers([null, null]);
    setLessonChecked(false);
  };

  const openArticle = (
    stock: Stock,
    article: NewsArticle,
    allArticles: NewsArticle[]
  ) => {
    setSelectedArticle({ stock, article });
    setRelatedArticles(allArticles.filter((a) => a.id !== article.id).slice(0, 3));
    setArticleAnswers([null, null]);
    setArticleChecked(false);
  };

  const handleClaimLesson = () => {
    if (!selectedLesson) return;
    const updated: UserData = {
      ...userData,
      balance: userData.balance + selectedLesson.reward,
      completedLessons: [...completedLessons, selectedLesson.id],
    };
    setUserData(updated);
    saveUserData(updated);
    setSelectedLesson(null);
    toast.success(`+$${selectedLesson.reward} earned! Keep learning.`);
  };

  const handlePurchase = () => {
    const updated: UserData = { ...userData, balance: userData.balance + 1000 };
    setUserData(updated);
    saveUserData(updated);
    setPurchaseSuccess(true);
    setTimeout(() => {
      setShowPurchaseDialog(false);
      setPurchaseSuccess(false);
    }, 1800);
    toast.success('+$1,000 added to your account!');
  };

  const handleClaimArticle = () => {
    if (!selectedArticle) return;
    const updated: UserData = {
      ...userData,
      balance: userData.balance + ARTICLE_REWARD,
      claimedArticles: [...claimedArticles, selectedArticle.article.id],
    };
    setUserData(updated);
    saveUserData(updated);
    setSelectedArticle(null);
    toast.success(`+$${ARTICLE_REWARD} earned for staying informed!`);
  };

  const lessonsTotal = LESSONS.reduce((s, l) => s + l.reward, 0);
  const lessonsEarned = LESSONS.filter((l) => completedLessons.includes(l.id)).reduce(
    (s, l) => s + l.reward,
    0
  );

  const articleQuestions = selectedArticle
    ? generateArticleQuestions(selectedArticle.stock)
    : [];

  return (
    <div className="p-4 space-y-6 pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Earn</h1>
        <p className="text-gray-500 text-sm">Three ways to grow your balance</p>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Section 1: Buy Credits                                              */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Coins className="w-5 h-5 text-yellow-500" />
          <h2 className="text-lg font-semibold">Buy Credits</h2>
        </div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-4 bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-900 text-lg">$1,000 TradeQuest Cash</p>
                <p className="text-sm text-gray-500 mt-0.5">Instantly added to your balance</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-yellow-600">$0.99</p>
                <Button
                  size="sm"
                  className="mt-2 bg-yellow-500 hover:bg-yellow-600 text-white text-xs"
                  onClick={() => {
                    setPurchaseSuccess(false);
                    setShowPurchaseDialog(true);
                  }}
                >
                  Buy Now
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Section 2: Learn & Earn                                             */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold">Learn & Earn</h2>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Read each lesson · pass the 2-question quiz ·{' '}
          {completedLessons.length}/{LESSONS.length} done · ${lessonsEarned}/$
          {lessonsTotal} earned
        </p>
        <div className="space-y-2">
          {LESSONS.map((lesson, i) => {
            const done = completedLessons.includes(lesson.id);
            return (
              <motion.div
                key={lesson.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card
                  className={`p-3 transition-all ${
                    done
                      ? 'border-green-200 bg-green-50 opacity-75'
                      : 'cursor-pointer hover:shadow-md hover:border-blue-200'
                  }`}
                  onClick={() => !done && openLesson(lesson)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className={`font-semibold text-sm ${
                            done ? 'text-green-700' : 'text-gray-900'
                          }`}
                        >
                          {lesson.title}
                        </p>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            done
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {done ? 'Done' : `+$${lesson.reward}`}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {lesson.description}
                      </p>
                    </div>
                    {done ? (
                      <BadgeCheck className="w-5 h-5 text-green-500 shrink-0 ml-2" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 ml-2" />
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Section 3: Read to Earn — expandable mover cards with sparklines    */}
      {/* ------------------------------------------------------------------ */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <Newspaper className="w-5 h-5 text-purple-500" />
          <h2 className="text-lg font-semibold">Read to Earn</h2>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          Top movers today · tap a stock to see its chart and articles · answer 2
          questions to earn ${ARTICLE_REWARD} per article
        </p>

        {stocksLoading || moversLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                  <div className="h-6 w-16 bg-gray-200 rounded" />
                </div>
              </Card>
            ))}
          </div>
        ) : moverItems.length === 0 ? (
          <p className="text-sm text-gray-400">No movers available right now.</p>
        ) : (
          <div className="space-y-3">
            {moverItems.map(({ stock, articles }, idx) => {
              const sym = stock.symbol;
              const isExpanded = expandedMover === sym;
              const isUp = stock.changePercent >= 0;
              const claimedCount = articles.filter((a) =>
                claimedArticles.includes(a.id)
              ).length;

              return (
                <motion.div
                  key={sym}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.06 }}
                >
                  <Card
                    className={`overflow-hidden transition-shadow ${
                      isExpanded ? 'shadow-md border-purple-200' : 'hover:shadow-sm'
                    }`}
                  >
                    {/* ---- Collapsed header ---- */}
                    <div
                      className="p-4 flex items-center justify-between cursor-pointer select-none"
                      onClick={() => setExpandedMover(isExpanded ? null : sym)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-900">{sym}</span>
                          <span
                            className={`flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded ${
                              isUp
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {isUp ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            {isUp ? '+' : ''}
                            {stock.changePercent.toFixed(2)}%
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {articles.length} article
                          {articles.length !== 1 ? 's' : ''} ·{' '}
                          {claimedCount}/{articles.length} earned
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-semibold text-gray-900">
                          ${stock.currentPrice.toFixed(2)}
                        </span>
                        <ChevronRight
                          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                            isExpanded ? 'rotate-90' : ''
                          }`}
                        />
                      </div>
                    </div>

                    {/* ---- Expandable body ---- */}
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="border-t bg-gray-50"
                      >
                        {/* 30-day sparkline */}
                        <div className="px-4 pt-3 pb-2">
                          <p className="text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
                            30-day price trend
                          </p>
                          {candlesLoading ? (
                            <div className="h-16 bg-gray-200 rounded animate-pulse" />
                          ) : moverCandles.length > 0 ? (
                            <div className="h-16">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                  data={moverCandles}
                                  margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
                                >
                                  <defs>
                                    <linearGradient
                                      id={`spark_${sym}`}
                                      x1="0"
                                      y1="0"
                                      x2="0"
                                      y2="1"
                                    >
                                      <stop
                                        offset="5%"
                                        stopColor={isUp ? '#16a34a' : '#dc2626'}
                                        stopOpacity={0.35}
                                      />
                                      <stop
                                        offset="95%"
                                        stopColor={isUp ? '#16a34a' : '#dc2626'}
                                        stopOpacity={0}
                                      />
                                    </linearGradient>
                                  </defs>
                                  <Tooltip
                                    content={({ active, payload }) =>
                                      active && payload?.[0] ? (
                                        <div className="bg-white border border-gray-200 rounded px-2 py-1 text-xs shadow">
                                          ${(payload[0].value as number).toFixed(2)}
                                        </div>
                                      ) : null
                                    }
                                  />
                                  <Area
                                    type="monotone"
                                    dataKey="close"
                                    stroke={isUp ? '#16a34a' : '#dc2626'}
                                    fill={`url(#spark_${sym})`}
                                    dot={false}
                                    strokeWidth={2}
                                  />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 text-center py-3">
                              Chart unavailable
                            </p>
                          )}
                        </div>

                        {/* Article list */}
                        <div className="border-t divide-y">
                          {articles.map((article) => {
                            const claimed = claimedArticles.includes(article.id);
                            return (
                              <div
                                key={article.id}
                                className={`px-4 py-3 space-y-1.5 ${claimed ? 'bg-gray-50/60' : 'bg-white'}`}
                              >
                                <p className="text-xs text-gray-400">
                                  {article.source} ·{' '}
                                  {new Date(
                                    article.datetime * 1000
                                  ).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </p>
                                <p
                                  className={`text-sm font-medium leading-snug line-clamp-2 ${
                                    claimed ? 'text-gray-400' : 'text-gray-800'
                                  }`}
                                >
                                  {article.headline}
                                </p>
                                <div className="flex items-center justify-between gap-2 pt-0.5">
                                  <a
                                    href={article.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Full article{' '}
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                  {claimed ? (
                                    <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                                      <Check className="w-3 h-3" /> Earned
                                    </span>
                                  ) : (
                                    <Button
                                      size="sm"
                                      className="h-7 text-xs px-2.5 bg-purple-600 hover:bg-purple-700"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openArticle(stock, article, articles);
                                      }}
                                    >
                                      Read & Earn ${ARTICLE_REWARD}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* IAP Dialog                                                          */}
      {/* ------------------------------------------------------------------ */}
      <Dialog
        open={showPurchaseDialog}
        onOpenChange={(v) => {
          if (!v) {
            setShowPurchaseDialog(false);
            setPurchaseSuccess(false);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Get TradeQuest Cash</DialogTitle>
            <DialogDescription>Demo mode · no real charge is made</DialogDescription>
          </DialogHeader>
          {purchaseSuccess ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <p className="font-semibold text-gray-900">+$1,000 added!</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900">$1,000 Game Cash</p>
                  <p className="text-xs text-gray-500">Instantly credited to your balance</p>
                </div>
                <div className="text-2xl font-bold text-yellow-600">$0.99</div>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Sparkles className="w-4 h-4 text-yellow-400" />
                <span>This is a simulation — no payment is processed</span>
              </div>
              <Button
                onClick={handlePurchase}
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold"
              >
                Purchase $0.99
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------ */}
      {/* Lesson Dialog                                                        */}
      {/* ------------------------------------------------------------------ */}
      <Dialog
        open={!!selectedLesson}
        onOpenChange={(v) => !v && setSelectedLesson(null)}
      >
        <DialogContent className="max-w-sm max-h-[88vh] overflow-y-auto">
          {selectedLesson && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedLesson.title}</DialogTitle>
                <DialogDescription>
                  {selectedLesson.description} · +${selectedLesson.reward} reward
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
                {selectedLesson.content.map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
              <QuizBlock
                questions={selectedLesson.quiz}
                answers={lessonAnswers}
                checked={lessonChecked}
                onSelect={(qi, oi) => {
                  const next = [...lessonAnswers];
                  next[qi] = oi;
                  setLessonAnswers(next);
                }}
                onCheck={() => setLessonChecked(true)}
                onRetry={() => {
                  setLessonAnswers([null, null]);
                  setLessonChecked(false);
                }}
                onClaim={handleClaimLesson}
                reward={selectedLesson.reward}
              />
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------------ */}
      {/* Article Quiz Dialog                                                  */}
      {/* ------------------------------------------------------------------ */}
      <Dialog
        open={!!selectedArticle}
        onOpenChange={(v) => !v && setSelectedArticle(null)}
      >
        <DialogContent className="max-w-sm max-h-[88vh] overflow-y-auto">
          {selectedArticle && (
            <>
              <DialogHeader>
                <DialogTitle className="leading-snug">
                  {selectedArticle.article.headline}
                </DialogTitle>
                <DialogDescription>
                  {selectedArticle.stock.symbol} · {selectedArticle.article.source} ·{' '}
                  {new Date(
                    selectedArticle.article.datetime * 1000
                  ).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </DialogDescription>
              </DialogHeader>

              {/* Article image */}
              {selectedArticle.article.image && (
                <img
                  src={selectedArticle.article.image}
                  alt=""
                  className="w-full rounded-lg object-cover max-h-36"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              )}

              {/* Article summary */}
              <p className="text-sm text-gray-700 leading-relaxed">
                {selectedArticle.article.summary ||
                  'No summary available for this article.'}
              </p>

              {/* External link */}
              <a
                href={selectedArticle.article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
              >
                Read full article <ExternalLink className="w-3 h-3" />
              </a>

              {/* Quiz */}
              <QuizBlock
                questions={articleQuestions}
                answers={articleAnswers}
                checked={articleChecked}
                onSelect={(qi, oi) => {
                  const next = [...articleAnswers];
                  next[qi] = oi;
                  setArticleAnswers(next);
                }}
                onCheck={() => setArticleChecked(true)}
                onRetry={() => {
                  setArticleAnswers([null, null]);
                  setArticleChecked(false);
                }}
                onClaim={handleClaimArticle}
                reward={ARTICLE_REWARD}
              />

              {/* Related articles footer */}
              {relatedArticles.length > 0 && (
                <div className="pt-3 border-t space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    More from {selectedArticle.stock.symbol}
                  </p>
                  {relatedArticles.map((a) => (
                    <a
                      key={a.id}
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-2 text-xs text-blue-600 hover:text-blue-800 group"
                    >
                      <ExternalLink className="w-3 h-3 shrink-0 mt-0.5 text-gray-400 group-hover:text-blue-500" />
                      <span className="line-clamp-2 leading-snug">{a.headline}</span>
                    </a>
                  ))}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
