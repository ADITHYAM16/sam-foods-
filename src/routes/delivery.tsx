import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Bell, CheckCircle2, IndianRupee, Loader2, MapPin,
  Navigation, Package, X, Check, Bike, CreditCard, History, ChevronDown, ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import {
  useDeliveryOrders, useDeliveryRequests,
  respondToDeliveryRequest, updateOrderStatus, type OrderStatus,
} from "@/lib/orders-store";
import { supabase } from "@/integrations/supabase/client";
import { playBeep } from "@/lib/beep";
import { AdminShell } from "@/components/AdminShell";

export const Route = createFileRoute("/delivery")(({
  component: DeliveryPage,
  head: () => ({ meta: [{ title: "Delivery Partner — SAM Foods" }] }),
}));

async function fetchCommissionRate(): Promise<number> {
  try {
    const { data } = await (supabase.from("settings") as any)
      .select("value").eq("key", "delivery_commission_pct").maybeSingle();
    if (data?.value) return parseFloat(data.value);
  } catch {}
  return 8;
}

type DeliveryTab = "requests" | "deliveries" | "history";

function DeliveryPage() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<DeliveryTab>("deliveries");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/owner/login" });
    if (!loading && user && user.role !== "delivery") navigate({ to: "/" });
  }, [user, loading, navigate]);

  const { orders, loading: ordersLoading, newAlert, clearAlert } = useDeliveryOrders(user?.id);
  const { request, order: reqOrder } = useDeliveryRequests(user?.id);
  const [responding, setResponding] = useState(false);
  const [deniedIds, setDeniedIds] = useState<string[]>([]);

  const prevReqId = useRef<string | null>(null);
  const ringTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    const id = request?.id ?? null;
    if (id && id !== prevReqId.current) {
      prevReqId.current = id;
      playBeep("delivery");
      if (ringTimer.current) clearInterval(ringTimer.current);
      ringTimer.current = setInterval(() => playBeep("delivery"), 4000);
    } else if (!id && prevReqId.current) {
      prevReqId.current = null;
      if (ringTimer.current) { clearInterval(ringTimer.current); ringTimer.current = null; }
    }
    return () => { if (ringTimer.current) { clearInterval(ringTimer.current); ringTimer.current = null; } };
  }, [request?.id]);

  const [commissionPct, setCommissionPct] = useState(8);
  useEffect(() => { fetchCommissionRate().then(setCommissionPct); }, []);

  const [isOnline, setIsOnline] = useState(true);
  const [togglingOnline, setTogglingOnline] = useState(false);
  useEffect(() => {
    if (!user?.id) return;
    (supabase.from("delivery_agents") as any)
      .select("active").eq("id", user.id).maybeSingle()
      .then(({ data }: any) => { if (data) setIsOnline(!!data.active); });
  }, [user?.id]);

  const toggleOnline = async () => {
    if (!user?.id) return;
    setTogglingOnline(true);
    const next = !isOnline;
    await (supabase.from("delivery_agents") as any).update({ active: next }).eq("id", user.id);
    setIsOnline(next);
    setTogglingOnline(false);
  };

  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!user?.id || !request?.order_id) return;
    (supabase.from("delivery_requests") as any)
      .select("agent_id").eq("order_id", request.order_id).eq("status", "denied")
      .then(({ data }: any) => { if (data) setDeniedIds((data as any[]).map((r: any) => r.agent_id)); });
  }, [request?.order_id, user?.id]);

  const handleRespond = async (accept: boolean) => {
    if (!request || !user) return;
    setResponding(true);
    try { await respondToDeliveryRequest(request.id, request.order_id, user.id, accept, deniedIds); }
    finally { setResponding(false); }
  };

  const handleDeliveryTabChange = (tab: DeliveryTab) => {
    setActiveTab(tab);
  };

  const today = new Date().toISOString().slice(0, 10);
  const activeOrders = orders.filter(o => o.status === "Out for delivery");
  const readyOrders  = orders.filter(o => o.status === "Ready");
  const deliveredToday = orders.filter(o => o.status === "Delivered" && o.created_at?.slice(0, 10) === today);
  const allDelivered = orders.filter(o => o.status === "Delivered");
  const historyList = showHistory ? allDelivered : deliveredToday;
  const todayEarnings = deliveredToday.reduce((s, o) => s + Math.round(o.total * commissionPct / 100), 0);
  const totalEarnings = allDelivered.reduce((s, o) => s + Math.round(o.total * commissionPct / 100), 0);

  if (loading) return null;
  if (!user || user.role !== "delivery") return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-border border-t-primary" />
    </div>
  );

  return (
    <AdminShell activeTab="delivery" activeDeliveryTab={activeTab} onDeliveryTabChange={handleDeliveryTabChange}>
      {/* Mobile bottom tab bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex border-t border-border bg-card/95 backdrop-blur-sm md:hidden">
        {(["requests", "deliveries", "history"] as DeliveryTab[]).map((tab) => {
          const labels = { requests: "Requests", deliveries: "Deliveries", history: "History" };
          const icons = { requests: Bell, deliveries: Bike, history: History };
          const Icon = icons[tab];
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-semibold transition ${
                activeTab === tab ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              {labels[tab]}
            </button>
          );
        })}
      </div>
      <section className="mx-auto max-w-5xl px-4 pb-20 pt-10 md:px-6 md:pb-10">

        {/* Incoming request alert - visible on all tabs */}
        <AnimatePresence>
          {request && reqOrder && (
            <motion.div
              initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              className="mb-5 rounded-2xl border-2 border-amber-400/60 bg-amber-50 p-4 shadow-md"
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-70" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
                </span>
                <Bell className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-bold text-amber-800">New Delivery Request!</span>
              </div>

              <div className="mb-3 space-y-2">
                <div className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2">
                  <MapPin className="h-4 w-4 shrink-0 text-amber-600" />
                  <span className="text-sm font-semibold">{reqOrder.room}</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2">
                  <IndianRupee className="h-4 w-4 shrink-0 text-amber-600" />
                  <span className="text-sm font-bold">₹{reqOrder.total}</span>
                  <span className="ml-1 text-sm font-semibold text-emerald-600">
                    +₹{Math.round(reqOrder.total * commissionPct / 100)} your cut
                  </span>
                </div>
                <div className="rounded-xl bg-white/70 px-3 py-2 text-xs text-muted-foreground">
                  {reqOrder.items.map(it => `${it.name} ×${it.qty}`).join(", ")}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  disabled={responding} onClick={() => handleRespond(true)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full bg-emerald-600 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition disabled:opacity-60"
                >
                  {responding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Accept
                </button>
                <button
                  disabled={responding} onClick={() => handleRespond(false)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full border-2 border-destructive/40 bg-destructive/10 py-2.5 text-sm font-bold text-destructive hover:bg-destructive/20 transition disabled:opacity-60"
                >
                  <X className="h-4 w-4" /> Deny
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Order ready alert */}
        <AnimatePresence>
          {newAlert && (
            <motion.div
              initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-400/40 bg-amber-50 px-4 py-3"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Bell className="h-4 w-4 shrink-0 text-amber-600" />
                <span className="truncate text-sm font-semibold text-amber-800">
                  Ready — {newAlert.customer}, ₹{newAlert.total}
                </span>
              </div>
              <button onClick={clearAlert} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full hover:bg-amber-100">
                <X className="h-3.5 w-3.5 text-amber-600" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* REQUESTS TAB */}
        {activeTab === "requests" && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Live Requests</p>
              <h2 className="font-[Fraunces] text-2xl font-black">Incoming Delivery Requests</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {request ? "You have 1 new delivery request waiting for your response." : "No pending requests right now."}
              </p>
            </div>

            {request && reqOrder ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border-2 border-amber-400/60 bg-amber-50 p-6"
              >
                <div className="mb-4 flex items-center gap-3">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-70" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
                  </span>
                  <h3 className="text-lg font-bold text-amber-900">Delivery Request</h3>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 rounded-xl bg-white/70 px-4 py-3">
                    <MapPin className="h-5 w-5 shrink-0 text-amber-600" />
                    <div>
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="text-sm font-semibold">{reqOrder.room}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl bg-white/70 px-4 py-3">
                    <IndianRupee className="h-5 w-5 shrink-0 text-amber-600" />
                    <div>
                      <p className="text-xs text-muted-foreground">Amount & Commission</p>
                      <p className="text-sm font-semibold">₹{reqOrder.total} • +₹{Math.round(reqOrder.total * commissionPct / 100)} for you</p>
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/70 px-4 py-3">
                    <p className="text-xs text-muted-foreground mb-1">Items</p>
                    <p className="text-sm font-semibold">{reqOrder.items.map(it => `${it.name} ×${it.qty}`).join(", ")}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    disabled={responding} onClick={() => handleRespond(true)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-full bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition disabled:opacity-60"
                  >
                    {responding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Accept Delivery
                  </button>
                  <button
                    disabled={responding} onClick={() => handleRespond(false)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-full border-2 border-destructive/40 bg-destructive/10 py-3 text-sm font-bold text-destructive hover:bg-destructive/20 transition disabled:opacity-60"
                  >
                    <X className="h-4 w-4" /> Decline
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
                <Bell className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No pending delivery requests</p>
                <p className="text-xs text-muted-foreground mt-1">New requests will appear here instantly</p>
              </div>
            )}
          </div>
        )}

        {/* DELIVERIES TAB */}
        {activeTab === "deliveries" && (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Active</p>
              <h2 className="font-[Fraunces] text-2xl font-black">Active Deliveries</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {activeOrders.length + readyOrders.length === 0
                  ? "No active deliveries right now."
                  : `${activeOrders.length + readyOrders.length} active drop${activeOrders.length + readyOrders.length !== 1 ? "s" : ""} in progress.`}
              </p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Earnings", value: `₹${todayEarnings}`, icon: IndianRupee, color: "text-emerald-600", bg: "bg-emerald-500/10" },
                { label: "Active", value: String(activeOrders.length + readyOrders.length), icon: Package, color: "text-blue-600", bg: "bg-blue-500/10" },
                { label: "Delivered", value: String(deliveredToday.length), icon: CheckCircle2, color: "text-purple-600", bg: "bg-purple-500/10" },
              ].map(s => (
                <div key={s.label} className="rounded-2xl border border-border bg-card p-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${s.bg}`}>
                    <s.icon className={`h-4 w-4 ${s.color}`} />
                  </div>
                  <p className="mt-2 text-lg font-black leading-none">{s.value}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Deliveries list */}
            {ordersLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : readyOrders.length === 0 && activeOrders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
                No active deliveries. Accepted orders appear here instantly.
              </div>
            ) : (
              <div className="space-y-3">
                {[...readyOrders, ...activeOrders].map((o, i) => (
                  <motion.div
                    key={o.id}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`rounded-2xl border-2 p-4 ${
                      o.status === "Out for delivery"
                        ? "border-emerald-400/50 bg-emerald-50"
                        : "border-primary/30 bg-primary/5"
                    }`}
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{o.id.slice(0, 8).toUpperCase()}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        o.status === "Out for delivery" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                      }`}>{o.status}</span>
                    </div>

                    <div className="mb-2 space-y-1.5">
                      <div className="flex items-start gap-2">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="text-sm font-semibold leading-tight">{o.room}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="text-sm font-semibold uppercase">{o.payment_method}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                          o.payment_status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        }`}>{o.payment_status}</span>
                      </div>
                      <p className="text-sm font-semibold">{o.customer} · ₹{o.total}</p>
                      <p className="text-xs text-muted-foreground">{o.items.map(it => `${it.name} ×${it.qty}`).join(", ")}</p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          // Get delivery address coords from saved_addresses if available
                          const openNav = (agentLat?: number, agentLng?: number) => {
                            // Use lat/lng from order if stored, else fall back to address text
                            const destCoords = (o as any).delivery_lat && (o as any).delivery_lng
                              ? `${(o as any).delivery_lat},${(o as any).delivery_lng}`
                              : null;
                            const destText = encodeURIComponent(o.room);
                            const origin = agentLat && agentLng ? `${agentLat},${agentLng}` : "";
                            // Google Maps navigation URL — works on all devices
                            const url = destCoords
                              ? `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destCoords}&travelmode=driving`
                              : `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destText}&travelmode=driving`;
                            window.open(url, "_blank");
                          };
                          if (!navigator.geolocation) { openNav(); return; }
                          navigator.geolocation.getCurrentPosition(
                            ({ coords }) => openNav(coords.latitude, coords.longitude),
                            () => openNav(),
                            { enableHighAccuracy: true, timeout: 8000 }
                          );
                        }}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border bg-background py-2 text-xs font-semibold hover:bg-accent transition"
                      >
                        <Navigation className="h-3.5 w-3.5" /> Navigate
                      </button>
                      {o.status === "Ready" && (
                        <button
                          onClick={() => updateOrderStatus(o.id, "Out for delivery" as OrderStatus)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary py-2 text-xs font-bold text-primary-foreground hover:opacity-90 transition"
                        >
                          <Bike className="h-3.5 w-3.5" /> Picked Up
                        </button>
                      )}
                      {o.status === "Out for delivery" && (
                        <button
                          onClick={() => updateOrderStatus(o.id, "Delivered" as OrderStatus)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-emerald-600 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Delivered
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-primary">Past Deliveries</p>
                <h2 className="font-[Fraunces] text-2xl font-black">Delivery History</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {allDelivered.length === 0 ? "No deliveries yet." : `${allDelivered.length} total deliveries`}
                </p>
              </div>
              {allDelivered.length > 0 && (
                <button
                  onClick={() => setShowHistory(v => !v)}
                  className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent transition"
                >
                  {showHistory ? <><ChevronUp className="h-3.5 w-3.5" /> Today</> : <><ChevronDown className="h-3.5 w-3.5" /> All time</>}
                </button>
              )}
            </div>

            {allDelivered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
                <History className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No delivery history yet</p>
                <p className="text-xs text-muted-foreground mt-1">Your completed deliveries will appear here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {historyList.map((o, i) => (
                  <motion.div
                    key={o.id}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center justify-between rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{o.id.slice(0, 8).toUpperCase()}</span>
                        <span className="max-w-[140px] truncate rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{o.room}</span>
                      </div>
                      <p className="mt-0.5 text-sm font-semibold">{o.customer} · ₹{o.total}</p>
                      {o.created_at && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          {" · "}
                          {new Date(o.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                    </div>
                    <div className="ml-3 flex shrink-0 flex-col items-end gap-1">
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Delivered ✓</span>
                      <span className="text-xs text-muted-foreground">+₹{Math.round(o.total * commissionPct / 100)}</span>
                    </div>
                  </motion.div>
                ))}
                {!showHistory && allDelivered.length > deliveredToday.length && (
                  <p className="pt-3 text-center text-xs text-muted-foreground">
                    +{allDelivered.length - deliveredToday.length} more —{" "}
                    <button onClick={() => setShowHistory(true)} className="font-semibold text-primary underline">show all</button>
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="h-8" />
      </section>
    </AdminShell>
  );
}
