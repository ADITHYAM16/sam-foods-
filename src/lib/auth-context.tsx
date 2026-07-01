import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
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

const PROFILE_CACHE_KEY = "sam_profile_cache";

function getCachedProfile(id: string): User | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as Record<string, User>;
    return cache[id] ?? null;
  } catch { return null; }
}

function setCachedProfile(user: User) {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    const cache = raw ? JSON.parse(raw) : {};
    cache[user.id] = user;
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(cache));
  } catch {}
}

async function fetchProfile(id: string, email?: string, displayName?: string): Promise<User | null> {
  try {
    const { data } = await (supabase.from("profiles") as any)
      .select("id,name,email,phone,role").eq("id", id).single();

    if (data) {
      const u: User = { id: data.id, name: data.name, email: data.email, phone: data.phone ?? undefined, role: data.role as Role };
      setCachedProfile(u);
      return u;
    }

    const { data: agent } = await (supabase.from("delivery_agents") as any)
      .select("id,name,email,phone").eq("id", id).single();

    if (agent) {
      await (supabase.from("profiles") as any).upsert(
        { id: agent.id, name: agent.name, email: agent.email, phone: agent.phone ?? null, role: "delivery" },
        { onConflict: "id" }
      );
      const u: User = { id: agent.id, name: agent.name, email: agent.email, phone: agent.phone ?? undefined, role: "delivery" };
      setCachedProfile(u);
      return u;
    }

    if (email) {
      const name = displayName || email.split("@")[0];
      await (supabase.from("profiles") as any).upsert(
        { id, name, email, phone: null, role: "customer" },
        { onConflict: "id" }
      );
      const u: User = { id, name, email, role: "customer" };
      setCachedProfile(u);
      return u;
    }

    return null;
  } catch (e) {
    console.error("[Auth] fetchProfile error:", e);
    return null;
  }
}

function getStoredSessionId(): string | null {
  try {
    const raw = localStorage.getItem("sam_auth") ||
      sessionStorage.getItem("sam_auth");
    if (!raw) return null;
    return JSON.parse(raw)?.user?.id ?? null;
  } catch { return null; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const skipNextAuthEvent = useRef(false);
  const sessionResolved = useRef(false);

  const [user, setUser] = useState<User | null>(() => {
    const id = getStoredSessionId();
    return id ? getCachedProfile(id) : null;
  });
  const [loading, setLoading] = useState(() => {
    const id = getStoredSessionId();
    if (!id) return false;
    return getCachedProfile(id) === null;
  });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      if (!sessionResolved.current) {
        sessionResolved.current = true;
        if (session?.user) {
          const cached = getCachedProfile(session.user.id);
          if (cached) {
            setUser(cached);
            setLoading(false);
            fetchProfile(session.user.id, session.user.email, session.user.user_metadata?.full_name)
              .then(fresh => { if (fresh) setUser(fresh); });
          } else {
            const profile = await fetchProfile(session.user.id, session.user.email, session.user.user_metadata?.full_name);
            setUser(profile);
            setLoading(false);
          }
        } else {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      if (skipNextAuthEvent.current) {
        skipNextAuthEvent.current = false;
        return;
      }
      if (event === "SIGNED_OUT") {
        setUser(null);
      } else if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.user) {
        const cached = getCachedProfile(session.user.id);
        if (cached) {
          setUser(cached);
          fetchProfile(session.user.id, session.user.email, session.user.user_metadata?.full_name)
            .then(fresh => { if (fresh) setUser(fresh); });
        } else {
          const profile = await fetchProfile(session.user.id, session.user.email, session.user.user_metadata?.full_name);
          setUser(profile);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login: AuthContextValue["login"] = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error(error.message.includes("Invalid login") ? "Invalid email or password." : error.message);
    if (!data.user) throw new Error("Login failed.");
    const profile = await fetchProfile(data.user.id, data.user.email ?? email.trim(), data.user.user_metadata?.full_name);
    if (!profile) throw new Error("Could not load profile. Please try again.");
    skipNextAuthEvent.current = true;
    setUser(profile);
    return profile;
  };

  const register: AuthContextValue["register"] = async ({ name, email, phone, password, role }) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(), password,
      options: { data: { full_name: name } },
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("Registration failed.");
    await new Promise(r => setTimeout(r, 800));
    const { error: profileError } = await (supabase.from("profiles") as any).upsert(
      { id: data.user.id, name, email: email.trim(), phone: phone ?? null, role: role ?? "customer" },
      { onConflict: "id" }
    );
    if (profileError) throw new Error(profileError.message);
    const newUser: User = { id: data.user.id, name, email: email.trim(), phone, role: role ?? "customer" };
    skipNextAuthEvent.current = true;
    setCachedProfile(newUser);
    setUser(newUser);
    return newUser;
  };

  const logout = async () => {
    setUser(null);
    try { localStorage.removeItem(PROFILE_CACHE_KEY); } catch {}
    await supabase.auth.signOut();
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
