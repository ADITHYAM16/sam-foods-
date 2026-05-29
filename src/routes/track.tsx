import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bike, CheckCircle2, ChefHat, Package, PackageCheck, Phone, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { SiteShell } from "@/components/site/SiteShell";
import { supabase } from "@/integrations/supabase/client";
import { useMyOrders } from "@/lib/orders-store";
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

function TrackPage() {
  const { orderId } = Route.useSearch();
  const { user } = useAuth();
  const myOrders = useMyOrders(user?.id);
  const [order, setOrder] = useState<{ id: string; status: OrderStatus; customer: string; room: string; items: CartItem[]; total: number; delivery_time: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Load order — from URL param or latest user order
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      if (orderId) {
        const { data } = await supabase.from("orders").select("*").eq("id", orderId).single();
        if (data) setOrder({ ...data, items: data.items as unknown as CartItem[] });
      } else if (myOrders.length > 0) {
        const o = myOrders[0];
        setOrder(o as typeof order);
      }
      setLoading(false);
    };
    load();
  }, [orderId, myOrders]);

  // Real-time status updates
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

  const stepIndex = order ? STAGES.findIndex((s) => s.key === order.status) : 0;

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
                {order.status === "Delivered" ? "Order delivered! 🎉" : "Your food is on its way"}
              </h1>
              <p className="mt-1 text-muted-foreground">
                Room <b className="text-foreground">{order.room}</b> · {order.delivery_time === "ASAP" ? "ASAP delivery" : `Scheduled at ${order.delivery_time}`}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {order.items.map((i) => `${i.name} ×${i.qty}`).join(", ")} · <b className="text-foreground">₹{order.total}</b>
              </p>
            </div>
            <a href="tel:+919876543210" className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold hover:bg-accent">
              <Phone className="h-4 w-4" /> Call rider
            </a>
          </div>

          <div className="relative mt-10">
            <div className="absolute left-5 top-5 bottom-5 w-1 rounded-full bg-border md:left-1/2 md:-ml-0.5" />
            <motion.div
              className="absolute left-5 top-5 w-1 rounded-full gradient-primary md:left-1/2 md:-ml-0.5"
              initial={{ height: 0 }}
              animate={{ height: `${(stepIndex / (STAGES.length - 1)) * 100}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
            <ol className="space-y-8">
              {STAGES.map((s, i) => {
                const active = i <= stepIndex;
                const isCurrent = i === stepIndex;
                const Icon = s.icon;
                return (
                  <li key={s.key} className="relative grid grid-cols-[40px_1fr] items-start gap-4 md:grid-cols-2 md:gap-12">
                    <div className={`relative z-10 grid h-10 w-10 place-items-center rounded-full border-2 transition md:col-span-2 md:mx-auto ${active ? "border-transparent gradient-primary text-primary-foreground shadow-glow" : "border-border bg-card text-muted-foreground"}`}>
                      <Icon className="h-4 w-4" />
                      {isCurrent && <span className="absolute inset-0 animate-ping rounded-full gradient-primary opacity-40" />}
                    </div>
                    <div className={`md:absolute md:top-0 ${i % 2 === 0 ? "md:right-[calc(50%+40px)] md:text-right" : "md:left-[calc(50%+40px)]"}`}>
                      <div className={`font-[Fraunces] text-lg font-bold ${active ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</div>
                      {s.time && <div className="text-sm text-muted-foreground">{s.time}</div>}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="mt-10 rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            Want to order something else?{" "}
            <Link to="/" className="font-semibold text-primary hover:underline">Back to menu</Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
