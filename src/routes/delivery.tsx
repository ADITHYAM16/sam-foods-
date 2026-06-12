import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Bell, CheckCircle2, IndianRupee, Loader2, MapPin,
  Navigation, Package, X, Check, Bike, CreditCard,
  LogOut, WifiOff, Wifi, History, ChevronDown, ChevronUp,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SiteShell } from "@/components/site/SiteShell";
import { useAuth } from "@/lib/auth-context";
import {
  useDeliveryOrders, useDeliveryRequests,
  respondToDeliveryRequest, updateOrderStatus, type OrderStatus,
} from "@/lib/orders-store";
import { supabase } from "@/integrations/supabase/client";
import { playBeep } from "@/lib/beep";

export const Route = createFileRoute("/delivery")({
  component: DeliveryPage,
  head: () => ({ meta: [{ title: "Delivery Partner — SAM Foods" }] }),
});

// ─── Fetch commission rate from DB (fallback 8%) ──────────────────────────────
async function fetchCommissionRate(): Promise<number> {
  try {
    const { data } = await (supabase.from("settings") as any)
      .select("value").eq("key", "delivery_commission_pct").maybeSingle();
    if (data?.value) return parseFloat(data.value);
  } catch {}
  return 8; // default 8%
}

function StatusPill({ s }: { s: string }) {
  const map: Record<string, string> = {
    Ready: "bg-amber-500/10 text-amber-600",
    "Out for delivery": "bg-blue-500/10 text-blue-600",
    Delivered: "bg-emerald-600/10 text-emerald-600",
    Cancelled: "bg-destructive/10 text-destructive",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${map[s] || "bg-muted text-foreground"}`}>
      {s}
    </span>
  );
}

function DeliveryPage() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  // ── Fix: redirect to /owner/login in the MAIN app (not admin-panel) ──────────
  useEffect(() => {
    if (!loading && !user) navigate({ to: "/owner/login" });
    if (!loading && user && user.role !== "delivery") navigate({ to: "/" });
  }, [user, loading, navigate]);

  const { orders, loading: ordersLoading, newAlert, clearAlert } = useDeliveryOrders(user?.id);
  const { request, order: reqOrder } = useDeliveryRequests(user?.id);
  const [responding, setResponding] = useState(false);
  const [deniedIds, setDeniedIds] = useState<string[]>([]);

  // ── Sound: ring when a new delivery request arrives, stop when gone ───────
  const prevReqId = useRef<string | null>(null);
  const ringTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const id = request?.id ?? null;
    if (id && id !== prevReqId.current) {
      // New request — play immediately then repeat every 4 s
      prevReqId.current = id;
      playBeep("delivery");
      if (ringTimer.current) clearInterval(ringTimer.current);
      ringTimer.current = setInterval(() => playBeep("delivery"), 4000);
    } else if (!id && prevReqId.current) {
      // Request gone — stop ringing
      prevReqId.current = null;
      if (ringTimer.current) { clearInterval(ringTimer.current); ringTimer.current = null; }
    }
    return () => {
      if (ringTimer.current) { clearInterval(ringTimer.current); ringTimer.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.id]);

  // ── Commission rate from DB ────────────────────────────────────────────────
  const [commissionPct, setCommissionPct] = useState(8);
  useEffect(() => { fetchCommissionRate().then(setCommissionPct); }, []);

  // ── Offline / available toggle ─────────────────────────────────────────────
  const [isOnline, setIsOnline] = useState(true);
  const [togglingOnline, setTogglingOnline] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    // Load current active state from DB on mount
    (supabase.from("delivery_agents") as any)
      .select("active").eq("id", user.id).maybeSingle()
      .then(({ data }: any) => { if (data) setIsOnline(!!data.active); });
  }, [user?.id]);

  const toggleOnline = async () => {
    if (!user?.id) return;
    setTogglingOnline(true);
    const next = !isOnline;
    await (supabase.from("delivery_agents") as any)
      .update({ active: next }).eq("id", user.id);
    setIsOnline(next);
    setTogglingOnline(false);
  };

  // ── History expand toggle ─────────────────────────────────────────────────
  const [showAllHistory, setShowAllHistory] = useState(false);

  // ── Track denied IDs for cascade ─────────────────────────────────────────
  useEffect(() => {
    if (!user?.id || !request?.order_id) return;
    (supabase.from("delivery_requests") as any)
      .select("agent_id").eq("order_id", request.order_id).eq("status", "denied")
      .then(({ data }: any) => {
        if (data) setDeniedIds((data as any[]).map(r => r.agent_id));
      });
  }, [request?.order_id, user?.id]);

  const handleRespond = async (accept: boolean) => {
    if (!request || !user) return;
    setResponding(true);
    try {
      await respondToDeliveryRequest(request.id, request.order_id, user.id, accept, deniedIds);
    } finally {
      setResponding(false);
    }
  };

  // ── Derived order lists ───────────────────────────────────────────────────
  const todayStr = new Date().toISOString().slice(0, 10);
  const activeOrders = orders.filter(o => o.status === "Out for delivery");
  const readyOrders = orders.filter(o => o.status === "Ready");
  const deliveredToday = orders.filter(o => o.status === "Delivered" && o.created_at?.slice(0, 10) === todayStr);
  const allDelivered = orders.filter(o => o.status === "Delivered");
  const historyToShow = showAllHistory ? allDelivered : deliveredToday;

  const todayEarnings = deliveredToday.reduce((s, o) => s + Math.round(o.total * commissionPct / 100), 0);
  const totalEarnings = allDelivered.reduce((s, o) => s + Math.round(o.total * commissionPct / 100), 0);

  const stats = [
    { l: "Today's Earnings", v: `₹${todayEarnings}`, i: IndianRupee, color: "text-emerald-600", bg: "bg-emerald-500/10" },
    { l: "Active Drops", v: String(activeOrders.length + readyOrders.length), i: Package, color: "text-blue-600", bg: "bg-blue-500/10" },
    { l: "Delivered Today", v: String(deliveredToday.length), i: CheckCircle2, color: "text-purple-600", bg: "bg-purple-500/10" },
  ];

  if (loading || !user) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-border border-t-primary" />
    </div>
  );

  return (
    <SiteShell>
      <section className="mx-auto max-w-6xl px-4 py-10 md:px-6">

        {/* ── Incoming delivery request ── */}
        <AnimatePresence>
          {request && reqOrder && (
            <motion.div
              initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              className="mb-6 rounded-3xl border-2 border-amber-400/50 bg-amber-50 dark:bg-amber-950/30 p-5 shadow-lg"
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
                </span>
                <Bell className="h-5 w-5 text-amber-600" />
                <span className="text-base font-bold text-amber-800 dark:text-amber-300">New Delivery Request!</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 mb-4">
                <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-white/60 dark:bg-amber-900/20 p-3">
                  <MapPin className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-[10px] uppercase text-amber-600 font-semibold tracking-wide">Delivery Location</div>
                    <div className="font-bold text-sm">{reqOrder.room}</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-white/60 dark:bg-amber-900/20 p-3">
                  <CreditCard className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-[10px] uppercase text-amber-600 font-semibold tracking-wide">Payment</div>
                    <div className="font-bold text-sm uppercase">{reqOrder.payment_method}
                      <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                        reqOrder.payment_status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      }`}>{reqOrder.payment_status}</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-white/60 dark:bg-amber-900/20 p-3">
                  <div className="text-[10px] uppercase text-amber-600 font-semibold tracking-wide mb-1">Items</div>
                  <div className="space-y-0.5">
                    {reqOrder.items.map((it, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>{it.name}</span>
                        <span className="text-muted-foreground">×{it.qty}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-white/60 dark:bg-amber-900/20 p-3">
                  <IndianRupee className="h-4 w-4 text-amber-600 shrink-0" />
                  <div>
                    <div className="text-[10px] uppercase text-amber-600 font-semibold tracking-wide">Total · Your cut</div>
                    <div className="text-xl font-black">₹{reqOrder.total}
                      <span className="ml-2 text-sm font-semibold text-emerald-600">+₹{Math.round(reqOrder.total * commissionPct / 100)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button disabled={responding} onClick={() => handleRespond(true)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition disabled:opacity-60">
                  {responding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Accept
                </button>
                <button disabled={responding} onClick={() => handleRespond(false)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full border-2 border-destructive/40 bg-destructive/10 py-3 text-sm font-bold text-destructive hover:bg-destructive/20 transition disabled:opacity-60">
                  <X className="h-4 w-4" /> Deny
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* New order alert banner */}
        <AnimatePresence>
          {newAlert && (
            <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-400/40 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
                </span>
                <Bell className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  Order ready — {newAlert.customer}, {newAlert.room} · ₹{newAlert.total}
                </span>
              </div>
              <button onClick={clearAlert} className="grid h-6 w-6 place-items-center rounded-full hover:bg-amber-100">
                <X className="h-3.5 w-3.5 text-amber-600" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header row */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-primary">Delivery Partner</div>
            <h1 className="font-[Fraunces] text-3xl font-black md:text-5xl">Hey {user.name.split(" ")[0]} 👋</h1>
            <p className="mt-1 text-muted-foreground">
              {activeOrders.length + readyOrders.length === 0
                ? "No active deliveries right now."
                : `${activeOrders.length + readyOrders.length} active deliver${activeOrders.length + readyOrders.length === 1 ? "y" : "ies"}.`}
            </p>
          </div>

          {/* Right: status badge + offline toggle + logout */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Live / offline status pill */}
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${
              isOnline ? "border-emerald-500/30 text-emerald-600" : "border-border text-muted-foreground"
            }`}>
              {isOnline ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  Online
                </>
              ) : (
                <><WifiOff className="h-3 w-3" /> Offline</>
              )}
            </span>

            {/* Go offline / Go online toggle */}
            <button onClick={toggleOnline} disabled={togglingOnline}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
                isOnline
                  ? "border-amber-400/40 bg-amber-50 text-amber-700 dark:bg-amber-950/30 hover:bg-amber-100"
                  : "border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 hover:bg-emerald-100"
              }`}>
              {togglingOnline ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isOnline ? <WifiOff className="h-3.5 w-3.5" /> : <Wifi className="h-3.5 w-3.5" />}
              {isOnline ? "Go Offline" : "Go Online"}
            </button>

            {/* Logout */}
            <button
              onClick={async () => { await logout(); navigate({ to: "/owner/login" }); }}
              className="flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20 transition">
              <LogOut className="h-3.5 w-3.5" /> Logout
            </button>
          </div>
        </div>

        {/* Offline warning banner */}
        <AnimatePresence>
          {!isOnline && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="mt-4 overflow-hidden rounded-2xl border border-amber-400/40 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                You are offline. New delivery requests will not be sent to you until you go online.
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          {stats.map((s) => (
            <div key={s.l} className="rounded-2xl border border-border bg-card p-3 md:p-5">
              <span className={`grid h-8 w-8 place-items-center rounded-xl md:h-10 md:w-10 ${s.bg}`}>
                <s.i className={`h-4 w-4 md:h-5 md:w-5 ${s.color}`} />
              </span>
              <div className="mt-2 text-lg font-bold md:mt-3 md:text-2xl">{s.v}</div>
              <div className="text-[10px] text-muted-foreground md:text-xs">{s.l}</div>
            </div>
          ))}
        </div>

        {/* Commission info */}
        <p className="mt-2 text-xs text-muted-foreground">
          Commission rate: <span className="font-semibold text-foreground">{commissionPct}%</span> per delivery ·
          All-time earned: <span className="font-semibold text-emerald-600">₹{totalEarnings}</span>
        </p>

        {/* Active deliveries */}
        <h2 className="mt-10 font-[Fraunces] text-2xl font-bold">Active Deliveries</h2>

        {ordersLoading ? (
          <div className="mt-6 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (readyOrders.length === 0 && activeOrders.length === 0) ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            No active deliveries. Accepted orders appear here instantly.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <AnimatePresence>
              {[...readyOrders, ...activeOrders].map((o, i) => (
                <motion.div key={o.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }} transition={{ delay: i * 0.04 }}
                  className={`rounded-2xl border-2 p-4 transition-colors duration-500 ${
                    o.status === "Out for delivery" ? "border-emerald-400/40 bg-emerald-500/10" : "border-primary/30 bg-primary/5"
                  }`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{o.id.slice(0, 8).toUpperCase()}</span>
                        <StatusPill s={o.status} />
                      </div>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="text-sm font-semibold">{o.room}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="text-sm font-semibold uppercase">{o.payment_method}
                            <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                              o.payment_status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                            }`}>{o.payment_status}</span>
                          </span>
                        </div>
                      </div>
                      <div className="mt-1 text-sm font-semibold">{o.customer} · ₹{o.total}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{o.items.map(it => `${it.name} ×${it.qty}`).join(", ")}</div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2">
                      <button
                        onClick={() => {
                          const dest = encodeURIComponent(o.room);
                          if (!navigator.geolocation) { window.open(`https://www.google.com/maps/dir//${dest}`, "_blank"); return; }
                          navigator.geolocation.getCurrentPosition(
                            ({ coords }) => window.open(`https://www.google.com/maps/dir/${coords.latitude},${coords.longitude}/${dest}`, "_blank"),
                            () => window.open(`https://www.google.com/maps/dir//${dest}`, "_blank"),
                            { enableHighAccuracy: true, timeout: 8000 }
                          );
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-accent">
                        <Navigation className="h-3.5 w-3.5" /> Navigate
                      </button>
                      {o.status === "Ready" && (
                        <button onClick={() => updateOrderStatus(o.id, "Out for delivery" as OrderStatus)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-full gradient-primary px-3 py-2 text-xs font-bold text-primary-foreground shadow-elegant">
                          <Bike className="h-3.5 w-3.5" /> Picked Up
                        </button>
                      )}
                      {o.status === "Out for delivery" && (
                        <button onClick={() => updateOrderStatus(o.id, "Delivered" as OrderStatus)}
                          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-elegant">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Delivered
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Delivery History (all time, not just today) */}
        {allDelivered.length > 0 && (
          <>
            <div className="mt-10 flex items-center justify-between">
              <h2 className="font-[Fraunces] text-2xl font-bold flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Delivery History
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-sm font-semibold text-muted-foreground">
                  {allDelivered.length}
                </span>
              </h2>
              <button onClick={() => setShowAllHistory(v => !v)}
                className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent transition">
                {showAllHistory ? <><ChevronUp className="h-3.5 w-3.5" /> Today only</> : <><ChevronDown className="h-3.5 w-3.5" /> All time</>}
              </button>
            </div>
            <div className="mt-4 space-y-2">
              <AnimatePresence>
                {historyToShow.map((o, i) => (
                  <motion.div key={o.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className="flex items-center justify-between rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{o.id.slice(0, 8).toUpperCase()}</span>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{o.room}</span>
                      </div>
                      <div className="mt-0.5 text-sm font-semibold">{o.customer} · ₹{o.total}</div>
                      {o.created_at && (
                        <div className="text-xs text-muted-foreground">
                          {new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          {" · "}
                          {new Date(o.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="rounded-full bg-emerald-600/10 px-2.5 py-1 text-xs font-semibold text-emerald-600">Delivered ✓</span>
                      <span className="text-xs text-muted-foreground">+₹{Math.round(o.total * commissionPct / 100)} earned</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {!showAllHistory && allDelivered.length > deliveredToday.length && (
                <p className="pt-1 text-center text-xs text-muted-foreground">
                  +{allDelivered.length - deliveredToday.length} more from previous days —{" "}
                  <button onClick={() => setShowAllHistory(true)} className="text-primary hover:underline font-semibold">show all</button>
                </p>
              )}
            </div>
          </>
        )}
      </section>
    </SiteShell>
  );
}
