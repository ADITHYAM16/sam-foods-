import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  ChefHat,
  IndianRupee,
  Pencil,
  Plus,
  ShoppingBag,
  Trash2,
  Users,
  Utensils,
  X,
} from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { MENU, type FoodItem } from "@/lib/menu-data";
import { useOrders, updateOrderStatus, STATUS_FLOW, type OrderStatus } from "@/lib/orders-store";
import { supabase } from "@/integrations/supabase/client";

/* ─── Status Pill ─────────────────────────────────────────── */
function StatusPill({ s }: { s: string }) {
  const map: Record<string, string> = {
    Delivered: "bg-emerald-600/10 text-emerald-600",
    Cooking: "bg-amber-500/10 text-amber-600",
    Preparing: "bg-blue-500/10 text-blue-600",
    "Out for delivery": "bg-primary/10 text-primary",
    Confirmed: "bg-emerald-600/10 text-emerald-600",
    Pending: "bg-amber-500/10 text-amber-600",
    Placed: "bg-violet-500/10 text-violet-600",
    Ready: "bg-emerald-500/10 text-emerald-600",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${map[s] || "bg-muted text-foreground"}`}>
      {s}
    </span>
  );
}

/* ─── Dashboard ───────────────────────────────────────────── */
export function Dashboard() {
  const [items, setItems] = useState<FoodItem[]>(MENU);
  const [editing, setEditing] = useState<FoodItem | null>(null);
  const liveOrders = useOrders();
  const [bulkOrders, setBulkOrders] = useState<
    { id: string; name: string; people: number; date: string; status: string }[]
  >([]);

  useEffect(() => {
    supabase
      .from("bulk_orders")
      .select("id,name,people,date,status")
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) setBulkOrders(data);
      });
  }, []);

  const stats = [
    {
      label: "Today's Revenue",
      value: `₹${liveOrders.reduce((s, o) => s + o.total, 0).toLocaleString()}`,
      icon: IndianRupee,
      trend: "Live",
    },
    { label: "Orders", value: String(liveOrders.length), icon: ShoppingBag, trend: "Live" },
    { label: "Customers", value: "1,247", icon: Users, trend: "+24" },
    { label: "Menu Items", value: String(items.length), icon: Utensils, trend: "" },
  ];

  return (
    <AdminShell>
      <section className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        {/* Page header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-primary">Admin</div>
            <h1 className="font-[Fraunces] text-4xl font-black md:text-5xl">
              SAM Command Center
            </h1>
          </div>
          <a
            href="http://localhost:5173"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-accent transition"
          >
            View site ↗
          </a>
        </div>

        {/* ── Stats grid ── */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl gradient-primary text-primary-foreground">
                  <s.icon className="h-5 w-5" />
                </span>
                {s.trend && (
                  <span className="rounded-full bg-emerald-600/10 px-2 py-0.5 text-xs font-semibold text-emerald-600">
                    {s.trend}
                  </span>
                )}
              </div>
              <div className="mt-3 text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* ── Live orders + Weekly revenue ── */}
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* Live orders */}
          <div className="lg:col-span-2 rounded-3xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-[Fraunces] text-xl font-bold">Live Orders</h2>
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600">
                <span className="relative grid h-2 w-2">
                  <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/70" />
                  <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Real-time
              </span>
            </div>

            {liveOrders.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No orders yet. New orders from guests appear here instantly.
              </p>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {liveOrders.map((o) => (
                  <div key={o.id} className="rounded-2xl border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          {o.id.slice(0, 8)}
                        </span>
                        <span className="text-sm font-semibold">{o.customer}</span>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          Room {o.room}
                        </span>
                        <span className="text-[10px] text-muted-foreground">· {o.delivery_time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">₹{o.total}</span>
                        <StatusPill s={o.status} />
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {o.items.map((i) => `${i.name} ×${i.qty}`).join(", ")}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {STATUS_FLOW.map((s) => (
                        <button
                          key={s}
                          onClick={() => updateOrderStatus(o.id, s as OrderStatus)}
                          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition ${
                            o.status === s
                              ? "gradient-primary text-primary-foreground"
                              : "border border-border bg-background text-muted-foreground hover:bg-accent"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Weekly revenue chart */}
          <div className="rounded-3xl border border-border bg-card p-5">
            <h2 className="mb-3 font-[Fraunces] text-xl font-bold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" /> Weekly Revenue
            </h2>
            <div className="flex h-44 items-end gap-2">
              {[42, 58, 36, 71, 48, 88, 65].map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ delay: i * 0.07, type: "spring", stiffness: 120 }}
                  className="flex-1 rounded-t-lg gradient-primary opacity-90"
                />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Manage Menu + Bulk Bookings ── */}
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {/* Menu management */}
          <div className="lg:col-span-2 rounded-3xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-[Fraunces] text-xl font-bold flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-primary" /> Manage Menu
              </h2>
              <button
                onClick={() =>
                  setEditing({
                    id: "new",
                    name: "",
                    description: "",
                    price: 0,
                    rating: 4.5,
                    category: "Starters",
                    veg: true,
                    image: "",
                  })
                }
                className="inline-flex items-center gap-1 rounded-full gradient-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
              >
                <Plus className="h-3.5 w-3.5" /> Add item
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {items.slice(0, 8).map((it) => (
                <div
                  key={it.id}
                  className="flex items-center gap-3 rounded-2xl border border-border p-2"
                >
                  <img
                    src={it.image}
                    alt={it.name}
                    className="h-14 w-14 rounded-xl object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold leading-tight truncate">{it.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {it.category} · ₹{it.price}
                    </div>
                  </div>
                  <button
                    onClick={() => setEditing(it)}
                    className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full hover:bg-accent transition"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setItems((p) => p.filter((x) => x.id !== it.id))}
                    className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full text-destructive hover:bg-destructive/10 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {items.length > 8 && (
              <p className="mt-3 text-xs text-center text-muted-foreground">
                + {items.length - 8} more items
              </p>
            )}
          </div>

          {/* Bulk bookings */}
          <div className="rounded-3xl border border-border bg-card p-5">
            <h2 className="mb-3 font-[Fraunces] text-xl font-bold">Bulk Bookings</h2>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {bulkOrders.length === 0 && (
                <p className="text-sm text-muted-foreground">No bulk bookings yet.</p>
              )}
              {bulkOrders.map((b) => (
                <div key={b.id} className="rounded-2xl border border-border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{b.name}</span>
                    <StatusPill s={b.status} />
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {b.people} guests · {b.date}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Edit / Add modal ── */}
        {editing && (
          <div
            onClick={() => setEditing(null)}
            className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-elegant"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-[Fraunces] text-2xl font-bold">
                  {editing.id === "new" ? "Add" : "Edit"} Item
                </h3>
                <button
                  onClick={() => setEditing(null)}
                  className="grid h-8 w-8 place-items-center rounded-full hover:bg-accent transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <input
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary transition"
                  placeholder="Name"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
                <input
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary transition"
                  placeholder="Description"
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary transition"
                    type="number"
                    placeholder="Price (₹)"
                    value={editing.price || ""}
                    onChange={(e) => setEditing({ ...editing, price: +e.target.value })}
                  />
                  <select
                    className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary transition"
                    value={editing.category}
                    onChange={(e) =>
                      setEditing({ ...editing, category: e.target.value as FoodItem["category"] })
                    }
                  >
                    {["Briyani", "Meals", "Starters", "Drinks", "Desserts"].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <input
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary transition"
                  placeholder="Image URL"
                  value={editing.image}
                  onChange={(e) => setEditing({ ...editing, image: e.target.value })}
                />
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editing.veg}
                    onChange={(e) => setEditing({ ...editing, veg: e.target.checked })}
                    className="accent-primary"
                  />
                  <span className="text-muted-foreground">Vegetarian</span>
                </label>
              </div>

              <div className="mt-5 flex gap-3">
                <button
                  onClick={() => setEditing(null)}
                  className="flex-1 rounded-full border border-border py-2.5 text-sm font-semibold hover:bg-accent transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setItems((prev) =>
                      editing.id === "new"
                        ? [{ ...editing, id: `n${Date.now()}` }, ...prev]
                        : prev.map((p) => (p.id === editing.id ? editing : p))
                    );
                    setEditing(null);
                  }}
                  className="flex-1 rounded-full gradient-primary py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </section>
    </AdminShell>
  );
}
