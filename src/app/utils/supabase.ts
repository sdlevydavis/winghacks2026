import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info.tsx';

export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);