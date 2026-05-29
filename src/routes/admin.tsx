import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3, ChefHat, IndianRupee, LogOut, Pencil, Plus,
  ShoppingBag, Trash2, Users, Utensils, Bike, ShieldCheck,
  PackageCheck, Clock, CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { MENU, type FoodItem } from "@/lib/menu-data";
import { useOrders, updateOrderStatus, STATUS_FLOW, type OrderStatus } from "@/lib/orders-store";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Admin Dashboard — SAM Foods" }] }),
});

function AdminPage() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      navigate({ to: "/owner/login" });
    }
  }, [user, loading, navigate]);

  const [items, setItems] = useState<FoodItem[]>(MENU);
  const [editing, setEditing] = useState<FoodItem | null>(null);
  const [activeTab, setActiveTab] = useState<"orders" | "menu" | "bulk">("orders");
  const liveOrders = useOrders();
  const [bulkOrders, setBulkOrders] = useState<{ id: string; name: string; phone: string; people: number; date: string; status: string; event: string; budget: string }[]>([]);

  useEffect(() => {
    supabase.from("bulk_orders").select("*").order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setBulkOrders(data as any); });
  }, []);

  const revenue = liveOrders.reduce((s, o) => s + o.total, 0);

  const stats = [
    { label: "Today's Revenue", value: `₹${revenue.toLocaleString()}`, icon: IndianRupee, color: "text-emerald-600", bg: "bg-emerald-500/10" },
    { label: "Total Orders", value: String(liveOrders.length), icon: ShoppingBag, color: "text-blue-600", bg: "bg-blue-500/10" },
    { label: "Bulk Bookings", value: String(bulkOrders.length), icon: Users, color: "text-purple-600", bg: "bg-purple-500/10" },
    { label: "Menu Items", value: String(items.length), icon: Utensils, color: "text-amber-600", bg: "bg-amber-500/10" },
  ];

  if (loading || !user) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-border border-t-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl gradient-primary shadow-glow">
              <ChefHat className="h-5 w-5 text-primary-foreground" />
            </span>
            <div>
              <div className="font-[Fraunces] text-lg font-bold">SAM <span className="text-gradient">Foods</span></div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Admin Dashboard</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-semibold text-amber-600">{user.name}</span>
            </div>
            <Link to="/" className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-accent">View Site</Link>
            <button onClick={() => { logout(); navigate({ to: "/owner/login" }); }}
              className="flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20">
              <LogOut className="h-3.5 w-3.5" /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

        {/* Tabs */}
        <div className="mt-8 flex gap-2 rounded-2xl border border-border bg-card p-1.5">
          {([
            { key: "orders", label: "Live Orders", icon: ShoppingBag },
            { key: "menu", label: "Menu", icon: Utensils },
            { key: "bulk", label: "Bulk Bookings", icon: Users },
          ] as const).map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition ${activeTab === t.key ? "gradient-primary text-primary-foreground shadow-elegant" : "text-muted-foreground hover:text-foreground"}`}>
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* ── ORDERS TAB ── */}
        {activeTab === "orders" && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
            <div className="rounded-3xl border border-border bg-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-[Fraunces] text-xl font-bold">Live Orders</h2>
                <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600">
                  <span className="relative grid h-2 w-2"><span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/70" /><span className="relative h-2 w-2 rounded-full bg-emerald-500" /></span>
                  Real-time
                </span>
              </div>
              {liveOrders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
                  No orders yet. New orders appear here instantly.
                </div>
              ) : (
                <div className="space-y-3">
                  {liveOrders.map((o) => (
                    <div key={o.id} className="rounded-2xl border border-border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs text-muted-foreground">{o.id}</span>
                            <span className="font-semibold">{o.customer}</span>
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Room {o.room}</span>
                            <span className="text-[10px] text-muted-foreground">· {o.delivery_time}</span>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">{o.items.map((i) => `${i.name} ×${i.qty}`).join(", ")}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">₹{o.total}</span>
                          <StatusPill s={o.status} />
                        </div>
                      </div>
                      {/* Status buttons */}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {STATUS_FLOW.map((s) => (
                          <button key={s} onClick={() => updateOrderStatus(o.id, s as OrderStatus)}
                            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition ${o.status === s ? "gradient-primary text-primary-foreground" : "border border-border bg-background text-muted-foreground hover:bg-accent"}`}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Weekly chart */}
            <div className="rounded-3xl border border-border bg-card p-5">
              <h2 className="mb-4 flex items-center gap-2 font-[Fraunces] text-xl font-bold">
                <BarChart3 className="h-5 w-5 text-primary" /> Weekly
              </h2>
              <div className="flex h-44 items-end gap-2">
                {[42, 58, 36, 71, 48, 88, 65].map((h, i) => (
                  <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: i * 0.05 }}
                    className="flex-1 rounded-t-lg gradient-primary opacity-90" />
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i}>{d}</span>)}
              </div>
              <div className="mt-4 space-y-2">
                {[
                  { label: "Placed", icon: Clock, color: "text-blue-500" },
                  { label: "Preparing", icon: ChefHat, color: "text-amber-500" },
                  { label: "Delivered", icon: CheckCircle2, color: "text-emerald-500" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between text-xs">
                    <span className={`flex items-center gap-1.5 ${s.color}`}><s.icon className="h-3.5 w-3.5" />{s.label}</span>
                    <span className="font-semibold">{liveOrders.filter(o => o.status === s.label).length}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── MENU TAB ── */}
        {activeTab === "menu" && (
          <div className="mt-6 rounded-3xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-[Fraunces] text-xl font-bold flex items-center gap-2"><ChefHat className="h-5 w-5 text-primary" /> Manage Menu</h2>
              <button onClick={() => setEditing({ id: "new", name: "", description: "", price: 0, rating: 4.5, category: "Starters", veg: true, image: "" })}
                className="inline-flex items-center gap-1.5 rounded-full gradient-primary px-4 py-2 text-xs font-bold text-primary-foreground">
                <Plus className="h-3.5 w-3.5" /> Add item
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((it) => (
                <div key={it.id} className="flex items-center gap-3 rounded-2xl border border-border p-3">
                  <img src={it.image} alt={it.name} className="h-14 w-14 rounded-xl object-cover" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-semibold">{it.name}</div>
                    <div className="text-xs text-muted-foreground">{it.category} · ₹{it.price}</div>
                  </div>
                  <button onClick={() => setEditing(it)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-accent"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setItems(p => p.filter(x => x.id !== it.id))} className="grid h-8 w-8 place-items-center rounded-full text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── BULK BOOKINGS TAB ── */}
        {activeTab === "bulk" && (
          <div className="mt-6 rounded-3xl border border-border bg-card p-5">
            <h2 className="mb-4 font-[Fraunces] text-xl font-bold">Bulk Bookings</h2>
            {bulkOrders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">No bulk bookings yet.</div>
            ) : (
              <div className="space-y-3">
                {bulkOrders.map((b) => (
                  <div key={b.id} className="rounded-2xl border border-border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold">{b.name}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">{b.event} · {b.people} guests · {b.date} · {b.budget}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">📞 {b.phone}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusPill s={b.status} />
                        {b.status === "Pending" && (
                          <button onClick={async () => {
                            await supabase.from("bulk_orders").update({ status: "Confirmed" }).eq("id", b.id);
                            setBulkOrders(p => p.map(x => x.id === b.id ? { ...x, status: "Confirmed" } : x));
                          }} className="rounded-full gradient-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
                            Confirm
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Edit modal */}
      {editing && (
        <div onClick={() => setEditing(null)} className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} onClick={e => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-elegant">
            <h3 className="font-[Fraunces] text-2xl font-bold">{editing.id === "new" ? "Add" : "Edit"} item</h3>
            <div className="mt-4 space-y-3">
              <input className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary" placeholder="Name" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
              <input className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary" placeholder="Description" value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <input className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary" type="number" placeholder="Price" value={editing.price || ""} onChange={e => setEditing({ ...editing, price: +e.target.value })} />
                <select className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary" value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value as FoodItem["category"] })}>
                  {["Briyani", "Meals", "Starters", "Drinks", "Desserts"].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <input className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary" placeholder="Image URL" value={editing.image} onChange={e => setEditing({ ...editing, image: e.target.value })} />
            </div>
            <div className="mt-5 flex gap-3">
              <button onClick={() => setEditing(null)} className="flex-1 rounded-full border border-border py-2.5 text-sm font-semibold hover:bg-accent">Cancel</button>
              <button onClick={() => {
                setItems(prev => editing.id === "new"
                  ? [{ ...editing, id: `n${Date.now()}` }, ...prev]
                  : prev.map(p => p.id === editing.id ? editing : p));
                setEditing(null);
              }} className="flex-1 rounded-full gradient-primary py-2.5 text-sm font-semibold text-primary-foreground">Save</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function StatusPill({ s }: { s: string }) {
  const map: Record<string, string> = {
    Delivered: "bg-emerald-600/10 text-emerald-600",
    "Out for delivery": "bg-blue-500/10 text-blue-600",
    Ready: "bg-purple-500/10 text-purple-600",
    Preparing: "bg-amber-500/10 text-amber-600",
    Placed: "bg-gray-500/10 text-gray-600",
    Confirmed: "bg-emerald-600/10 text-emerald-600",
    Pending: "bg-amber-500/10 text-amber-600",
    Cancelled: "bg-red-500/10 text-red-600",
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${map[s] || "bg-muted text-foreground"}`}>{s}</span>;
}
