import { supabase } from './supabase';
import { UserData, Achievement } from '../types';

const defaultAchievements: Achievement[] = [
  {
    id: 'first_trade',
    title: 'First Trade',
    description: 'Complete your first stock purchase',
    icon: 'trophy',
    unlocked: false,
    reward: 50
  },
  {
    id: 'profit_maker',
    title: 'Profit Maker',
    description: 'Sell a stock for a profit',
    icon: 'trending-up',
    unlocked: false,
    reward: 100
  },
  {
    id: 'diversified',
    title: 'Diversified Portfolio',
    description: 'Own stocks in 3 different sectors',
    icon: 'pie-chart',
    unlocked: false,
    reward: 150
  },
  {
    id: 'big_spender',
    title: 'Big Spender',
    description: 'Make a single trade worth $50 or more',
    icon: 'dollar-sign',
    unlocked: false,
    reward: 100
  },
  {
    id: 'day_trader',
    title: 'Day Trader',
    description: 'Complete 10 trades',
    icon: 'zap',
    unlocked: false,
    reward: 200
  },
  {
    id: 'portfolio_builder',
    title: 'Portfolio Builder',
    description: 'Own shares in 5 different stocks',
    icon: 'briefcase',
    unlocked: false,
    reward: 250
  }
];

export async function getUserData(): Promise<UserData> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not logged in');

  const { data, error } = await supabase
    .from('user_data')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw error;

  // Row doesn't exist yet, create it
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
        funds_added: 0
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return {
      balance: newData.balance,
      portfolio: newData.portfolio,
      transactions: newData.transactions,
      achievements: defaultAchievements,
      tutorialCompleted: newData.tutorial_completed,
      currentTutorialStep: newData.current_tutorial_step,
      shorts: {},
      options: [],
      completedLessons: [],
      claimedArticles: [],
      fundsAdded: newData.funds_added ?? 0
    };
  }

  return {
    balance: data.balance,
    portfolio: data.portfolio,
    transactions: data.transactions,
    achievements: data.achievements?.length ? data.achievements : defaultAchievements,
    tutorialCompleted: data.tutorial_completed,
    currentTutorialStep: data.current_tutorial_step,
    shorts: data.shorts || {},
    options: data.options || [],
    completedLessons: data.completedLessons || [],
    claimedArticles: data.claimedArticles || [],
    fundsAdded: data.funds_added ?? 0
  };
}

export async function saveUserData(userData: UserData): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not logged in');

  const { error } = await supabase
    .from('user_data')
    .update({
      balance: userData.balance,
      portfolio: userData.portfolio,
      transactions: userData.transactions,
      achievements: userData.achievements,
      tutorial_completed: userData.tutorialCompleted,
      current_tutorial_step: userData.currentTutorialStep,
      funds_added: userData.fundsAdded,
      updated_at: new Date().toISOString()
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
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id);

  if (error) throw error;
}
