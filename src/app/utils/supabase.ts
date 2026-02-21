import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info.tsx';

export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);