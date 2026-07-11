import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCircle, CheckCircle2, IndianRupee, Loader2, MapPin, Navigation, Package, X, XCircle, Activity } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { updateOrderStatus, type OrderStatus, type Order } from "@/lib/orders-store";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import type { CartItem } from "@/lib/orders-store";

function StatusPill({ s }: { s: string }) {
  const map: Record<string, string> = {
    Delivered: "bg-emerald-600/10 text-emerald-600",
    "Out for delivery": "bg-blue-500/10 text-blue-600",
    Ready: "bg-amber-500/10 text-amber-600",
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${map[s] || "bg-muted text-foreground"}`}>{s}</span>;
}

interface DeliveryRequest {
  id: string;
  order_id: string;
  status: "pending" | "accepted" | "denied";
  order: Order | null;
}

function useDeliveryRequests(agentId: string | null, onAccepted: (order: Order) => void) {
  const [requests, setRequests] = useState<DeliveryRequest[]>([]);

  const loadRequests = useCallback(async () => {
    if (!agentId) return;
    const { data } = await supabase
      .from("delivery_requests" as any)
      .select("id, order_id, status")
      .eq("agent_id", agentId)
      .eq("status", "pending");
    if (!data) return;

    const withOrders = await Promise.all(
      (data as any[]).map(async (r) => {
        const { data: od } = await supabase
          .from("orders")
          .select("*")
          .eq("id", r.order_id)
          .single();
        return {
          id: r.id,
          order_id: r.order_id,
          status: r.status,
          order: od ? { ...od, items: od.items as unknown as CartItem[] } as Order : null,
        };
      })
    );
    setRequests(withOrders.filter(r => r.order !== null));
  }, [agentId]);

  useEffect(() => {
    loadRequests();
    if (!agentId) return;
    const ch = supabase
      .channel(`delivery-req-${agentId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "delivery_requests", filter: `agent_id=eq.${agentId}` },
        () => {
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.value = 880;
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
            osc.start(); osc.stop(ctx.currentTime + 0.4);
          } catch {}
          loadRequests();
        }
      )
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "delivery_requests", filter: `agent_id=eq.${agentId}` },
        ({ new: row }) => {
          const r = row as any;
          if (r.status !== "pending") setRequests(prev => prev.filter(x => x.id !== r.id));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadRequests, agentId]);

  async function acceptRequest(req: DeliveryRequest) {
    if (!agentId || !req.order) return;
    await (supabase.from("delivery_requests") as any)
      .update({ status: "accepted" })
      .eq("id", req.id);
    await (supabase.from("orders") as any)
      .update({ delivery_agent_id: agentId, status: "Out for delivery" })
      .eq("id", req.order_id);
    // Immediately push the accepted order into active deliveries without waiting for realtime
    const acceptedOrder: Order = { ...req.order, delivery_agent_id: agentId, status: "Out for delivery" };
    onAccepted(acceptedOrder);
    setRequests(prev => prev.filter(x => x.id !== req.id));
  }

  async function denyRequest(req: DeliveryRequest) {
    await (supabase.from("delivery_requests") as any)
      .update({ status: "denied" })
      .eq("id", req.id);
    setRequests(prev => prev.filter(x => x.id !== req.id));
  }

  return { requests, acceptRequest, denyRequest };
}

function useTodayDeliveryOrders(agentId: string | null) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayISO = todayStart.toISOString();

  const fetch = useCallback(async () => {
    if (!agentId) { setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("delivery_agent_id", agentId)
        .in("status", ["Out for delivery", "Delivered"])
        .gte("created_at", todayISO)
        .order("created_at", { ascending: false });
      if (!error && data)
        setOrders((data as any[]).map((o) => ({ ...o, items: o.items as unknown as CartItem[] })) as Order[]);
    } finally {
      setLoading(false);
    }
  }, [agentId, todayISO]);

  const addOrder = useCallback((order: Order) => {
    setOrders(prev => prev.some(o => o.id === order.id) ? prev.map(o => o.id === order.id ? order : o) : [order, ...prev]);
  }, []);

  useEffect(() => {
    fetch();
    const channel = supabase
      .channel(`delivery-orders-${agentId}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        ({ new: row }) => {
          const o = row as any;
          // Only touch orders that belong to this agent
          if (o.delivery_agent_id !== agentId) return;
          const updated: Order = { ...o, items: o.items as unknown as CartItem[] };
          if (o.status === "Out for delivery" || o.status === "Delivered") {
            setOrders(prev =>
              prev.some(x => x.id === o.id)
                ? prev.map(x => x.id === o.id ? updated : x)
                : [updated, ...prev]
            );
          } else {
            // Removed from active list (e.g. cancelled)
            setOrders(prev => prev.filter(x => x.id !== o.id));
          }
        }
      )
      .on("postgres_changes",
        { event: "DELETE", schema: "public", table: "orders" },
        ({ old: row }) => setOrders(prev => prev.filter(x => x.id !== (row as any).id))
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetch]);

  return { orders, loading, addOrder };
}

type AdminTab = "dashboard" | "agents";

export function DeliveryDashboard({ onNavigate }: { onNavigate?: (tab: AdminTab) => void }) {
  const { user } = useAuth();
  const agentId = user?.id ?? null;
  const { orders, loading, addOrder } = useTodayDeliveryOrders(agentId);
  const { requests, acceptRequest, denyRequest } = useDeliveryRequests(agentId, addOrder);

  const [activeDeliveryTab, setActiveDeliveryTab] = useState<"requests" | "deliveries" | "history" | null>(null);

  const activeOrders = orders.filter((o) => o.status === "Out for delivery");
  const deliveredOrders = orders.filter((o) => o.status === "Delivered");
  const todayEarnings = deliveredOrders.reduce((s, o) => s + Math.round(o.total * 0.08), 0);

  const stats = [
    { label: "Today's Earnings", value: `₹${todayEarnings}`, icon: IndianRupee, color: "text-emerald-600", bg: "bg-emerald-500/10" },
    { label: "Active Drops", value: String(activeOrders.length), icon: Package, color: "text-blue-600", bg: "bg-blue-500/10" },
    { label: "Delivered Today", value: String(deliveredOrders.length), icon: CheckCircle2, color: "text-purple-600", bg: "bg-purple-500/10" },
  ];

  const handleTabChange = (tab: "home" | "requests" | "deliveries" | "history") => {
    if (tab === "home") {
      setActiveDeliveryTab(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setActiveDeliveryTab(tab);
    const el = document.getElementById(tab);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  return (
    <AdminShell 
      activeTab="delivery" 
      onNavigate={onNavigate}
      activeDeliveryTab={activeDeliveryTab}
      onDeliveryTabChange={handleTabChange}
    >
      <section className="mx-auto max-w-5xl px-4 py-10 md:px-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div>
            <div className="text-xs uppercase tracking-wider text-primary">Delivery Agent</div>
            <h1 className="font-[Fraunces] text-4xl font-black md:text-5xl">Delivery Dashboard</h1>
            <p className="mt-1 text-muted-foreground">Today's deliveries — live from the kitchen.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-600">
            <Activity className="h-3.5 w-3.5 animate-pulse" />
            Live Sync
          </span>
        </div>

        {/* Stats */}
        <div className="mb-10 grid gap-4 sm:grid-cols-3">
          {stats.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className={`grid h-10 w-10 place-items-center rounded-xl ${s.bg}`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div className="mt-3 text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* ── Incoming delivery requests ── */}
        <div id="requests" className="scroll-mt-20">
          <AnimatePresence>
            {requests.map((req) => req.order && (
              <motion.div key={req.id}
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                className="mb-3 rounded-2xl border border-amber-400/40 bg-amber-50 dark:bg-amber-950/30 p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <span className="relative flex h-3 w-3 shrink-0 mt-1">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-amber-600" />
                        <span className="text-sm font-bold text-amber-800 dark:text-amber-300">
                          New delivery request!
                        </span>
                      </div>
                      <div className="mt-1 text-sm font-semibold">{req.order.customer} · Room {req.order.room} · ₹{req.order.total}</div>
                      <div className="mt-0.5 text-xs text-amber-700/80 dark:text-amber-400">
                        {req.order.items.map(i => `${i.name} ×${i.qty}`).join(", ")}
                      </div>
                      <div className="mt-0.5 text-xs text-amber-700/80 dark:text-amber-400">
                        Payment: {(req.order as any).payment_method?.toUpperCase()} · {(req.order as any).payment_status}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => acceptRequest(req)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition">
                      <CheckCircle className="h-3.5 w-3.5" /> Accept
                    </button>
                    <button onClick={() => denyRequest(req)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-destructive px-3 py-2 text-xs font-bold text-white hover:opacity-90 transition">
                      <XCircle className="h-3.5 w-3.5" /> Deny
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Active deliveries */}
        <div id="deliveries" className="scroll-mt-20">
          <h2 className="mt-6 font-[Fraunces] text-2xl font-bold">Active Deliveries</h2>

          {loading ? (
            <div className="mt-6 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : activeOrders.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
              No active deliveries. Orders marked "Ready" by kitchen appear here instantly.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <AnimatePresence>
                {activeOrders.map((o, i) => (
                  <motion.div key={o.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ delay: i * 0.04 }}
                    className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-muted-foreground">{o.id}</span>
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Room {o.room}</span>
                          <StatusPill s={o.status} />
                        </div>
                        <div className="mt-1 font-semibold">{o.customer} · ₹{o.total}</div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {o.items.map((i) => `${i.name} ×${i.qty}`).join(", ")}
                        </div>
                        {o.created_at && (
                          <div className="mt-0.5 text-xs font-medium text-primary/80">
                            Ordered: {new Date(o.created_at).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: true })}
                          </div>
                        )}
                        <div className="mt-0.5 text-xs text-muted-foreground capitalize">
                          Payment: <span className="font-medium">{(o as any).payment_method?.toUpperCase()} · {(o as any).payment_status}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0 mt-2 sm:mt-0">
                        <a
                          href={
                            o.delivery_lat && o.delivery_lng
                              ? `https://www.google.com/maps/dir/?api=1&destination=${o.delivery_lat},${o.delivery_lng}`
                              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.room)}`
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2.5 text-xs font-semibold hover:bg-accent active:scale-95 transition touch-manipulation min-h-[40px]"
                        >
                          <Navigation className="h-3.5 w-3.5" /> Navigate
                        </a>
                        <button
                          onClick={() => updateOrderStatus(o.id, "Delivered" as OrderStatus)}
                          className="rounded-full gradient-primary px-4 py-2.5 text-xs font-bold text-primary-foreground shadow-elegant active:scale-95 transition touch-manipulation min-h-[40px]"
                        >
                          ✓ Mark delivered
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Delivered today */}
        <div id="history" className="scroll-mt-20">
          {deliveredOrders.length > 0 && (
            <>
              <h2 className="mt-10 font-[Fraunces] text-2xl font-bold">Delivered Today</h2>
              <div className="mt-4 space-y-2">
                {deliveredOrders.map((o, i) => (
                  <motion.div key={o.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className="flex items-center justify-between rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{o.id}</span>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Room {o.room}</span>
                      </div>
                      <div className="mt-0.5 text-sm font-semibold">{o.customer} · ₹{o.total}</div>
                      {o.created_at && (
                        <div className="text-xs font-semibold text-muted-foreground">
                          {new Date(o.created_at).toLocaleString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="rounded-full bg-emerald-600/10 px-2.5 py-1 text-xs font-semibold text-emerald-600">Delivered ✓</span>
                      <span className="text-xs text-muted-foreground">+₹{Math.round(o.total * 0.08)} earned</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </AdminShell>
  );
}
