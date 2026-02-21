export interface Stock {
  symbol: string;
  name: string;
  currentPrice: number;
  changePercent: number;
  changeAmount: number;
  historicalData: { time: string; price: number }[];
  description: string;
  sector: string;
  assetType: 'Stock' | 'ETF';
}

export interface Portfolio {
  [symbol: string]: {
    shares: number;
    averagePrice: number;
  };
}

export interface Transaction {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  shares: number;
  price: number;
  timestamp: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: number;
  reward: number;   // cash credited to balance when claimed
  claimed?: boolean; // true once the player has claimed the reward
}

export interface ShortPosition {
  shares: number;
  borrowPrice: number;   // price per share when shorted
  collateral: number;    // total collateral locked (= borrowPrice * shares)
  timestamp: number;
}

export interface OptionContract {
  id: string;
  symbol: string;
  type: 'call' | 'put';
  strikePrice: number;
  premium: number;       // total premium paid
  contracts: number;     // number of shares represented
  expiresAt: number;     // ms timestamp
  status: 'open' | 'exercised' | 'expired';
  purchasedAt: number;
}

export interface UserData {
  balance: number;
  portfolio: Portfolio;
  transactions: Transaction[];
  achievements: Achievement[];
  tutorialCompleted: boolean;
  currentTutorialStep: number;
  shorts: { [symbol: string]: ShortPosition };
  options: OptionContract[];
  completedLessons: string[];
  claimedArticles: number[];
}
