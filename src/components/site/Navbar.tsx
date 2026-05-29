import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Bell, ChefHat, LogOut, Moon, Search, ShoppingBag, Sun, User as UserIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";

function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("sam_theme");
    const isDark = stored ? stored === "dark" : window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", !!isDark);
    setDark(!!isDark);
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("sam_theme", next ? "dark" : "light");
  };
  return { dark, toggle };
}

export function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const { dark, toggle } = useTheme();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50">
      <div className="glass border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 md:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl gradient-primary shadow-glow">
              <ChefHat className="h-5 w-5 text-primary-foreground" />
            </span>
            <div className="leading-tight">
              <div className="font-[Fraunces] text-lg font-bold tracking-tight">SAM <span className="text-gradient">Foods</span></div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Hotel Kitchen · Delivered</div>
            </div>
          </Link>

          <div className="ml-4 hidden flex-1 max-w-md md:block">
            <div className="flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Search biryani, meals, desserts…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                onFocus={() => navigate({ to: "/", hash: "menu" })}
              />
            </div>
          </div>

          <nav className="ml-auto hidden items-center gap-1 md:flex">
            {[
              { to: "/", label: "Home" },
              { to: "/bulk-order", label: "Bulk Order" },
              { to: "/track", label: "Track" },
            ].map((l) => (
              <Link key={l.to} to={l.to} className={`rounded-full px-3 py-1.5 text-sm transition ${path === l.to ? "bg-accent text-accent-foreground" : "hover:bg-accent/60"}`}>
                {l.label}
              </Link>
            ))}
          </nav>

          <button aria-label="Toggle theme" onClick={toggle} className="rounded-full p-2 hover:bg-accent">
            {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <button aria-label="Notifications" className="rounded-full p-2 hover:bg-accent">
            <Bell className="h-5 w-5" />
          </button>
          <Link to="/cart" className="relative rounded-full p-2 hover:bg-accent" aria-label="Cart">
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <motion.span
                key={count}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full gradient-primary px-1 text-[10px] font-bold text-primary-foreground"
              >
                {count}
              </motion.span>
            )}
          </Link>

          {user ? (
            <div className="relative">
              <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 rounded-full border border-border bg-background/60 px-2 py-1.5 hover:bg-accent">
                <span className="grid h-7 w-7 place-items-center rounded-full gradient-primary text-xs font-bold text-primary-foreground">
                  {user.name[0]?.toUpperCase()}
                </span>
                <span className="hidden text-sm font-medium md:block">{user.name.split(" ")[0]}</span>
              </button>
              {open && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-border bg-popover p-2 shadow-elegant"
                >
                  <div className="px-3 py-2">
                    <div className="text-sm font-semibold">{user.name}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                    <div className="mt-1 inline-flex rounded-full bg-accent px-2 py-0.5 text-[10px] uppercase tracking-wide text-accent-foreground">{user.role}</div>
                  </div>
                  <hr className="my-1 border-border" />
                  {user.role === "admin" && <Link to="/admin" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-accent">Admin Dashboard</Link>}
                  {user.role === "delivery" && <Link to="/delivery" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-accent">Delivery Dashboard</Link>}
                  <Link to="/track" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-accent">My Orders</Link>
                  <button onClick={() => { logout(); setOpen(false); navigate({ to: "/" }); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10">
                    <LogOut className="h-4 w-4" /> Logout
                  </button>
                </motion.div>
              )}
            </div>
          ) : (
            <Link to="/login" className="hidden items-center gap-1 rounded-full gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-elegant hover:opacity-95 sm:inline-flex">
              <UserIcon className="h-4 w-4" /> Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
