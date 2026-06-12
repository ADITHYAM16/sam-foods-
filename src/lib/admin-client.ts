import { createClient } from "@supabase/supabase-js";

// Single shared service-role client — import this everywhere instead of
// calling createClient() individually, which was creating multiple
// GoTrueClient instances and causing the browser warning.
export const adminClient = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);
