import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "../i18n.ts";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
} from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navigation, X } from "lucide-react";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart-context";
import { LocationProvider, useLocation } from "@/lib/location-context";
import { LangProvider } from "@/lib/lang-context";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Something went wrong. Try refreshing or go home.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            Try again
          </button>
          <a href="/" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const CIRC = 2 * Math.PI * 62;

function SplashScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"intro" | "main">("intro");
  useEffect(() => {
    const t1 = setTimeout(() => setPhase("main"), 750);
    const t2 = setTimeout(onDone, 750 + 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.05 }} transition={{ duration: 0.6, ease: "easeInOut" }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background overflow-hidden">
      <AnimatePresence>
        {phase === "intro" && (
          <motion.div key="ripple" initial={{ scale: 0, opacity: 1 }} animate={{ scale: 6, opacity: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            className="absolute rounded-full"
            style={{ width: 220, height: 220, background: "var(--gradient-primary)", willChange: "transform, opacity" }} />
        )}
      </AnimatePresence>
      {phase === "main" && (
        <>
          <div className="relative flex items-center justify-center">
            <svg className="absolute" width="136" height="136" viewBox="0 0 136 136" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="68" cy="68" r="62" fill="none" stroke="var(--border)" strokeWidth="3" />
              <motion.circle cx="68" cy="68" r="62" fill="none" stroke="url(#splashGrad)" strokeWidth="3"
                strokeLinecap="round" strokeDasharray={CIRC}
                initial={{ strokeDashoffset: CIRC }} animate={{ strokeDashoffset: 0 }}
                transition={{ delay: 1.2, duration: 1.3, ease: "easeInOut" }} />
              <defs>
                <linearGradient id="splashGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="oklch(0.68 0.22 32)" />
                  <stop offset="100%" stopColor="oklch(0.78 0.18 55)" />
                </linearGradient>
              </defs>
            </svg>
            <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
              className="relative h-28 w-28 rounded-full bg-white shadow-glow overflow-hidden border-4 border-primary/20">
              <img src="/logo.png.jpeg" alt="SAM Foods" className="h-full w-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            </motion.div>
          </div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.5 }} className="mt-6 text-center">
            <div className="font-[Fraunces] text-4xl font-black tracking-tight">SAM <span className="text-gradient">Foods</span></div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 0.5 }}
              className="mt-1 text-sm uppercase tracking-[0.3em] text-muted-foreground">
              Hotel Kitchen · Delivered
            </motion.div>
          </motion.div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5, duration: 0.5 }}
            className="mt-6 text-xs text-muted-foreground">
            Crave it. Tap it. Devour it.
          </motion.p>
        </>
      )}
    </motion.div>
  );
}

const LOC_ASKED_KEY = "sam_loc_asked";

function LocationPermissionModal() {
  const { user } = useAuth();
  const { fetchGPS, gpsLoading } = useLocation();
  const [show, setShow] = useState(false);
  const [denied, setDenied] = useState(false);
  const asked = useRef(false);

  useEffect(() => {
    if (!user) return;
    if (sessionStorage.getItem(LOC_ASKED_KEY)) return;
    if (navigator.permissions) {
      navigator.permissions.query({ name: "geolocation" as PermissionName }).then((res) => {
        if (res.state === "granted") { sessionStorage.setItem(LOC_ASKED_KEY, "1"); fetchGPS(); return; }
        if (res.state === "denied") { sessionStorage.setItem(LOC_ASKED_KEY, "1"); return; }
        if (!asked.current) { asked.current = true; setShow(true); }
      }).catch(() => { if (!asked.current) { asked.current = true; setShow(true); } });
    } else {
      if (!asked.current) { asked.current = true; setShow(true); }
    }
  }, [user]);

  const handleAllow = async () => {
    setDenied(false);
    const result = await fetchGPS();
    if (result && result !== "denied") { sessionStorage.setItem(LOC_ASKED_KEY, "1"); setShow(false); }
    else setDenied(true);
  };
  const handleSkip = () => { sessionStorage.setItem(LOC_ASKED_KEY, "1"); setShow(false); };

  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[9998] flex items-end justify-center bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="w-full rounded-t-3xl border-t border-border bg-card p-6 shadow-elegant sm:max-w-md sm:rounded-3xl sm:mb-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10">
            <Navigation className="h-6 w-6 text-primary" />
          </div>
          <button onClick={handleSkip} className="mt-0.5 grid h-8 w-8 place-items-center rounded-full hover:bg-accent text-muted-foreground transition">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="font-[Fraunces] text-xl font-black">Enable Location</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Allow SAM Foods to access your location so we can auto-fill your delivery address and check if you're within our delivery area.
        </p>
        {denied && <p className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">Location access was denied. Please enable it in your browser settings.</p>}
        <div className="mt-5 flex flex-col gap-2">
          <button onClick={handleAllow} disabled={gpsLoading}
            className="flex w-full items-center justify-center gap-2 rounded-full gradient-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60 transition">
            {gpsLoading ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />Fetching location…</> : <><Navigation className="h-4 w-4" />Allow Location Access</>}
          </button>
          <button onClick={handleSkip} className="w-full rounded-full border border-border py-3 text-sm font-semibold text-muted-foreground hover:bg-accent transition">
            Not now
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [splash, setSplash] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const save = () => sessionStorage.setItem("sam_scroll", String(window.scrollY));
    window.addEventListener("beforeunload", save);
    return () => window.removeEventListener("beforeunload", save);
  }, []);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes("access_token") || hash.includes("error_description")) {
      supabase.auth.getSession().then(({ data }: any) => {
        if (data.session) {
          window.history.replaceState({}, document.title, window.location.pathname);
          router.navigate({ to: "/" });
        }
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LangProvider>
          <LocationProvider>
            <CartProvider>
              <AnimatePresence mode="wait">
                {splash ? (
                  <SplashScreen key="splash" onDone={() => {
                    setSplash(false);
                    const saved = sessionStorage.getItem("sam_scroll");
                    if (saved) { requestAnimationFrame(() => window.scrollTo(0, parseInt(saved, 10))); sessionStorage.removeItem("sam_scroll"); }
                  }} />
                ) : (
                  <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                    <Outlet />
                    <LocationPermissionModal />
                  </motion.div>
                )}
              </AnimatePresence>
            </CartProvider>
          </LocationProvider>
        </LangProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
