import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { Portfolio } from './pages/Portfolio';
import { Market } from './pages/Market';
import { StockDetail } from './pages/StockDetail';
import { Achievements } from './pages/Achievements';
import { Settings } from './pages/Settings';
import { NotFound } from './pages/NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: Portfolio },
      { path: 'market', Component: Market },
      { path: 'stock/:symbol', Component: StockDetail },
      { path: 'achievements', Component: Achievements },
      { path: 'settings', Component: Settings },
      { path: '*', Component: NotFound }
    ]
  }
]);