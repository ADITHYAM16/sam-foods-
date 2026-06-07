import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Bell, CheckCircle2, IndianRupee, Loader2, MapPin, Navigation, Package, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SiteShell } from "@/components/site/SiteShell";
import { useAuth } from "@/lib/auth-context";
import { useDeliveryOrders, updateOrderStatus, type OrderStatus } from "@/lib/orders-store";

export const Route = createFileRoute("/delivery")({
  component: DeliveryPage,
  head: () => ({ meta: [{ title: "Delivery Partner — SAM Foods" }] }),
});

function StatusPill({ s }: { s: string }) {
  const map: Record<string, string> = {
    Ready: "bg-amber-500/10 text-amber-600",
    "Out for delivery": "bg-blue-500/10 text-blue-600",
    Delivered: "bg-emerald-600/10 text-emerald-600",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${map[s] || "bg-muted text-foreground"}`}>
      {s}
    </span>
  );
}

function DeliveryPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { orders, loading: ordersLoading, newAlert, clearAlert } = useDeliveryOrders();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/owner/login" });
    if (!loading && user && user.role !== "delivery") navigate({ to: "/" });
  }, [user, loading, navigate]);

  const activeOrders = orders.filter(o => o.status === "Ready" || o.status === "Out for delivery");
  const deliveredOrders = orders.filter(o => o.status === "Delivered");

  const todayEarnings = deliveredOrders.reduce((s, o) => s + Math.round(o.total * 0.08), 0);

  const stats = [
    { l: "Today's Earnings", v: `₹${todayEarnings}`, i: IndianRupee, color: "text-emerald-600", bg: "bg-emerald-500/10" },
    { l: "Active Drops", v: String(activeOrders.length), i: Package, color: "text-blue-600", bg: "bg-blue-500/10" },
    { l: "Delivered Today", v: String(deliveredOrders.length), i: CheckCircle2, color: "text-purple-600", bg: "bg-purple-500/10" },
  ];

  if (loading || !user) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-border border-t-primary" />
    </div>
  );

  return (
    <SiteShell>
      <section className="mx-auto max-w-6xl px-4 py-10 md:px-6">

        {/* New order alert banner */}
        <AnimatePresence>
          {newAlert && (
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-400/40 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
                </span>
                <Bell className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  New order ready — {newAlert.customer}, Room {newAlert.room} · ₹{newAlert.total}
                </span>
              </div>
              <button onClick={clearAlert} className="grid h-6 w-6 place-items-center rounded-full hover:bg-amber-100 dark:hover:bg-amber-900">
                <X className="h-3.5 w-3.5 text-amber-600" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-primary">Delivery Partner</div>
            <h1 className="font-[Fraunces] text-3xl font-black md:text-5xl">
              Hey {user.name.split(" ")[0]} 👋
            </h1>
            <p className="mt-1 text-muted-foreground">
              {activeOrders.length === 0
                ? "No active deliveries right now."
                : `${activeOrders.length} active deliver${activeOrders.length === 1 ? "y" : "ies"} in your zone.`}
            </p>
          </div>
          {/* Realtime indicator */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-emerald-600">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Live
          </span>
        </div>

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

        {/* Active deliveries */}
        <h2 className="mt-10 font-[Fraunces] text-2xl font-bold">Active Deliveries</h2>

        {ordersLoading ? (
          <div className="mt-6 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : activeOrders.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            No active deliveries. Orders marked "Ready" by the kitchen will appear here instantly.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <AnimatePresence>
              {activeOrders.map((o, i) => (
                <motion.div
                  key={o.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{o.id}</span>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          Room {o.room}
                        </span>
                        <span className="text-[10px] text-muted-foreground">· {o.delivery_time}</span>
                        <StatusPill s={o.status} />
                      </div>
                      <div className="mt-1 font-semibold">{o.customer} · ₹{o.total}</div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {o.items.map(i => `${i.name} ×${i.qty}`).join(", ")}
                      </div>
                      {o.created_at && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Ordered at {new Date(o.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      )}
                      <div className="mt-1 text-xs text-muted-foreground capitalize">
                        Payment: <span className="font-medium">{o.payment_method?.toUpperCase()} · {o.payment_status}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2">
                      <a
                        href={`https://maps.google.com/?q=Room+${o.room}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-accent"
                      >
                        <Navigation className="h-3.5 w-3.5" /> Navigate
                      </a>
                      <button
                        onClick={() => updateOrderStatus(
                          o.id,
                          o.status === "Ready" ? "Out for delivery" : "Delivered" as OrderStatus
                        )}
                        className="rounded-full gradient-primary px-3 py-2 text-xs font-bold text-primary-foreground shadow-elegant"
                      >
                        {o.status === "Ready" ? "🚴 Pick up" : "✓ Mark delivered"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Delivered today */}
        {deliveredOrders.length > 0 && (
          <>
            <h2 className="mt-10 font-[Fraunces] text-2xl font-bold">Delivered Today</h2>
            <div className="mt-4 space-y-2">
              <AnimatePresence>
                {deliveredOrders.map((o, i) => (
                  <motion.div
                    key={o.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center justify-between rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{o.id}</span>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Room {o.room}</span>
                      </div>
                      <div className="mt-0.5 text-sm font-semibold">{o.customer} · ₹{o.total}</div>
                      {o.created_at && (
                        <div className="text-xs text-muted-foreground">
                          {new Date(o.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="rounded-full bg-emerald-600/10 px-2.5 py-1 text-xs font-semibold text-emerald-600">
                        Delivered ✓
                      </span>
                      <span className="text-xs text-muted-foreground">
                        +₹{Math.round(o.total * 0.08)} earned
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </section>
    </SiteShell>
  );
}
