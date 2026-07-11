import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut, Menu, Moon, ShoppingBag, Sun, User as UserIcon, X, Home, UtensilsCrossed, MapPin, Navigation, Trash2, Check, ClipboardList, Settings, Languages } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { useLocation, type SavedAddress, type FetchGPSResult } from "@/lib/location-context";
import { useLanguage } from "@/lib/lang-context";
import type { User } from "@/lib/auth-context";

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

const EMPTY_FORM = { flatNo: "", streetNo: "", streetName: "", area: "", landmark: "", label: "Home" };

function AddressModal({ onClose, saveAddress, fetchGPS, gpsLoading, saved, setDefault, deleteAddress, user }: {
  onClose: () => void;
  saveAddress: (label: string, address: string) => Promise<void>;
  fetchGPS: () => Promise<FetchGPSResult>;
  gpsLoading: boolean;
  saved: SavedAddress[];
  setDefault: (id: string) => Promise<void>;
  deleteAddress: (id: string) => Promise<void>;
  user: User | null;
}) {
  const { t } = useLanguage();
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [gpsErr, setGpsErr] = useState<string | null>(null);
  const [permDenied, setPermDenied] = useState(false);
  const pendingCloseRef = useRef(false);

  useEffect(() => {
    if (pendingCloseRef.current && !gpsLoading) {
      pendingCloseRef.current = false;
      onClose();
    }
  }, [gpsLoading, onClose]);

  // Check permission state on mount
  useEffect(() => {
    navigator.permissions?.query({ name: "geolocation" }).then(p => {
      setPermDenied(p.state === "denied");
      p.onchange = () => setPermDenied(p.state === "denied");
    }).catch(() => {});
  }, []);

  const set = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSave = async () => {
    const { flatNo, streetNo, streetName, area, landmark, label } = form;
    const parts = [flatNo, streetNo, streetName, area, landmark].map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) return;
    setSaving(true);
    await saveAddress(label || "Home", parts.join(", "));
    setSaving(false);
    setForm(EMPTY_FORM);
  };

  const handleGPS = async () => {
    setGpsErr(null);
    setPermDenied(false);
    pendingCloseRef.current = false;
    const result = await fetchGPS();
    if (result === "denied") {
      setPermDenied(true);
    } else if (!result) {
      setGpsErr("Could not get location. Make sure GPS is ON and try again.");
    } else {
      pendingCloseRef.current = true;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 24 }}
        transition={{ type: "spring", damping: 22, stiffness: 260 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl border border-border bg-card shadow-elegant overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <div className="font-[Fraunces] text-lg font-bold">{t("Delivery Location")}</div>
            <div className="text-xs text-muted-foreground">{t("Where should we deliver?")}</div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-5 space-y-5">
          {/* GPS */}
          <button
            onClick={handleGPS}
            disabled={gpsLoading}
            className="flex w-full items-center gap-3 rounded-2xl bg-primary/10 px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/20 transition disabled:opacity-60"
          >
            <Navigation className="h-4 w-4 shrink-0" />
            {gpsLoading ? t("Fetching your location…") : t("Use my location")}
          </button>
          {permDenied && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-3 text-xs">
              <p className="font-semibold text-amber-700 dark:text-amber-400 mb-2">📍 Location permission is blocked</p>
              <p className="text-amber-700/80 dark:text-amber-400/80 mb-2.5">To use your location, enable it in your browser settings:</p>
              <p className="text-amber-700/80 dark:text-amber-400/80 mb-2.5"><strong>Chrome/Android:</strong> Tap the 🔒 lock icon in the address bar → Permissions → Location → Allow</p>
              <p className="text-amber-700/80 dark:text-amber-400/80 mb-2.5"><strong>Safari/iOS:</strong> Settings → Safari → Location → Allow</p>
              <button
                onClick={() => { window.location.reload(); }}
                className="mt-1 w-full rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-white hover:bg-amber-600 transition"
              >
                I've enabled it — Reload & try again
              </button>
            </div>
          )}
          {gpsErr && <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">{gpsErr}</p>}

          {/* Saved addresses */}
          {saved.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("Saved")}</div>
              <div className="space-y-1">
                {saved.map(a => (
                  <div key={a.id} className="flex items-center gap-2 rounded-2xl border border-border px-3 py-2.5 hover:bg-accent">
                    <button onClick={() => setDefault(a.id)} className="flex flex-1 items-start gap-2 text-left min-w-0">
                      <MapPin className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${a.is_default ? "text-primary" : "text-muted-foreground"}`} />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold">{a.label}</div>
                        <div className="truncate text-xs text-muted-foreground">{a.address}</div>
                      </div>
                    </button>
                    {a.is_default && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                    <button onClick={() => deleteAddress(a.id)} className="shrink-0 rounded-full p-1 hover:bg-destructive/10">
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Manual form */}
          {user ? (
            <div>
              <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("Add New Address")}</div>
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">{t("Flat / House No.")}</label>
                    <input value={form.flatNo} onChange={set("flatNo")} placeholder="e.g. 4B" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">{t("Street No.")}</label>
                    <input value={form.streetNo} onChange={set("streetNo")} placeholder="e.g. 12" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">{t("Street Name")}</label>
                  <input value={form.streetName} onChange={set("streetName")} placeholder="e.g. MG Road" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">{t("Area / Locality")}</label>
                  <input value={form.area} onChange={set("area")} placeholder="e.g. Anna Nagar" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">{t("Near Landmark")}</label>
                  <input value={form.landmark} onChange={set("landmark")} placeholder="e.g. Near Apollo Hospital" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">{t("Save as")}</label>
                  <div className="flex gap-2">
                    {(["Home", "Work", "Other"] as const).map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, label: opt }))}
                        className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition ${
                          form.label === opt
                            ? "gradient-primary border-transparent text-primary-foreground shadow-elegant"
                            : "border-border bg-background hover:bg-accent"
                        }`}
                      >
                        {t(opt)}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full rounded-2xl gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-elegant hover:opacity-95 transition disabled:opacity-60"
                >
                  {saving ? t("Saving…") : t("Save Address")}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              <Link to="/login" search={{ redirect: "/cart" } as any} onClick={onClose} className="text-primary underline font-semibold">{t("Sign in")}</Link> {t("to save addresses")}
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const { dark, toggle } = useTheme();
  const { active, saved, gpsLoading, saveAddress, setDefault, deleteAddress, fetchGPS } = useLocation();
  const { lang, setLang, t } = useLanguage();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [userOpen, setUserOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [locOpen, setLocOpen] = useState(false);

  const navLinks = [
    { to: "/", label: t("Home"), icon: Home },
    { to: "/bulk-order", label: t("Bulk Order"), icon: UtensilsCrossed },
    { to: "/track", label: t("Track Order"), icon: MapPin },
  ];

  const userNavLinks = [
    { to: "/orders", label: t("My Orders"), icon: ClipboardList },
    { to: "/profile", label: t("My Profile"), icon: Settings },
  ];

  return (
    <>
      <header className="sticky top-0 z-50">
        <div className="glass border-b border-border/60">
          <div className="mx-auto flex min-w-0 h-16 max-w-7xl items-center gap-2 px-4 md:gap-3 md:px-6">

            {/* Hamburger — mobile only, far left */}
            <button onClick={() => setMobileOpen(v => !v)} className="rounded-full p-2 hover:bg-accent md:hidden shrink-0" aria-label="Menu">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 shrink-0 md:ml-0 ml-1">
              <span className="grid h-9 w-9 place-items-center rounded-full overflow-hidden shadow-glow">
                <img src="/logo.png.jpeg" alt="SAM Foods" className="h-9 w-9 rounded-full object-cover" />
              </span>
              <div className="leading-tight">
                <div className="font-[Fraunces] text-base font-bold tracking-tight md:text-lg">SAM <span className="text-gradient">Foods</span></div>
                <div className="hidden text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:block">Hotel Kitchen · Delivered</div>
              </div>
            </Link>

            {/* Desktop nav */}
            <nav className="ml-auto hidden items-center gap-1 md:flex">
              {navLinks.map((l) => (
                <Link key={l.to} to={l.to} className={`rounded-full px-3 py-1.5 text-sm transition ${path === l.to ? "bg-accent text-accent-foreground" : "hover:bg-accent/60"}`}>
                  {l.label}
                </Link>
              ))}
              {/* Desktop delivery location button */}
              <button
                onClick={() => setLocOpen(true)}
                className="ml-1 flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1.5 text-sm hover:bg-accent transition max-w-[180px]"
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                <div className="min-w-0 text-left">
                  <div className="text-[10px] leading-none text-muted-foreground">{t("Deliver to")}</div>
                  <div className="truncate text-xs font-semibold">{active ? active.address : t("Set location")}</div>
                </div>
              </button>
            </nav>

            {/* Right actions */}
            <div className="ml-auto flex items-center gap-1 md:ml-0">
              {/* Language toggle — desktop only, shown in right actions */}
              <button
                aria-label="Toggle language"
                onClick={() => setLang(lang === "en" ? "ta" : "en")}
                className="hidden md:flex items-center gap-1 rounded-full border border-border bg-background/60 px-2.5 py-1.5 text-xs font-bold hover:bg-accent transition"
              >
                <Languages className="h-4 w-4" />
                <span>{lang === "en" ? "தமிழ்" : "EN"}</span>
              </button>
              <button aria-label="Toggle theme" onClick={toggle} className="rounded-full p-2 hover:bg-accent">
                {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>

              <Link to="/cart" className="relative rounded-full p-2 hover:bg-accent" aria-label="Cart">
                <ShoppingBag className="h-5 w-5" />
                {count > 0 && (
                  <motion.span key={count} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full gradient-primary px-1 text-[10px] font-bold text-primary-foreground">
                    {count}
                  </motion.span>
                )}
              </Link>

              {/* User avatar / sign in */}
              {user ? (
                <div className="relative">
                  <button onClick={() => setUserOpen(v => !v)} className="flex items-center gap-2 rounded-full border border-border bg-background/60 px-2 py-1.5 hover:bg-accent">
                    <span className="grid h-7 w-7 place-items-center rounded-full gradient-primary text-xs font-bold text-primary-foreground">
                      {user.name[0]?.toUpperCase()}
                    </span>
                    <span className="hidden text-sm font-medium md:block">{user.name.split(" ")[0]}</span>
                  </button>
                  <AnimatePresence>
                    {userOpen && (
                      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                        className="absolute right-0 mt-2 max-w-[90vw] w-56 overflow-hidden rounded-2xl border border-border bg-popover p-2 shadow-elegant">
                        <div className="px-3 py-2">
                          <div className="text-sm font-semibold">{user.name}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                          <div className="mt-1 inline-flex rounded-full bg-accent px-2 py-0.5 text-[10px] uppercase tracking-wide text-accent-foreground">{user.role}</div>
                        </div>
                        <hr className="my-1 border-border" />
                        {user.role === "customer" && userNavLinks.map(l => (
                          <Link key={l.to} to={l.to} onClick={() => setUserOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent">
                            <l.icon className="h-4 w-4 text-muted-foreground" /> {l.label}
                          </Link>
                        ))}
                        {user.role === "admin" && <Link to="/admin" onClick={() => setUserOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-accent">{t("Admin Dashboard")}</Link>}
                        {user.role === "delivery" && <Link to="/delivery" onClick={() => setUserOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-accent">{t("Delivery Dashboard")}</Link>}
                        <button onClick={() => { logout(); setUserOpen(false); navigate({ to: "/login", search: { redirect: "/" } } as any); }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10">
                          <LogOut className="h-4 w-4" /> {t("Logout")}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link to="/login" search={{ redirect: "/" } as any} className="hidden items-center gap-1 rounded-full gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-elegant hover:opacity-95 sm:inline-flex">
                  <UserIcon className="h-4 w-4" /> {t("Sign in")}
                </Link>
              )}


            </div>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 md:hidden" />
            <motion.div initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 z-50 flex h-full w-full max-w-[85vw] flex-col bg-card shadow-elegant md:hidden">
              <div className="flex h-16 items-center justify-between border-b border-border px-4">
                <span className="font-[Fraunces] text-lg font-bold">{t("Menu")}</span>
                <button onClick={() => setMobileOpen(false)} className="rounded-full p-2 hover:bg-accent"><X className="h-5 w-5" /></button>
              </div>

              {/* Nav links */}
              <nav className="mt-4 flex-1 overflow-y-auto space-y-1 px-3">
                {navLinks.map((l) => (
                  <Link key={l.to} to={l.to} onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${path === l.to ? "gradient-primary text-primary-foreground" : "hover:bg-accent"}`}>
                    <l.icon className="h-4 w-4" /> {l.label}
                  </Link>
                ))}
                {user?.role === "customer" && userNavLinks.map((l) => (
                  <Link key={l.to} to={l.to} onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${path === l.to ? "gradient-primary text-primary-foreground" : "hover:bg-accent"}`}>
                    <l.icon className="h-4 w-4" /> {l.label}
                  </Link>
                ))}

                {/* Delivery Location */}
                <button
                  onClick={() => { setMobileOpen(false); setTimeout(() => setLocOpen(true), 150); }}
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold hover:bg-accent transition text-left"
                >
                  <MapPin className="h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">{t("Deliver to")}</div>
                    <div className="truncate">{active ? active.address : t("Set location")}</div>
                  </div>
                </button>

              </nav>

              {/* Bottom actions */}
              <div className="border-t border-border p-4 space-y-2">
                {/* Language toggle — always visible at bottom */}
                <button
                  onClick={() => setLang(lang === "en" ? "ta" : "en")}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border px-4 py-3 text-sm font-semibold hover:bg-accent transition"
                >
                  <Languages className="h-4 w-4 shrink-0 text-primary" />
                  <span className="flex-1 text-left">
                    {lang === "en" ? "தமிழில் மாற்று" : "Switch to English"}
                  </span>
                  <span className="rounded-full gradient-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                    {lang === "en" ? "தமிழ்" : "EN"}
                  </span>
                </button>
                {user ? (
                  <>
                    <div className="flex items-center gap-3 rounded-2xl bg-accent px-4 py-3">
                      <span className="grid h-8 w-8 place-items-center rounded-full gradient-primary text-xs font-bold text-primary-foreground">
                        {user.name[0]?.toUpperCase()}
                      </span>
                      <div>
                        <div className="text-sm font-semibold">{user.name}</div>
                        <div className="text-xs text-muted-foreground capitalize">{user.role}</div>
                      </div>
                    </div>
                    <button onClick={() => { logout(); setMobileOpen(false); navigate({ to: "/login", search: { redirect: "/" } } as any); }}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 py-3 text-sm font-semibold text-destructive">
                      <LogOut className="h-4 w-4" /> {t("Logout")}
                    </button>
                  </>
                ) : (
                  <Link to="/login" search={{ redirect: "/" } as any} onClick={() => setMobileOpen(false)}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl gradient-primary py-3 text-sm font-semibold text-primary-foreground shadow-elegant">
                    <UserIcon className="h-4 w-4" /> {t("Sign in")}
                  </Link>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Address modal — centered popup */}
      <AnimatePresence>
        {locOpen && (
          <AddressModal
            onClose={() => setLocOpen(false)}
            saveAddress={saveAddress}
            fetchGPS={fetchGPS}
            gpsLoading={gpsLoading}
            saved={saved}
            setDefault={setDefault}
            deleteAddress={deleteAddress}
            user={user}
          />
        )}
      </AnimatePresence>
    </>
  );
}
