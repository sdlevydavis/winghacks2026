import { Outlet, Link, useLocation } from 'react-router';
import { Home, TrendingUp, Trophy, Settings, Brain } from 'lucide-react';

export function Layout() {
  const location = useLocation();

const navItems = [
  { path: '/', icon: Home, label: 'Portfolio' },
  { path: '/market', icon: TrendingUp, label: 'Market' },
  { path: '/trade', icon: Brain, label: 'AI Trade' },
  { path: '/achievements', icon: Trophy, label: 'Achievements' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-full mx-auto px-4 sm:px-8 py-4">
          <h1 className="text-xl font-semibold text-gray-900">TradeQuest</h1>
          <p className="text-sm text-gray-500">Learn trading, have fun!</p>
        </div>
      </header>

      {/* max-w-full = 1280px — fills a laptop, still works on phone */}
      <main className="max-w-full mx-auto px-0 sm:px-8">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20">
        <div className="max-w-full mx-auto flex justify-around">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex flex-col items-center py-2 px-3 flex-1 ${
                  isActive ? 'text-blue-600' : 'text-gray-600'
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs mt-1">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}