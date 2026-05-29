import { motion } from "framer-motion";
import { Bike, CheckCircle2, IndianRupee, MapPin, Navigation, Package } from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { useOrders, updateOrderStatus, type OrderStatus } from "@/lib/orders-store";

export function DeliveryDashboard() {
  const allOrders = useOrders();
  const orders = allOrders.filter((o) =>
    o.status === "Ready" || o.status === "Out for delivery" || o.status === "Delivered"
  );

  const earnings = orders.reduce((s, o) => s + Math.round(o.total * 0.08), 0);
  const active = orders.filter((o) => o.status !== "Delivered").length;
  const delivered = orders.filter((o) => o.status === "Delivered").length;

  const stats = [
    { label: "Today's Earnings", value: `₹${earnings}`, icon: IndianRupee, color: "text-emerald-600", bg: "bg-emerald-500/10" },
    { label: "Active Drops", value: String(active), icon: Package, color: "text-blue-600", bg: "bg-blue-500/10" },
    { label: "Delivered", value: String(delivered), icon: CheckCircle2, color: "text-purple-600", bg: "bg-purple-500/10" },
    { label: "Distance", value: "12.4 km", icon: Bike, color: "text-amber-600", bg: "bg-amber-500/10" },
  ];

  return (
    <AdminShell>
      <section className="mx-auto max-w-5xl px-4 py-10 md:px-6">
        <div className="text-xs uppercase tracking-wider text-primary">Delivery Agent</div>
        <h1 className="font-[Fraunces] text-4xl font-black md:text-5xl">Delivery Dashboard</h1>
        <p className="mt-1 text-muted-foreground">Manage your assigned deliveries.</p>

        {/* Stats */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

        {/* Orders */}
        <h2 className="mt-10 font-[Fraunces] text-2xl font-bold">Assigned Deliveries</h2>

        {orders.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            No deliveries assigned yet. Check back soon.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {orders.map((o, i) => (
              <motion.div key={o.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className={`rounded-2xl border p-4 ${o.status === "Delivered" ? "border-emerald-500/30 bg-emerald-500/5" : "border-primary/30 bg-primary/5"}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-muted-foreground">{o.id}</span>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Room {o.room}</span>
                      <span className="text-[10px] text-muted-foreground">· {o.delivery_time}</span>
                    </div>
                    <div className="mt-1 font-semibold">{o.customer} · ₹{o.total}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {o.items.map((i) => `${i.name} ×${i.qty}`).join(", ")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill s={o.status} />
                    <a href={`https://maps.google.com/?q=Room+${o.room}`} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-accent">
                      <Navigation className="h-3.5 w-3.5" /> Navigate
                    </a>
                    {o.status !== "Delivered" && (
                      <button
                        onClick={() => updateOrderStatus(o.id, o.status === "Ready" ? "Out for delivery" : "Delivered" as OrderStatus)}
                        className="rounded-full gradient-primary px-3 py-2 text-xs font-bold text-primary-foreground shadow-elegant">
                        {o.status === "Ready" ? "Pick up" : "Mark delivered"}
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </AdminShell>
  );
}

function StatusPill({ s }: { s: string }) {
  const map: Record<string, string> = {
    Delivered: "bg-emerald-600/10 text-emerald-600",
    "Out for delivery": "bg-blue-500/10 text-blue-600",
    Ready: "bg-amber-500/10 text-amber-600",
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${map[s] || "bg-muted text-foreground"}`}>{s}</span>;
}
