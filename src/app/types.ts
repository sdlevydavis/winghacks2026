export interface Stock {
  symbol: string;
  name: string;
  currentPrice: number;
  changePercent: number;
  changeAmount: number;
  historicalData: { time: string; price: number }[];
  description: string;
  sector: string;
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
}

export interface UserData {
  balance: number;
  portfolio: Portfolio;
  transactions: Transaction[];
  achievements: Achievement[];
  tutorialCompleted: boolean;
  currentTutorialStep: number;
  fundsAdded: number; // max 2
}
