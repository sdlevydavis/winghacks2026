import { useState } from 'react';
import { Trophy, Lock, TrendingUp, DollarSign, PieChart, Zap, Briefcase, CheckCircle } from 'lucide-react';
import { getUserData, saveUserData } from '../utils/storage';
import { Card } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { Button } from '../components/ui/button';
import { motion } from 'motion/react';
import { toast } from 'sonner';

const iconMap: Record<string, any> = {
  trophy: Trophy,
  'trending-up': TrendingUp,
  'dollar-sign': DollarSign,
  'pie-chart': PieChart,
  zap: Zap,
  briefcase: Briefcase
};

export function Achievements() {
  const [userData, setUserData] = useState(getUserData());

  const handleClaim = (id: string) => {
    const updated = { ...userData, achievements: userData.achievements.map(a => a.id === id ? { ...a, claimed: true } : a) };
    const achievement = userData.achievements.find(a => a.id === id)!;
    updated.balance = parseFloat((userData.balance + achievement.reward).toFixed(2));
    setUserData(updated);
    saveUserData(updated);
    toast.success(`Claimed $${achievement.reward} reward for "${achievement.title}"!`);
  };
  
  const unlockedCount = userData.achievements.filter(a => a.unlocked).length;
  const totalCount = userData.achievements.length;
  const progressPercent = (unlockedCount / totalCount) * 100;

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-2xl font-bold mb-2">Achievements</h2>
        <p className="text-gray-600">Track your trading journey</p>
      </div>

      {/* Progress Card */}
      <Card className="p-6 bg-gradient-to-br from-purple-600 to-purple-700 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-white/20 rounded-full">
            <Trophy className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <p className="text-purple-100 text-sm">Progress</p>
            <p className="text-2xl font-bold">
              {unlockedCount} / {totalCount} Unlocked
            </p>
          </div>
        </div>
        <Progress value={progressPercent} className="h-2 bg-purple-800" />
        <p className="text-purple-100 text-sm mt-2">
          {progressPercent.toFixed(0)}% Complete
        </p>
      </Card>

      {/* Achievement List */}
      <div className="space-y-3">
        {userData.achievements.map((achievement, index) => {
          const Icon = iconMap[achievement.icon] || Trophy;
          const unlocked = achievement.unlocked;

          return (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={`p-4 ${unlocked ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200' : 'bg-gray-50'}`}>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-full ${
                    unlocked 
                      ? 'bg-yellow-400 text-yellow-900' 
                      : 'bg-gray-200 text-gray-400'
                  }`}>
                    {unlocked ? (
                      <Icon className="w-6 h-6" />
                    ) : (
                      <Lock className="w-6 h-6" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-semibold ${unlocked ? 'text-gray-900' : 'text-gray-500'}`}>
                        {achievement.title}
                      </h3>
                      {unlocked && (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                    <p className={`text-sm ${unlocked ? 'text-gray-600' : 'text-gray-400'}`}>
                      {achievement.description}
                    </p>
                    <div className="flex items-center justify-between mt-3 gap-2">
                      {unlocked && achievement.unlockedAt && (
                        <p className="text-xs text-gray-500">
                          Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                        </p>
                      )}
                      {!unlocked && achievement.reward > 0 && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">
                          🎁 +${achievement.reward} reward
                        </span>
                      )}
                      {unlocked && achievement.reward > 0 && (
                        achievement.claimed ? (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 ml-auto">
                            ✓ Claimed
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            className="ml-auto bg-amber-500 hover:bg-amber-600 text-white text-xs h-7 px-3"
                            onClick={() => handleClaim(achievement.id)}
                          >
                            Claim ${achievement.reward}
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Tips Card */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Trading Tips
        </h3>
        <ul className="text-sm text-gray-600 space-y-2">
          <li>• Diversify your portfolio across different sectors</li>
          <li>• Don't invest more than you can afford to lose</li>
          <li>• Research companies before buying their stocks</li>
          <li>• Be patient - good investments take time</li>
          <li>• Learn from both profits and losses</li>
        </ul>
      </Card>
    </div>
  );
}
