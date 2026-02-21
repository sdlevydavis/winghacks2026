import { useState, useEffect } from 'react';
import { X, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'motion/react';

interface TutorialStep {
  title: string;
  description: string;
  highlight?: string;
}

const tutorialSteps: TutorialStep[] = [
  {
    title: 'Welcome to TradeQuest! 🎮',
    description: "You're starting with $1,000 in virtual money. Your goal is to learn how trading works while growing your portfolio. No real money is at risk!"
  },
  {
    title: 'Understanding Stocks 📈',
    description: 'Stocks represent ownership in companies. Their prices go up and down based on demand, news, and company performance. Green means the price went up, red means it went down.'
  },
  {
    title: 'Buying Stocks 🛒',
    description: "To buy a stock, tap on it from the Market tab, enter how many shares you want, and confirm. You'll own those shares and can sell them later."
  },
  {
    title: 'Selling Stocks 💰',
    description: "Sell stocks when their price is higher than what you paid - that's profit! If you sell when the price is lower, you'll take a loss. Timing is key!"
  },
  {
    title: 'Your Portfolio 📊',
    description: 'The Portfolio tab shows all the stocks you own, your total balance, and how much profit or loss you have. Watch it grow!'
  },
  {
    title: 'Achievements & Learning 🏆',
    description: "Complete trades to unlock achievements and learn trading concepts. Have fun and don't worry about making mistakes - it's all practice!"
  }
];

interface TutorialProps {
  currentStep: number;
  onComplete: () => void;
  onSkip: () => void;
}

export function Tutorial({ currentStep, onComplete, onSkip }: TutorialProps) {
  const [step, setStep] = useState(currentStep);
  const currentTutorial = tutorialSteps[step];

  const handleNext = () => {
    if (step < tutorialSteps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  if (!currentTutorial) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="bg-white rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-md shadow-xl"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="text-sm text-gray-500 mb-1">
                Step {step + 1} of {tutorialSteps.length}
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                {currentTutorial.title}
              </h2>
            </div>
            <button
              onClick={handleSkip}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <p className="text-gray-600 mb-6 text-lg leading-relaxed">
            {currentTutorial.description}
          </p>

          <div className="flex gap-3">
            {step > 0 && (
              <Button
                variant="outline"
                onClick={() => setStep(step - 1)}
                className="flex-1"
              >
                Back
              </Button>
            )}
            <Button
              onClick={handleNext}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {step < tutorialSteps.length - 1 ? (
                <>
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              ) : (
                "Let's Trade!"
              )}
            </Button>
          </div>

          <div className="flex gap-1 mt-4 justify-center">
            {tutorialSteps.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 rounded-full transition-all ${
                  index === step
                    ? 'w-8 bg-blue-600'
                    : index < step
                    ? 'w-1.5 bg-blue-300'
                    : 'w-1.5 bg-gray-200'
                }`}
              />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
