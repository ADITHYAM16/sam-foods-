import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "../i18n.ts";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart-context";
import { LocationProvider } from "@/lib/location-context";
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
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
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
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SAM Foods — Order, Dine, Celebrate" },
      { name: "description", content: "Order signature dishes and book bulk catering from SAM — your favourite hotel kitchen, delivered." },
      { name: "author", content: "SAM Foods" },
      { property: "og:title", content: "SAM Foods — Order, Dine, Celebrate" },
      { property: "og:description", content: "Signature biryani, meals, starters & catering from SAM, delivered hot." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      { rel: "icon", type: "image/jpeg", href: "/logo.png.jpeg" },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,700;9..144,900&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        {/* Inline script: apply theme BEFORE paint to prevent flash */}
        <script dangerouslySetInnerHTML={{ __html: `
(function(){
  try{
    var t=localStorage.getItem('sam_theme');
    if(t==='dark')document.documentElement.classList.add('dark');
    else{document.documentElement.classList.remove('dark');localStorage.setItem('sam_theme','light');}
  }catch(e){}
})();
        `}} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const CIRC = 2 * Math.PI * 62;

function SplashScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"intro" | "main">("intro");

  useEffect(() => {
    // intro ripple plays for 750ms, then switch to main
    const t1 = setTimeout(() => setPhase("main"), 750);
    // total duration: 750 intro + 2800 main
    const t2 = setTimeout(onDone, 750 + 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background overflow-hidden"
    >
      {/* ── Intro ripple transition ── */}
      <AnimatePresence>
        {phase === "intro" && (
          <motion.div
            key="ripple"
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 6, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            className="absolute rounded-full"
            style={{
              width: 220,
              height: 220,
              background: "var(--gradient-primary)",
              willChange: "transform, opacity",
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Main splash (visible after intro) ── */}
      {phase === "main" && (
        <>
          {/* Logo + circular spinner */}
          <div className="relative flex items-center justify-center">
            <svg
              className="absolute"
              width="136"
              height="136"
              viewBox="0 0 136 136"
              style={{ transform: "rotate(-90deg)", willChange: "transform" }}
            >
              <circle cx="68" cy="68" r="62" fill="none" stroke="var(--border)" strokeWidth="3" />
              <motion.circle
                cx="68" cy="68" r="62"
                fill="none"
                stroke="url(#splashGrad)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                initial={{ strokeDashoffset: CIRC }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ delay: 1.2, duration: 1.3, ease: "easeInOut" }}
              />
              <defs>
                <linearGradient id="splashGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="oklch(0.68 0.22 32)" />
                  <stop offset="100%" stopColor="oklch(0.78 0.18 55)" />
                </linearGradient>
              </defs>
            </svg>

            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
              className="relative h-28 w-28 rounded-full bg-white shadow-glow overflow-hidden border-4 border-primary/20"
              style={{ willChange: "transform" }}
            >
              <img src="/logo.png.jpeg" alt="SAM Foods" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </motion.div>
          </div>

          {/* Brand name */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="mt-6 text-center"
            style={{ willChange: "opacity, transform" }}
          >
            <div className="font-[Fraunces] text-4xl font-black tracking-tight">
              SAM <span className="text-gradient">Foods</span>
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.5 }}
              className="mt-1 text-sm uppercase tracking-[0.3em] text-muted-foreground"
            >
              Hotel Kitchen · Delivered
            </motion.div>
          </motion.div>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.5 }}
            className="mt-6 text-xs text-muted-foreground"
          >
            Crave it. Tap it. Devour it.
          </motion.p>
        </>
      )}
    </motion.div>
  );
}

// True only on the client, never on server — avoids SSR hydration mismatch
const isBrowser = typeof window !== "undefined";

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  // Start as true on client immediately — no useEffect delay, no flicker
  const [splash, setSplash] = useState(isBrowser);
  const router = useRouter();

  // Save scroll position before unload so we can restore after splash
  useEffect(() => {
    const save = () => sessionStorage.setItem("sam_scroll", String(window.scrollY));
    window.addEventListener("beforeunload", save);
    return () => window.removeEventListener("beforeunload", save);
  }, []);

  // Handle Supabase OAuth redirect — the hash contains access_token after Google sign-in
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash.includes("access_token") || hash.includes("error_description")) {
      // Let Supabase client parse the hash and establish the session
      supabase.auth.getSession().then(({ data }: any) => {
        if (data.session) {
          // Clean the hash from the URL without reload
          window.history.replaceState({}, document.title, window.location.pathname);
          router.navigate({ to: "/" });
        }
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LocationProvider>
          <CartProvider>
            <AnimatePresence mode="wait">
              {splash ? (
                <SplashScreen
                  key="splash"
                  onDone={() => {
                    setSplash(false);
                    // Restore scroll position after splash
                    const saved = sessionStorage.getItem("sam_scroll");
                    if (saved) {
                      requestAnimationFrame(() => window.scrollTo(0, parseInt(saved, 10)));
                      sessionStorage.removeItem("sam_scroll");
                    }
                  }}
                />
              ) : (
                <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                  <Outlet />
                </motion.div>
              )}
            </AnimatePresence>
          </CartProvider>
        </LocationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
