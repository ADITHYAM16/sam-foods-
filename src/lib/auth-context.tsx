import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Role = "customer" | "admin" | "delivery";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: Omit<User, "id"> & { password: string }) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const CACHE_KEY = "sam_user_cache";

function getCached(): User | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function setCached(u: User | null) {
  if (u) localStorage.setItem(CACHE_KEY, JSON.stringify(u));
  else localStorage.removeItem(CACHE_KEY);
}

async function fetchProfile(id: string, email?: string): Promise<User | null> {
  try {
    const { data, error } = await (supabase.from("profiles") as any)
      .select("*").eq("id", id).single();

    if (!error && data) {
      const u: User = { id: data.id, name: data.name, email: data.email, phone: data.phone ?? undefined, role: data.role as Role };
      setCached(u);
      return u;
    }

    // Profile missing — try to create from delivery_agents table
    const { data: agentData } = await (supabase.from("delivery_agents") as any)
      .select("id,name,email,phone").eq("id", id).single();

    if (agentData) {
      await (supabase.from("profiles") as any).upsert({
        id: agentData.id,
        name: agentData.name,
        email: agentData.email,
        phone: agentData.phone ?? null,
        role: "delivery",
      }, { onConflict: "id" });
      const u: User = { id: agentData.id, name: agentData.name, email: agentData.email, phone: agentData.phone ?? undefined, role: "delivery" };
      setCached(u);
      return u;
    }

    console.error("[Auth] Profile fetch error:", error);
    return null;
  } catch (e) { console.error("[Auth] Profile fetch exception:", e); return null; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getCached());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 5000);

    supabase.auth.getSession().then(async ({ data, error }) => {
      if (error) console.error("[Auth] Session error:", error);
      if (data.session?.user) {
        // Use cache immediately, refresh in background
        const cached = getCached();
        if (cached) setUser(cached);
        setLoading(false);
        // Refresh profile in background
        fetchProfile(data.session.user.id, data.session.user.email ?? undefined).then(p => { if (p) setUser(p); });
      } else {
        setCached(null);
        setUser(null);
        setLoading(false);
      }
      clearTimeout(timeout);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const cached = getCached();
        if (cached && cached.id === session.user.id) setUser(cached);
        fetchProfile(session.user.id, session.user.email ?? undefined).then(p => { if (p) setUser(p); });
      } else {
        setCached(null);
        setUser(null);
      }
    });

    return () => { clearTimeout(timeout); sub.subscription.unsubscribe(); };
  }, []);

  const login: AuthContextValue["login"] = async (email, password) => {
    try {
      console.log("[Auth] Attempting login for:", email);
      
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: email.trim(), 
        password 
      });
      
      if (error) {
        console.error("[Auth] Login error:", error);
        throw new Error(error.message);
      }
      
      if (!data.user) {
        throw new Error("Login failed - no user returned");
      }

      console.log("[Auth] Login successful, fetching profile...");
      const profile = await fetchProfile(data.user.id, data.user.email ?? email.trim());
      
      if (!profile) {
        throw new Error("Could not load profile. Please try again.");
      }

      console.log("[Auth] Profile loaded:", profile.email, profile.role);
      setUser(profile);
      return profile;
    } catch (e) {
      console.error("[Auth] Login exception:", e);
      throw e;
    }
  };

  const register: AuthContextValue["register"] = async ({ name, email, phone, password, role }) => {
    try {
      console.log("[Auth] Attempting registration for:", email);
      
      const { data, error } = await supabase.auth.signUp({ 
        email: email.trim(), 
        password,
        options: {
          data: {
            full_name: name,
          }
        }
      });
      
      if (error) {
        console.error("[Auth] Registration error:", error);
        throw new Error(error.message);
      }
      
      if (!data.user) {
        throw new Error("Registration failed - no user returned");
      }

      // Wait briefly for trigger to auto-create profile, then upsert
      await new Promise(r => setTimeout(r, 800));
      const { error: profileError } = await (supabase.from("profiles") as any).upsert({
        id: data.user.id,
        name,
        email: email.trim(),
        phone: phone ?? null,
        role: role ?? "customer",
      }, { onConflict: "id" });
      
      if (profileError) {
        console.error("[Auth] Profile upsert error:", profileError);
        throw new Error(profileError.message);
      }

      const newUser: User = { 
        id: data.user.id, 
        name, 
        email: email.trim(), 
        phone, 
        role: role ?? "customer" 
      };
      
      setUser(newUser);
      return newUser;
    } catch (e) {
      console.error("[Auth] Registration exception:", e);
      throw e;
    }
  };

  const logout = async () => {
    try {
      setCached(null);
      setUser(null);
      await supabase.auth.signOut();
    } catch (e) {
      console.error("[Auth] Logout error:", e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
