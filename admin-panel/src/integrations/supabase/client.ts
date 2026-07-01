<<<<<<< HEAD
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Custom storage: tab-isolated (sessionStorage) with refresh persistence (localStorage).
// - Reads from sessionStorage first (tab-isolated)
// - Falls back to localStorage on first load (page refresh restores session)
// - Writes to BOTH so refresh works, but a new tab starts fresh
const tabStorage = {
  getItem: (key: string): string | null => {
    const ss = window.sessionStorage.getItem(key);
    if (ss) return ss;
    // Restore from localStorage on refresh, then lock it to this tab
    const ls = window.localStorage.getItem(key);
    if (ls) window.sessionStorage.setItem(key, ls);
    return ls;
  },
  setItem: (key: string, value: string) => {
    window.sessionStorage.setItem(key, value);
    window.localStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    window.sessionStorage.removeItem(key);
    window.localStorage.removeItem(key);
  },
};

function createSupabaseClient() {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
  const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ["SUPABASE_URL"] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ["SUPABASE_PUBLISHABLE_KEY"] : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(", ")}. Please check your .env file.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: typeof window !== "undefined" ? tabStorage : undefined,
      storageKey: "sam_admin_auth",
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
=======
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'sam_auth',
>>>>>>> 00a018a6c6bfc2b51ad8c29883f26fc69c76f74b
  },
});
