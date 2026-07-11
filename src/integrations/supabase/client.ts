import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Fallbacks ensure SSR never receives undefined (import.meta.env is client-only in TanStack Start)
const SUPABASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  'https://oorfedydkprtxzkqaphp.supabase.co';

const SUPABASE_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vcmZlZHlka3BydHh6a3FhcGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNDg1NjcsImV4cCI6MjA5NTYyNDU2N30.hY5ejALqQ20oOf1hd1qpIfCQi_jb132vq12admnku-c';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'sam_auth',
  },
});
