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

// Service role client no longer needed here — imported from admin-client singleton

const profileCache = new Map<string, User>();

async function fetchProfile(id: string, email?: string): Promise<User | null> {
  if (profileCache.has(id)) return profileCache.get(id)!;
  try {
    const { data, error } = await adminClient.from("profiles").select("*").eq("id", id).single();
    if (error || !data) {
      if (email) {
        const name = email.split("@")[0];
        await adminClient.from("profiles").upsert({ id, name, email, role: "admin" }, { onConflict: "id" });
        const { data: created } = await adminClient.from("profiles").select("*").eq("id", id).single();
        if (!created) return null;
        const u: User = { id: created.id, name: created.name, email: created.email, phone: created.phone ?? undefined, role: created.role as Role };
        profileCache.set(id, u);
        return u;
      }
      return null;
    }
    const u: User = { id: data.id, name: data.name, email: data.email, phone: data.phone ?? undefined, role: data.role as Role };
    profileCache.set(id, u);
    return u;
  } catch (e) { console.error("[Auth] Profile fetch exception:", e); return null; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // onAuthStateChange fires INITIAL_SESSION synchronously from localStorage
    // on page load — this is the single source of truth, no getSession() needed.
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const su = session.user;
        const profile = await fetchProfile(su.id, su.email ?? undefined);
        setUser(profile);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => { sub.subscription.unsubscribe(); };
  }, []);

  const login: AuthContextValue["login"] = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("Login failed - no user returned");
    profileCache.delete(data.user.id); // bust cache so fresh profile is fetched
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
    setUser(newUser);
    return newUser;
  };

  const logout = async () => {
    setUser(null);
    profileCache.clear();
    await supabase.auth.signOut();
    // Clear both storages so no tab inherits a stale session after logout
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
