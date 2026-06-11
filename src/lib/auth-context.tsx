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

async function fetchProfile(id: string, email?: string, displayName?: string): Promise<User | null> {
  try {
    const { data } = await (supabase.from("profiles") as any)
      .select("id,name,email,phone,role").eq("id", id).single();

    if (data) return { id: data.id, name: data.name, email: data.email, phone: data.phone ?? undefined, role: data.role as Role };

    const { data: agent } = await (supabase.from("delivery_agents") as any)
      .select("id,name,email,phone").eq("id", id).single();

    if (agent) {
      await (supabase.from("profiles") as any).upsert(
        { id: agent.id, name: agent.name, email: agent.email, phone: agent.phone ?? null, role: "delivery" },
        { onConflict: "id" }
      );
      return { id: agent.id, name: agent.name, email: agent.email, phone: agent.phone ?? undefined, role: "delivery" };
    }

    if (email) {
      const name = displayName || email.split("@")[0];
      await (supabase.from("profiles") as any).upsert(
        { id, name, email, phone: null, role: "customer" },
        { onConflict: "id" }
      );
      return { id, name, email, role: "customer" };
    }

    return null;
  } catch (e) {
    console.error("[Auth] fetchProfile error:", e);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Prevent onAuthStateChange from overwriting user set by login()
  const skipNextAuthEvent = useRef(false);
  // Track if getSession has resolved so we never show logged-out flash
  const sessionResolved = useRef(false);

  useEffect(() => {
    // On mount: read persisted session synchronously via onAuthStateChange
    // INITIAL_SESSION fires before any render-visible state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      if (!sessionResolved.current) {
        // First event is always INITIAL_SESSION — use it to hydrate user
        sessionResolved.current = true;
        if (session?.user) {
          const profile = await fetchProfile(session.user.id, session.user.email, session.user.user_metadata?.full_name);
          setUser(profile);
        }
        setLoading(false);
        return;
      }

      if (skipNextAuthEvent.current) {
        skipNextAuthEvent.current = false;
        return;
      }
      if (event === "SIGNED_OUT") {
        setUser(null);
      } else if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.user) {
        const profile = await fetchProfile(session.user.id, session.user.email, session.user.user_metadata?.full_name);
        setUser(profile);
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
    // Skip the SIGNED_IN event fired by signInWithPassword — we already have the profile
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
    setUser(newUser);
    return newUser;
  };

  const logout = async () => {
    setUser(null);
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
