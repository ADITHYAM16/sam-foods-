import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bike, IndianRupee, MapPin, Navigation, Package } from "lucide-react";
import { motion } from "framer-motion";
import { SiteShell } from "@/components/site/SiteShell";
import { useAuth } from "@/lib/auth-context";
import { useOrders, updateOrderStatus } from "@/lib/orders-store";

export const Route = createFileRoute("/delivery")({
  component: DeliveryPage,
  head: () => ({ meta: [{ title: "Delivery Partner — SAM Foods" }] }),
});

const INITIAL = [
  { id: "SAM-1030", customer: "Meera K.", address: "12, Ocean Ave, Besant Nagar", items: 5, payout: 62, status: "Picked up" },
  { id: "SAM-1031", customer: "Rahul D.", address: "Flat 4B, Green Towers, T. Nagar", items: 2, payout: 48, status: "Assigned" },
  { id: "SAM-1034", customer: "Priya N.", address: "21, Lake Road, Adyar", items: 3, payout: 55, status: "Assigned" },
];

function DeliveryPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [user, loading, navigate]);

  const [list, setList] = useState(INITIAL);
  const liveOrders = useOrders().filter((o) => o.status === "Ready" || o.status === "Out for delivery" || o.status === "Delivered");
  const earnings = list.reduce((s, l) => s + l.payout, 0) + liveOrders.reduce((s, o) => s + Math.round(o.total * 0.08), 0);

  const advance = (id: string) => {
    const order = ["Assigned", "Picked up", "On the way", "Delivered"];
    setList((p) => p.map((o) => o.id === id ? { ...o, status: order[Math.min(order.indexOf(o.status) + 1, order.length - 1)] } : o));
  };

  return (
    <SiteShell>
      <section className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <div className="text-xs uppercase tracking-wider text-primary">Delivery Partner</div>
        <h1 className="font-[Fraunces] text-3xl font-black md:text-5xl">Hey {user?.name?.split(" ")[0] || "Rider"} 👋</h1>
        <p className="mt-1 text-muted-foreground">3 deliveries pending in your zone.</p>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { l: "Today's Earnings", v: `₹${earnings}`, i: IndianRupee },
            { l: "Active Drops", v: String(list.filter((l) => l.status !== "Delivered").length), i: Package },
            { l: "Distance", v: "12.4 km", i: Bike },
          ].map((s) => (
            <div key={s.l} className="rounded-2xl border border-border bg-card p-3 md:p-5">
              <span className="grid h-8 w-8 place-items-center rounded-xl gradient-primary text-primary-foreground md:h-10 md:w-10"><s.i className="h-4 w-4 md:h-5 md:w-5" /></span>
              <div className="mt-2 text-lg font-bold md:mt-3 md:text-2xl">{s.v}</div>
              <div className="text-[10px] text-muted-foreground md:text-xs">{s.l}</div>
            </div>
          ))}
        </div>

        <h2 className="mt-10 font-[Fraunces] text-2xl font-bold">Assigned deliveries</h2>
        {liveOrders.length > 0 && (
          <div className="mt-4 space-y-3">
            {liveOrders.map((o) => (
              <div key={o.id} className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{o.id}</span>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Room {o.room}</span>
                      <span className="text-[10px] text-muted-foreground">· {o.delivery_time}</span>
                    </div>
                    <div className="mt-1 font-semibold">{o.customer} · ₹{o.total}</div>
                    <div className="text-xs text-muted-foreground">{o.items.map((i) => `${i.name} ×${i.qty}`).join(", ")}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${o.status === "Delivered" ? "bg-emerald-600/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>{o.status}</span>
                    {o.status !== "Delivered" && (
                      <button onClick={() => updateOrderStatus(o.id, o.status === "Ready" ? "Out for delivery" : "Delivered")}
                        className="rounded-full gradient-primary px-3 py-2 text-xs font-bold text-primary-foreground shadow-elegant">
                        {o.status === "Ready" ? "Pick up" : "Mark delivered"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 space-y-3">
          {list.map((o, i) => (
            <motion.div key={o.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="grid gap-3 rounded-2xl border border-border bg-card p-4 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-muted-foreground">{o.id}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${o.status === "Delivered" ? "bg-emerald-600/10 text-emerald-600" : "bg-primary/10 text-primary"}`}>{o.status}</span>
                </div>
                <div className="mt-1 font-semibold">{o.customer} · {o.items} items · ₹{o.payout} payout</div>
                <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {o.address}</div>
              </div>
              <div className="flex gap-2">
                <a href={`https://maps.google.com/?q=${encodeURIComponent(o.address)}`} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-accent">
                  <Navigation className="h-3.5 w-3.5" /> Navigate
                </a>
                <button onClick={() => advance(o.id)} disabled={o.status === "Delivered"}
                  className="rounded-full gradient-primary px-3 py-2 text-xs font-bold text-primary-foreground shadow-elegant disabled:opacity-50">
                  {o.status === "Delivered" ? "Done" : "Update status"}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
