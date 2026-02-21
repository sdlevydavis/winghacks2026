import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';
import { StocksProvider } from './context/StocksContext';
import { supabase } from './utils/supabase';
import { Session } from '@supabase/supabase-js';
import { Login } from './pages/Login';
import { LoadingScreen } from './components/LoadingScreen';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showIntro, setShowIntro] = useState(true);

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

  // Auth loads in parallel with the intro so data is ready when video ends
  if (showIntro) return (
    <>
      <LoadingScreen onFinished={() => setShowIntro(false)} />
      <Toaster position="top-center" />
    </>
  );

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