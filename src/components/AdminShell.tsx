import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, LayoutDashboard, LogOut, Menu, Moon, Sun, Users, UtensilsCrossed, X, Bike, Bell, History } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

type AdminTab = "dashboard" | "agents" | "bulk-orders" | "delivery";

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
  onDeliveryTabChange?: (tab: "requests" | "deliveries" | "history") => void;
  activeDeliveryTab?: "requests" | "deliveries" | "history";
  pendingBulk?: number;
}

const ADMIN_NAV_ITEMS = [
  { tab: "dashboard" as AdminTab, label: "Dashboard", icon: LayoutDashboard },
  { tab: "agents" as AdminTab, label: "Agents", icon: Users },
  { tab: "bulk-orders" as AdminTab, label: "Bulk Orders", icon: UtensilsCrossed },
] as const;

export function AdminShell({ children, activeTab, onNavigate, onDeliveryTabChange, activeDeliveryTab = "deliveries", pendingBulk = 0 }: AdminShellProps) {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!drawerOpen) return;
    const handler = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setDrawerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [drawerOpen]);

  const siteUrl = window.location.origin;

  const isAdmin = user?.role === "admin";
  const isDelivery = user?.role === "delivery";
  const navItems = isAdmin ? ADMIN_NAV_ITEMS : [];
  const showAdminNav = isAdmin && onNavigate;
  const showDeliveryViews = isDelivery;

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <header className="sticky top-0 z-50">
        <div className="glass border-b border-border/60">
          <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 md:px-6">

            {(showAdminNav || showDeliveryViews) && (
              <button
                onClick={() => setDrawerOpen(true)}
                className="grid h-9 w-9 place-items-center rounded-xl hover:bg-accent transition md:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}

            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-full overflow-hidden shadow-glow">
                <img src="/logo.png.jpeg" alt="SAM Foods" className="h-9 w-9 rounded-full object-cover" />
              </span>
              <div className="leading-tight">
                <div className="font-[Fraunces] text-lg font-bold tracking-tight">
                  SAM <span className="text-gradient">{isDelivery ? "Delivery" : "Admin"}</span>
                </div>
                <div className="hidden text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:block">
                  {isDelivery ? "Partner Hub" : "Command Center"}
                </div>
              </div>
            </div>

            {showAdminNav && (
              <div className="hidden items-center gap-1 rounded-full border border-border bg-background/60 p-1 sm:flex">
                {navItems.map(({ tab, label, icon: Icon }) => (
                  <button
                    key={tab}
                    onClick={() => onNavigate?.(tab)}
                    className={`relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      activeTab === tab
                        ? "gradient-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                    {tab === "bulk-orders" && pendingBulk > 0 && (
                      <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-amber-500 text-[9px] font-black text-white">
                        {pendingBulk}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {showDeliveryViews && (
              <div className="hidden items-center gap-1 rounded-full border border-border bg-background/60 p-1 sm:flex">
                {([
                  { id: "requests" as const, label: "Requests", icon: Bell },
                  { id: "deliveries" as const, label: "Deliveries", icon: Bike },
                  { id: "history" as const, label: "History", icon: History },
                ] as const).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => onDeliveryTabChange?.(id)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      activeDeliveryTab === id
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

            <div className="flex-1" />

            <span className="hidden items-center gap-1.5 rounded-full bg-emerald-600/10 px-3 py-1 text-xs font-semibold text-emerald-600 sm:inline-flex">
              <span className="relative grid h-2 w-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/70" />
                <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Live
            </span>

            <a href={siteUrl} target="_blank" rel="noopener noreferrer"
              className="hidden items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold transition hover:bg-accent sm:inline-flex">
              <ExternalLink className="h-3.5 w-3.5" /> View Site
            </a>

            <button aria-label="Toggle theme" onClick={toggle} className="rounded-full p-2 hover:bg-accent transition">
              {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {user && (
              <div className="relative">
                <button
                  onClick={() => setProfileOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-full border border-border bg-background/60 px-2 py-1.5 hover:bg-accent transition"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-full gradient-primary text-xs font-bold text-primary-foreground">
                    {user.name[0]?.toUpperCase()}
                  </span>
                  <span className="hidden text-sm font-medium md:block">{user.name.split(" ")[0]}</span>
                </button>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-popover p-2 shadow-elegant z-50"
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
                      onClick={() => { logout(); setProfileOpen(false); }}
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

      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm md:hidden"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              ref={drawerRef}
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-[70] flex w-72 flex-col bg-card shadow-elegant md:hidden"
            >
              <div className="flex h-16 items-center justify-between border-b border-border px-5">
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-full overflow-hidden">
                    <img src="/logo.png.jpeg" alt="SAM Foods" className="h-9 w-9 rounded-full object-cover" />
                  </span>
                  <span className="font-[Fraunces] text-lg font-bold">
                    SAM <span className="text-gradient">{isDelivery ? "Delivery" : "Admin"}</span>
                  </span>
                </div>
                <button onClick={() => setDrawerOpen(false)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-accent transition">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {user && (
                <div className="mx-4 mt-4 rounded-2xl border border-border bg-background p-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full gradient-primary text-sm font-bold text-primary-foreground">
                      {user.name[0]?.toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{user.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                    </div>
                  </div>
                  <div className="mt-2 inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] uppercase tracking-wide text-primary">
                    {user.role}
                  </div>
                </div>
              )}

              {showAdminNav && (
                <nav className="mt-4 flex-1 space-y-1 px-4">
                  <div className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Navigation</div>
                  {navItems.map(({ tab, label, icon: Icon }) => (
                    <button
                      key={tab}
                      onClick={() => { onNavigate?.(tab); setDrawerOpen(false); }}
                      className={`relative flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                        activeTab === tab
                          ? "gradient-primary text-primary-foreground shadow-sm"
                          : "hover:bg-accent text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {label}
                      {tab === "bulk-orders" && pendingBulk > 0 && (
                        <span className="ml-auto grid h-5 w-5 place-items-center rounded-full bg-amber-500 text-[10px] font-black text-white">
                          {pendingBulk}
                        </span>
                      )}
                    </button>
                  ))}
                </nav>
              )}

              {showDeliveryViews && (
                <nav className="mt-4 flex-1 space-y-1 px-4">
                  <div className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Delivery Views</div>
                  {[
                    { id: "requests" as const, label: "Requests", icon: Bell },
                    { id: "deliveries" as const, label: "Deliveries", icon: Bike },
                    { id: "history" as const, label: "History", icon: History },
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => { onDeliveryTabChange?.(id); setDrawerOpen(false); }}
                      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                        activeDeliveryTab === id
                          ? "gradient-primary text-primary-foreground shadow-sm"
                          : "hover:bg-accent text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {label}
                    </button>
                  ))}
                </nav>
              )}

              <div className="mt-auto space-y-2 border-t border-border p-4">
                <a href={siteUrl} target="_blank" rel="noopener noreferrer"
                  className="flex w-full items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm font-semibold hover:bg-accent transition">
                  <ExternalLink className="h-4 w-4" /> View Site
                </a>
                <button onClick={toggle}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm font-semibold hover:bg-accent transition">
                  {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  {dark ? "Light Mode" : "Dark Mode"}
                </button>
                <button
                  onClick={() => { logout(); setDrawerOpen(false); }}
                  className="flex w-full items-center gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-semibold text-destructive hover:bg-destructive/10 transition">
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="w-full">{children}</main>
    </div>
  );
}
