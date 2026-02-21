import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';
import { supabase } from './utils/supabase';
import { Session } from '@supabase/supabase-js';
import { Login } from './pages/Login';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { toast } from 'sonner';
import { StocksProvider } from './context/StocksContext';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [gameState, setGameState] = useState<any>(null);
  const [marketData, setMarketData] = useState<any>({});

  const serverUrl = `https://${projectId}.supabase.co/functions/v1/make-server-0a8aeca7`;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    const initGame = async () => {
      try {
        const existingResponse = await fetch(`${serverUrl}/game-state`, {
          headers: { Authorization: `Bearer ${publicAnonKey}` },
        });
        const existingData = await existingResponse.json();
        if (existingData.success) {
          setGameState(existingData.state);
        } else {
          const response = await fetch(`${serverUrl}/init-game`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${publicAnonKey}` },
          });
          const data = await response.json();
          if (data.success) setGameState(data.state);
        }
      } catch (error) {
        toast.error('Failed to initialize game');
      }
    };
    initGame();
  }, [session]);

  useEffect(() => {
    if (!session) return;
    fetchMarketData();
    const interval = setInterval(fetchMarketData, 30000);
    return () => clearInterval(interval);
  }, [session]);

  const fetchMarketData = async () => {
    try {
      const response = await fetch(`${serverUrl}/market-data`, {
        headers: { Authorization: `Bearer ${publicAnonKey}` },
      });
      const result = await response.json();
      if (result.success) setMarketData(result.data);
      else toast.error(result.error || 'Failed to fetch market data');
    } catch {
      toast.error('Failed to fetch market data');
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-500">Loading...</p>
    </div>
  );

  if (!session) return (
    <>
      <Login />
      <Toaster position="top-center" />
    </>
  );

  return (
    <StocksProvider>
      <RouterProvider router={router} />
      <Toaster position="top-center" />
    </StocksProvider>
  );
}