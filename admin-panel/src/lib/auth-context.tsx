import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { adminClient } from "@/lib/admin-client";

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

// Read/write a tiny profile cache in localStorage so refresh is instant
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

function clearProfileCache() {
  localStorage.removeItem(PROFILE_CACHE_KEY);
}

async function fetchProfile(id: string, email?: string): Promise<User | null> {
  try {
    const { data, error } = await adminClient.from("profiles").select("*").eq("id", id).single();
    if (error || !data) {
      if (email) {
        const name = email.split("@")[0];
        await adminClient.from("profiles").upsert({ id, name, email, role: "admin" }, { onConflict: "id" });
        const { data: created } = await adminClient.from("profiles").select("*").eq("id", id).single();
        if (!created) return null;
        const u: User = { id: created.id, name: created.name, email: created.email, phone: created.phone ?? undefined, role: created.role as Role };
        setCachedProfile(u);
        return u;
      }
      return null;
    }
    const u: User = { id: data.id, name: data.name, email: data.email, phone: data.phone ?? undefined, role: data.role as Role };
    setCachedProfile(u);
    return u;
  } catch (e) { console.error("[Auth] Profile fetch exception:", e); return null; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Seed state synchronously from localStorage cache so the UI shows instantly
  const [user, setUser] = useState<User | null>(() => {
    try {
      // Read the stored session to find the current user id without a network call
      const sessionRaw =
        window.sessionStorage.getItem("sam_admin_auth") ||
        window.localStorage.getItem("sam_admin_auth");
      if (!sessionRaw) return null;
      const session = JSON.parse(sessionRaw);
      const id: string | undefined = session?.user?.id;
      if (!id) return null;
      return getCachedProfile(id);
    } catch { return null; }
  });
  // loading=false immediately if we already have a cached user, otherwise wait
  const [loading, setLoading] = useState(() => {
    try {
      const sessionRaw =
        window.sessionStorage.getItem("sam_admin_auth") ||
        window.localStorage.getItem("sam_admin_auth");
      if (!sessionRaw) return false; // no session → go straight to login
      const session = JSON.parse(sessionRaw);
      const id: string | undefined = session?.user?.id;
      if (!id) return false;
      return getCachedProfile(id) === null; // still loading only if no cache
    } catch { return false; }
  });

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const su = session.user;
        // Use cache first for instant render, then revalidate in background
        const cached = getCachedProfile(su.id);
        if (cached) {
          setUser(cached);
          setLoading(false);
          // Background revalidation — updates cache silently
          fetchProfile(su.id, su.email ?? undefined).then(fresh => {
            if (fresh) setUser(fresh);
          });
        } else {
          const profile = await fetchProfile(su.id, su.email ?? undefined);
          setUser(profile);
          setLoading(false);
        }
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => { sub.subscription.unsubscribe(); };
  }, []);

  const login: AuthContextValue["login"] = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("Login failed - no user returned");
    clearProfileCache();
    const profile = await fetchProfile(data.user.id, data.user.email ?? email.trim());
    if (!profile) throw new Error("Could not load profile. Please try again.");
    setUser(profile);
    return profile;
  };

  const register: AuthContextValue["register"] = async ({ name, email, phone, password, role }) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(), password,
      options: { data: { full_name: name } },
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("Registration failed - no user returned");
    await new Promise(r => setTimeout(r, 800));
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: data.user.id, name, email: email.trim(), phone: phone ?? null, role: role ?? "customer",
    }, { onConflict: "id" });
    if (profileError) throw new Error(profileError.message);
    const newUser: User = { id: data.user.id, name, email: email.trim(), phone, role: role ?? "customer" };
    setCachedProfile(newUser);
    setUser(newUser);
    return newUser;
  };

  const logout = async () => {
    setUser(null);
    clearProfileCache();
    await supabase.auth.signOut();
    window.sessionStorage.removeItem("sam_admin_auth");
    window.localStorage.removeItem("sam_admin_auth");
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
