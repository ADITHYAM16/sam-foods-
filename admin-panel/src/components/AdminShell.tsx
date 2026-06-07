import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChefHat, ExternalLink, LayoutDashboard, LogOut, Moon, Sun, Users } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

type AdminTab = "dashboard" | "agents";

function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("sam_admin_theme");
    const isDark = stored
      ? stored === "dark"
      : window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", !!isDark);
    setDark(!!isDark);
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("sam_admin_theme", next ? "dark" : "light");
  };
  return { dark, toggle };
}

interface AdminShellProps {
  children: ReactNode;
  activeTab?: AdminTab;
  onNavigate?: (tab: AdminTab) => void;
}

export function AdminShell({ children, activeTab, onNavigate }: AdminShellProps) {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50">
        <div className="glass border-b border-border/60">
          <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 md:px-6">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl gradient-primary shadow-glow">
                <ChefHat className="h-5 w-5 text-primary-foreground" />
              </span>
              <div className="leading-tight">
                <div className="font-[Fraunces] text-lg font-bold tracking-tight">
                  SAM <span className="text-gradient">Admin</span>
                </div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Command Center
                </div>
              </div>
            </div>

            {/* Nav tabs — only for admin */}
            {user?.role === "admin" && onNavigate && (
              <div className="hidden items-center gap-1 rounded-full border border-border bg-background/60 p-1 sm:flex">
                {([
                  { tab: "dashboard" as AdminTab, label: "Dashboard", icon: LayoutDashboard },
                  { tab: "agents" as AdminTab, label: "Agents", icon: Users },
                ] as const).map(({ tab, label, icon: Icon }) => (
                  <button
                    key={tab}
                    onClick={() => onNavigate(tab)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      activeTab === tab
                        ? "gradient-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Status pill */}
            <span className="hidden items-center gap-1.5 rounded-full bg-emerald-600/10 px-3 py-1 text-xs font-semibold text-emerald-600 sm:inline-flex">
              <span className="relative grid h-2 w-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/70" />
                <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Live
            </span>

            {/* View site */}
            <a
              href={window.location.origin.includes("5174") ? window.location.origin.replace("5174", "5173") : window.location.origin}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold transition hover:bg-accent sm:inline-flex"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View Site
            </a>

            {/* Dark mode */}
            <button
              aria-label="Toggle theme"
              onClick={toggle}
              className="rounded-full p-2 hover:bg-accent transition"
            >
              {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* Profile dropdown */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-full border border-border bg-background/60 px-2 py-1.5 hover:bg-accent transition"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-full gradient-primary text-xs font-bold text-primary-foreground">
                    {user.name[0]?.toUpperCase()}
                  </span>
                  <span className="hidden text-sm font-medium md:block">{user.name.split(" ")[0]}</span>
                </button>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-border bg-popover p-2 shadow-elegant"
                  >
                    <div className="px-3 py-2">
                      <div className="text-sm font-semibold">{user.name}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                      <div className="mt-1 inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-primary">
                        {user.role}
                      </div>
                    </div>
                    <hr className="my-1 border-border" />
                    <button
                      onClick={() => { logout(); setMenuOpen(false); }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10 transition"
                    >
                      <LogOut className="h-4 w-4" /> Logout
                    </button>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main>{children}</main>
    </div>
  );
}
