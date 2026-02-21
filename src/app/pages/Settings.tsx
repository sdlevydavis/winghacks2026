import { useState, useEffect } from 'react';
import { RotateCcw, HelpCircle, BookOpen, AlertTriangle, LogOut } from 'lucide-react';
import { resetUserData, getUserData, saveUserData } from '../utils/storage';
import { supabase } from '../utils/supabase';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { toast } from 'sonner';
import { UserData } from '../types';

export function Settings() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserData().then(data => {
      setUserData(data);
      setLoading(false);
    }).catch(() => {
      toast.error('Failed to load user data');
      setLoading(false);
    });
  }, []);

  const handleReset = async () => {
    try {
      await resetUserData();
      toast.success('Account reset! Starting fresh with $1000');
      setShowResetDialog(false);
      const fresh = await getUserData();
      setUserData(fresh);
    } catch {
      toast.error('Failed to reset account');
    }
  };

  const handleRestartTutorial = async () => {
    if (!userData) return;
    try {
      const updated = { ...userData, tutorialCompleted: false, currentTutorialStep: 0 };
      await saveUserData(updated);
      setUserData(updated);
      toast.success('Tutorial reset! Go to Portfolio to start over');
    } catch {
      toast.error('Failed to reset tutorial');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) return (
    <div className="p-4 flex items-center justify-center min-h-48">
      <p className="text-gray-500">Loading...</p>
    </div>
  );

  if (!userData) return null;

  const totalPortfolioValue = Object.values(userData.portfolio).reduce(
    (sum, holding) => sum + holding.shares * holding.averagePrice, 0
  );

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-2xl font-bold mb-2">Settings</h2>
        <p className="text-gray-600">Manage your account and preferences</p>
      </div>

      {/* Account Overview */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Account Overview</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Total Balance:</span>
            <span className="font-medium">${(userData.balance + totalPortfolioValue).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Total Trades:</span>
            <span className="font-medium">{userData.transactions.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Achievements:</span>
            <span className="font-medium">
              {userData.achievements.filter(a => a.unlocked).length} / {userData.achievements.length}
            </span>
          </div>
        </div>
      </Card>

      {/* Learning */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Learning</h3>
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={handleRestartTutorial}
        >
          <BookOpen className="w-5 h-5 mr-3" />
          Restart Tutorial
        </Button>
      </Card>

      {/* Help */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="font-semibold mb-2">How TradeQuest Works</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              TradeQuest is a risk-free environment to learn stock trading. All trades use virtual money,
              so you can practice without fear of losing real funds. Use this app to understand market
              mechanics, develop strategies, and build confidence before trading with real money.
            </p>
          </div>
        </div>
      </Card>

      {/* Important Notice */}
      <Card className="p-4 bg-amber-50 border-amber-200">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <h3 className="font-semibold mb-2">Educational Purpose Only</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Stock prices in this app are simulated and don't reflect real market conditions.
              This is a learning tool, not investment advice. Always do thorough research and
              consider consulting a financial advisor before investing real money.
            </p>
          </div>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="p-4 border-red-200">
        <h3 className="font-semibold mb-3 text-red-600">Danger Zone</h3>
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start text-red-600 border-red-300 hover:bg-red-50"
            onClick={() => setShowResetDialog(true)}
          >
            <RotateCcw className="w-5 h-5 mr-3" />
            Reset Account
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start text-gray-600"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5 mr-3" />
            Log Out
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Reset will delete all your data and start fresh with $1000
        </p>
      </Card>

      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset Account?</DialogTitle>
            <DialogDescription>
              This will permanently delete all your portfolio data, transaction history, and achievements.
              You'll start fresh with $1000.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowResetDialog(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReset}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              Reset Account
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="text-center text-sm text-gray-500 py-8">
        <p>TradeQuest v1.0</p>
        <p className="mt-1">Made for learning traders</p>
      </div>
    </div>
  );
}