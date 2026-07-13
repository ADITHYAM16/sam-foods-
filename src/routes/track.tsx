import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bike, CheckCircle2, ChefHat, Package, PackageCheck, Phone, Loader2, XCircle, Ban, ArrowLeft, Clock as ClockIcon } from "lucide-react";
import { motion } from "framer-motion";
import { SiteShell } from "@/components/site/SiteShell";
import { supabase } from "@/integrations/supabase/client";

const CONTACT_PHONE = import.meta.env.VITE_CONTACT_PHONE || "+91 84382 78584";
import { useMyOrders, cancelOrder } from "@/lib/orders-store";
import { useAuth } from "@/lib/auth-context";
import type { OrderStatus } from "@/lib/orders-store";
import type { CartItem } from "@/lib/cart-context";

export const Route = createFileRoute("/track")({
  validateSearch: (s: Record<string, unknown>) => ({ orderId: s.orderId as string | undefined }),
  component: TrackPage,
  head: () => ({ meta: [{ title: "Track your order — SAM Foods" }] }),
});

const STAGES: { key: OrderStatus; label: string; icon: React.ElementType; time: string }[] = [
  { key: "Placed", label: "Order Placed", icon: Package, time: "Just now" },
  { key: "Preparing", label: "Preparing", icon: ChefHat, time: "~12 min" },
  { key: "Ready", label: "Ready to deliver", icon: PackageCheck, time: "~3 min" },
  { key: "Out for delivery", label: "Out for delivery", icon: Bike, time: "~8 min" },
  { key: "Delivered", label: "Delivered", icon: CheckCircle2, time: "" },
];

const CANCEL_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

function useCancelCountdown(createdAt: string | undefined) {
  const [secsLeft, setSecsLeft] = useState(0);

  useEffect(() => {
    if (!createdAt) return;
    const tick = () => {
      const elapsed = Date.now() - new Date(createdAt).getTime();
      const remaining = Math.max(0, Math.ceil((CANCEL_WINDOW_MS - elapsed) / 1000));
      setSecsLeft(remaining);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [createdAt]);

  return secsLeft;
}

const STATUS_COLOR: Record<string, string> = {
  Placed: "bg-violet-500/10 text-violet-600",
  Preparing: "bg-amber-500/10 text-amber-600",
  Ready: "bg-blue-500/10 text-blue-600",
  "Out for delivery": "bg-blue-600/10 text-blue-700",
  Delivered: "bg-emerald-600/10 text-emerald-600",
  Cancelled: "bg-destructive/10 text-destructive",
};

function TrackPage() {
  const { orderId } = Route.useSearch();
  const { user } = useAuth();
  const navigate = useNavigate();
  const myOrders = useMyOrders(user?.id);
  const [order, setOrder] = useState<{
    id: string; status: OrderStatus; customer: string; room: string;
    items: CartItem[]; total: number; delivery_time: string;
    payment_method?: string; created_at: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelErr, setCancelErr] = useState<string | null>(null);

  const secsLeft = useCancelCountdown(order?.created_at);
  const canCancel = secsLeft > 0 && order?.status === "Placed";

  // Fetch order by orderId immediately, subscribe to realtime at the same time
  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    // Subscribe to realtime FIRST so we never miss an update while fetching
    const channel = supabase
      .channel(`track-${orderId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` }, (payload: any) => {
        setOrder(prev => prev ? { ...prev, ...payload.new, items: payload.new.items as unknown as CartItem[] } : prev);
      })
      .subscribe();

    // Fetch from DB directly — always fresh, no dependency on myOrders cache
    (supabase.from("orders") as any)
      .select("*").eq("id", orderId).single()
      .then(({ data }: any) => {
        if (cancelled) return;
        if (data) setOrder({ ...data, items: data.items as unknown as CartItem[] });
        setLoading(false);
      });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  // Sync any status updates that arrive via myOrders realtime
  useEffect(() => {
    if (!orderId || !myOrders.length) return;
    const updated = myOrders.find(o => o.id === orderId);
    if (updated) setOrder(updated as any);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myOrders]);

  const handleCancel = async () => {
    if (!order || !canCancel) return;
    setCancelling(true);
    setCancelErr(null);
    try {
      await cancelOrder(order.id);
      setOrder(prev => prev ? { ...prev, status: "Cancelled" } : prev);
    } catch (e) {
      setCancelErr(e instanceof Error ? e.message : "Failed to cancel.");
    } finally {
      setCancelling(false);
    }
  };

  const stepIndex = order ? STAGES.findIndex((s) => s.key === order.status) : 0;
  const isCancelled = order?.status === "Cancelled";

  if (loading) {
    return (
      <SiteShell>
        <div className="grid min-h-[60vh] place-items-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </SiteShell>
    );
  }

  // No orderId specified — show all orders list
  if (!orderId && !order) {
    const activeOrders = myOrders.filter(o => !["Delivered", "Cancelled"].includes(o.status));
    const recentOrders = myOrders.slice(0, 10);
    return (
      <SiteShell>
        <section className="mx-auto max-w-4xl px-4 py-12 md:px-6">
          <div className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-primary">Track</div>
          <h1 className="font-[Fraunces] text-3xl font-black md:text-5xl">Your Orders</h1>
          {!user && (
            <div className="mt-6 rounded-3xl border border-dashed border-border bg-card p-12 text-center">
              <Package className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-lg font-semibold">Sign in to track your orders</p>
              <Link to="/login" search={{ redirect: "/track" } as any} className="mt-4 inline-flex rounded-full gradient-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground">
                Sign in
              </Link>
            </div>
          )}
          {user && activeOrders.length === 0 && recentOrders.length === 0 && (
            <div className="mt-6 rounded-3xl border border-dashed border-border bg-card p-16 text-center">
              <Package className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-lg font-semibold">No orders yet.</p>
              <Link to="/" className="mt-4 inline-flex rounded-full gradient-primary px-6 py-3 font-semibold text-primary-foreground shadow-elegant">Order now</Link>
            </div>
          )}
          {user && recentOrders.length > 0 && (
            <div className="mt-6 space-y-3">
              {activeOrders.length > 0 && (
                <div className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-700 dark:text-amber-400">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
                  </span>
                  {activeOrders.length} active order{activeOrders.length !== 1 ? "s" : ""}
                </div>
              )}
              {recentOrders.map(o => (
                <button
                  key={o.id}
                  onClick={() => navigate({ to: "/track", search: { orderId: o.id } as any })}
                  className="flex w-full items-start gap-4 rounded-2xl border border-border bg-card p-4 text-left transition hover:border-primary/40 hover:shadow-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{o.id.slice(0, 8).toUpperCase()}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLOR[o.status] ?? "bg-muted"}`}>{o.status}</span>
                      {!["Delivered", "Cancelled"].includes(o.status) && (
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                        </span>
                      )}
                    </div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">{o.items.map(it => `${it.name} ×${it.qty}`).join(", ")}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">📍 {o.room}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-bold">₹{o.total}</div>
                    <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
                  </div>
                </button>
              ))}
              <Link to="/orders" className="block pt-2 text-center text-sm font-semibold text-primary hover:underline">View full order history →</Link>
            </div>
          )}
        </section>
      </SiteShell>
    );
  }

  if (!order) {
    return (
      <SiteShell>
        <section className="mx-auto max-w-5xl px-4 py-12 md:px-6">
          <div className="rounded-3xl border border-dashed border-border bg-card p-16 text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-lg font-semibold">Order not found.</p>
            <Link to="/track" search={{ orderId: undefined } as any} className="mt-6 inline-flex rounded-full gradient-primary px-6 py-3 font-semibold text-primary-foreground shadow-elegant">View all orders</Link>
          </div>
        </section>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <section className="mx-auto max-w-5xl px-4 py-12 md:px-6">
        <button
          onClick={() => navigate({ to: "/track", search: { orderId: undefined } as any })}
          className="mb-4 flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-4 w-4" /> All orders
        </button>
        <div className={`rounded-3xl border p-6 shadow-elegant md:p-10 transition-colors duration-700 ${
          order.status === "Delivered"
            ? "border-emerald-500/40 bg-emerald-500/15"
            : order.status === "Out for delivery"
            ? "border-emerald-400/30 bg-emerald-500/8"
            : "border-border bg-card"
        }`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Order {order.id}</div>
              <h1 className="font-[Fraunces] text-3xl font-black md:text-4xl">
                {isCancelled ? "Order Cancelled" : order.status === "Delivered" ? "Order delivered! 🎉" : "Your food is on its way"}
              </h1>
              <p className="mt-1 text-muted-foreground">
                Room <b className="text-foreground">{order.room}</b> · {order.delivery_time === "ASAP" ? "ASAP delivery" : `Scheduled at ${order.delivery_time}`}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {order.items.map((i) => `${i.name} ×${i.qty}`).join(", ")} · <b className="text-foreground">₹{order.total}</b>
                {order.payment_method && (
                  <span className="ml-2 inline-flex rounded-full bg-accent px-2 py-0.5 text-[10px] uppercase tracking-wide">
                    {order.payment_method === "gpay" ? "GPay / UPI" : "Pay on Delivery"}
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <a href={`tel:${CONTACT_PHONE.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-accent">
                <Phone className="h-4 w-4" /> Call SAM Foods
              </a>

              {/* 5-min cancellation button */}
              {!isCancelled && order.status === "Placed" && (
                <div className="flex flex-col items-end gap-1">
                  <button
                    onClick={handleCancel}
                    disabled={!canCancel || cancelling}
                    className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                      canCancel
                        ? "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20"
                        : "border-border bg-background text-muted-foreground opacity-50 cursor-not-allowed"
                    }`}
                  >
                    {cancelling
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> Cancelling…</>
                      : <><XCircle className="h-4 w-4" /> Cancel order</>
                    }
                  </button>
                  {canCancel ? (
                    <span className="text-xs text-muted-foreground">
                      Cancel window closes in <b className="text-destructive">{Math.floor(secsLeft / 60)}:{String(secsLeft % 60).padStart(2, "0")}</b>
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Cancellation window expired</span>
                  )}
                  {cancelErr && <p className="text-xs text-destructive">{cancelErr}</p>}
                </div>
              )}
            </div>
          </div>

          {/* Cancelled state */}
          {isCancelled ? (
            <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 py-10 text-center">
              <Ban className="h-12 w-12 text-destructive" />
              <p className="font-[Fraunces] text-xl font-bold text-destructive">This order has been cancelled.</p>
              <Link to="/" className="mt-2 inline-flex rounded-full gradient-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-elegant">Order again</Link>
            </div>
          ) : (
            <div className="relative mt-10">
              <div className="absolute left-5 top-5 bottom-5 w-1 rounded-full bg-border" />
              <motion.div
                className="absolute left-5 top-5 w-1 rounded-full gradient-primary"
                initial={{ height: 0 }}
                animate={{ height: `${(stepIndex / (STAGES.length - 1)) * 100}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
              <ol className="space-y-6 pl-16">
                {STAGES.map((s, i) => {
                  const active = i <= stepIndex;
                  const isCurrent = i === stepIndex;
                  const Icon = s.icon;
                  return (
                    <li key={s.key} className="relative">
                      <div className={`absolute -left-16 top-0 z-10 grid h-10 w-10 place-items-center rounded-full border-2 transition ${active ? "border-transparent gradient-primary text-primary-foreground shadow-glow" : "border-border bg-card text-muted-foreground"}`}>
                        <Icon className="h-4 w-4" />
                        {isCurrent && <span className="absolute inset-0 animate-ping rounded-full gradient-primary opacity-40" />}
                      </div>
                      <div className="pt-1">
                        <div className={`font-[Fraunces] text-base font-bold ${active ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</div>
                        {s.time && <div className="text-sm text-muted-foreground">{s.time}</div>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {!isCancelled && (
            <div className="mt-10 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              Want to order something else?{" "}
              <Link to="/" className="font-semibold text-primary hover:underline">Back to menu</Link>
            </div>
          )}
        </div>
      </section>
    </SiteShell>
  );
}
