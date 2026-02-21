import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { Portfolio } from './pages/Portfolio';
import { Market } from './pages/Market';
import { StockDetail } from './pages/StockDetail';
import { Achievements } from './pages/Achievements';
import { Earn } from './pages/Earn';
import { Settings } from './pages/Settings';
import { NotFound } from './pages/NotFound';
import { TradeWrapper } from './pages/TradeWrapper'; // 👈 add this

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: Portfolio },
      { path: 'market', Component: Market },
      { path: 'trade', Component: TradeWrapper }, // 👈 add this
      { path: 'stock/:symbol', Component: StockDetail },
      { path: 'achievements', Component: Achievements },
      { path: 'earn', Component: Earn },
      { path: 'settings', Component: Settings },
      { path: '*', Component: NotFound }
    ]
  }
]);