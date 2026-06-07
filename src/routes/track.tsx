import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bike, CheckCircle2, ChefHat, Package, PackageCheck, Phone, Loader2, XCircle, Ban } from "lucide-react";
import { motion } from "framer-motion";
import { SiteShell } from "@/components/site/SiteShell";
import { supabase } from "@/integrations/supabase/client";
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

function TrackPage() {
  const { orderId } = Route.useSearch();
  const { user } = useAuth();
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

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      if (orderId) {
        // Always try to fetch by orderId first (works for guests and logged-in users)
        const { data } = await (supabase.from("orders") as any).select("*").eq("id", orderId).single();
        if (data) {
          setOrder({ ...(data as any), items: (data as any).items as unknown as CartItem[] });
        }
      } else if (user && myOrders.length > 0) {
        // Fallback: show most recent order for logged-in user
        const o = myOrders[0] as any;
        setOrder(o);
      }
      setLoading(false);
    };
    load();
  }, [orderId, myOrders, user]);

  useEffect(() => {
    if (!order?.id) return;
    const channel = supabase
      .channel(`track-${order.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${order.id}` }, (payload) => {
        setOrder((prev) => prev ? { ...prev, status: payload.new.status as OrderStatus } : prev);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [order?.id]);

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

  if (!order) {
    return (
      <SiteShell>
        <section className="mx-auto max-w-5xl px-4 py-12 md:px-6">
          <div className="rounded-3xl border border-dashed border-border bg-card p-16 text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-lg font-semibold">No active order found.</p>
            <Link to="/" className="mt-6 inline-flex rounded-full gradient-primary px-6 py-3 font-semibold text-primary-foreground shadow-elegant">Order now</Link>
          </div>
        </section>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <section className="mx-auto max-w-5xl px-4 py-12 md:px-6">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-elegant md:p-10">
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
              <a href="tel:+919876543210" className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-accent">
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
