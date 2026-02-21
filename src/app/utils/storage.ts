import { supabase } from './supabase';
import { UserData, Achievement } from '../types';

const defaultAchievements: Achievement[] = [
  { id: 'first_trade', title: 'First Trade', description: 'Complete your first stock purchase', icon: 'trophy', unlocked: false, reward: 50 },
  { id: 'profit_maker', title: 'Profit Maker', description: 'Sell a stock for a profit', icon: 'trending-up', unlocked: false, reward: 100 },
  { id: 'diversified', title: 'Diversified Portfolio', description: 'Own stocks in 3 different sectors', icon: 'pie-chart', unlocked: false, reward: 150 },
  { id: 'big_spender', title: 'Big Spender', description: 'Make a single trade worth $50 or more', icon: 'dollar-sign', unlocked: false, reward: 100 },
  { id: 'day_trader', title: 'Day Trader', description: 'Complete 10 trades', icon: 'zap', unlocked: false, reward: 200 },
  { id: 'portfolio_builder', title: 'Portfolio Builder', description: 'Own shares in 5 different stocks', icon: 'briefcase', unlocked: false, reward: 250 },
];

const defaultUserData: UserData = {
  balance: 1000,
  portfolio: {},
  transactions: [],
  achievements: defaultAchievements,
  tutorialCompleted: false,
  currentTutorialStep: 0,
  fundsAdded: 0,
  shorts: {},
  options: [],
  completedLessons: [],
  claimedArticles: [],
};

/** Sanitize portfolio holdings — ensures no null numeric fields reach the UI */
function sanitizePortfolio(portfolio: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [symbol, holding] of Object.entries(portfolio ?? {})) {
    clean[symbol] = {
      ...holding,
      shares: holding.shares ?? 0,
      averagePrice: holding.averagePrice ?? holding.average_price ?? 0,
    };
  }
  return clean;
}

/** Sanitize shorts — ensures no null numeric fields */
function sanitizeShorts(shorts: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [symbol, short] of Object.entries(shorts ?? {})) {
    clean[symbol] = {
      ...short,
      shares: short.shares ?? 0,
      borrowPrice: short.borrowPrice ?? short.borrow_price ?? 0,
    };
  }
  return clean;
}

/** Sanitize options — ensures no null numeric fields */
function sanitizeOptions(options: any[]): any[] {
  return (options ?? []).map(o => ({
    ...o,
    strikePrice: o.strikePrice ?? o.strike_price ?? 0,
    contracts: o.contracts ?? 0,
    premium: o.premium ?? 0,
    expiresAt: o.expiresAt ?? o.expires_at ?? 0,
  }));
}

/** Sanitize transactions — ensures price is never null */
function sanitizeTransactions(transactions: any[]): any[] {
  return (transactions ?? []).map(t => ({
    ...t,
    price: t.price ?? 0,
    shares: t.shares ?? 0,
    total: t.total ?? 0,
  }));
}

export async function getUserData(): Promise<UserData> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not logged in');

  const { data, error } = await supabase
    .from('user_data')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw error;

  // Row doesn't exist yet — create it
  if (!data) {
    const { data: newData, error: insertError } = await supabase
      .from('user_data')
      .insert({
        id: user.id,
        balance: 1000.00,
        portfolio: {},
        transactions: [],
        achievements: defaultAchievements,
        tutorial_completed: false,
        current_tutorial_step: 0,
        funds_added: 0,
        shorts: {},
        options: [],
        completed_lessons: [],
        claimed_articles: [],
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return {
      ...defaultUserData,
      balance: newData.balance ?? 1000,
      portfolio: sanitizePortfolio(newData.portfolio),
      transactions: sanitizeTransactions(newData.transactions),
      achievements: defaultAchievements,
      tutorialCompleted: newData.tutorial_completed ?? false,
      currentTutorialStep: newData.current_tutorial_step ?? 0,
      fundsAdded: newData.funds_added ?? 0,
    };
  }

  // Merge any new achievement IDs from defaultAchievements that don't exist yet in saved data
  const savedIds = new Set((data.achievements || []).map((a: Achievement) => a.id));
  const newAchievements = defaultAchievements.filter(a => !savedIds.has(a.id));

  return {
    ...defaultUserData,
    balance: data.balance ?? 1000,
    portfolio: sanitizePortfolio(data.portfolio),
    transactions: sanitizeTransactions(data.transactions),
    achievements: data.achievements?.length
      ? [...data.achievements, ...newAchievements]
      : defaultAchievements,
    tutorialCompleted: data.tutorial_completed ?? false,
    currentTutorialStep: data.current_tutorial_step ?? 0,
    fundsAdded: data.funds_added ?? 0,
    shorts: sanitizeShorts(data.shorts),
    options: sanitizeOptions(data.options),
    completedLessons: data.completed_lessons ?? data.completedLessons ?? [],
    claimedArticles: data.claimed_articles ?? data.claimedArticles ?? [],
  };
}

export async function saveUserData(userData: UserData): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not logged in');

  const { error } = await supabase
    .from('user_data')
    .update({
      balance: userData.balance ?? 0,
      portfolio: sanitizePortfolio(userData.portfolio),
      transactions: sanitizeTransactions(userData.transactions),
      achievements: userData.achievements,
      tutorial_completed: userData.tutorialCompleted ?? false,
      current_tutorial_step: userData.currentTutorialStep ?? 0,
      funds_added: userData.fundsAdded ?? 0,
      shorts: sanitizeShorts(userData.shorts),
      options: sanitizeOptions(userData.options),
      completed_lessons: userData.completedLessons ?? [],
      claimed_articles: userData.claimedArticles ?? [],
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) throw error;
}

export async function resetUserData(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not logged in');

  const { error } = await supabase
    .from('user_data')
    .update({
      balance: 1000,
      portfolio: {},
      transactions: [],
      achievements: defaultAchievements,
      tutorial_completed: false,
      current_tutorial_step: 0,
      funds_added: 0,
      shorts: {},
      options: [],
      completed_lessons: [],
      claimed_articles: [],
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) throw error;
}