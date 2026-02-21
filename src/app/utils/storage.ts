import { UserData, Achievement } from '../types';

const STORAGE_KEY = 'trade_quest_user_data';

const defaultAchievements: Achievement[] = [
  {
    id: 'first_trade',
    title: 'First Trade',
    description: 'Complete your first stock purchase',
    icon: 'trophy',
    unlocked: false
  },
  {
    id: 'profit_maker',
    title: 'Profit Maker',
    description: 'Sell a stock for a profit',
    icon: 'trending-up',
    unlocked: false
  },
  {
    id: 'diversified',
    title: 'Diversified Portfolio',
    description: 'Own stocks in 3 different sectors',
    icon: 'pie-chart',
    unlocked: false
  },
  {
    id: 'big_spender',
    title: 'Big Spender',
    description: 'Make a single trade worth $50 or more',
    icon: 'dollar-sign',
    unlocked: false
  },
  {
    id: 'day_trader',
    title: 'Day Trader',
    description: 'Complete 10 trades',
    icon: 'zap',
    unlocked: false
  },
  {
    id: 'portfolio_builder',
    title: 'Portfolio Builder',
    description: 'Own shares in 5 different stocks',
    icon: 'briefcase',
    unlocked: false
  }
];

const defaultUserData: UserData = {
  balance: 100,
  portfolio: {},
  transactions: [],
  achievements: defaultAchievements,
  tutorialCompleted: false,
  currentTutorialStep: 0
};

export function getUserData(): UserData {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return defaultUserData;
  }
  
  try {
    const data = JSON.parse(stored);
    // Merge with default achievements in case new ones were added
    const existingAchievementIds = data.achievements?.map((a: Achievement) => a.id) || [];
    const newAchievements = defaultAchievements.filter(
      a => !existingAchievementIds.includes(a.id)
    );
    
    return {
      ...defaultUserData,
      ...data,
      achievements: [...(data.achievements || []), ...newAchievements]
    };
  } catch (e) {
    return defaultUserData;
  }
}

export function saveUserData(data: UserData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function resetUserData(): void {
  localStorage.removeItem(STORAGE_KEY);
}
