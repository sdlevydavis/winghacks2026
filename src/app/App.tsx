import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';
import { StocksProvider } from './context/StocksContext';

export default function App() {
  return (
    <StocksProvider>
      <RouterProvider router={router} />
      <Toaster position="top-center" />
    </StocksProvider>
  );
}
