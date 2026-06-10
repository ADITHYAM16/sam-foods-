import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3, Bell, ChefHat, CheckCircle, XCircle,
  IndianRupee, Pencil, Plus, ShoppingBag, Trash2,
  Users, Utensils, X, AlertTriangle,
} from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { type FoodItem } from "@/lib/menu-data";
import { useOrders, updateOrderStatus, STATUS_FLOW, type OrderStatus, assignNearestAgent } from "@/lib/orders-store";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
const adminClient = getAdminClient();

/* ─── Types ───────────────────────────────────────────────── */
interface OrderRequest {
  id: string;
  customer: string;
  room: string;
  items: { name: string; qty: number }[];
  total: number;
  payment_method: string;
  created_at: string;
  user_id: string | null;
  email: string | null;
  delivery_time: string;
  subtotal: number;
  delivery_fee: number;
  gst: number;
  discount: number;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  payment_status: string;
}

/* ─── Status Pill ─────────────────────────────────────────── */
function StatusPill({ s }: { s: string }) {
  const map: Record<string, string> = {
    Delivered: "bg-emerald-600/10 text-emerald-600",
    Preparing: "bg-blue-500/10 text-blue-600",
    "Out for delivery": "bg-primary/10 text-primary",
    Confirmed: "bg-emerald-600/10 text-emerald-600",
    Pending: "bg-amber-500/10 text-amber-600",
    Placed: "bg-violet-500/10 text-violet-600",
    Ready: "bg-emerald-500/10 text-emerald-600",
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${map[s] || "bg-muted text-foreground"}`}>{s}</span>;
}

/* ─── Order Request Alert Banner ─────────────────────────── */
function OrderRequestAlert({ req, onAccept, onDeny }: {
  req: OrderRequest;
  onAccept: () => void;
  onDeny: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="mb-3 rounded-2xl border border-amber-400/40 bg-amber-50 dark:bg-amber-950/30 p-4 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3 shrink-0 mt-0.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-bold text-amber-800 dark:text-amber-300">
                New order request — {req.customer}
              </span>
            </div>
            <div className="mt-0.5 text-xs text-amber-700/80 dark:text-amber-400">
              {req.room} · ₹{req.total} · {req.payment_method.toUpperCase()} · {req.items.map(i => `${i.name} ×${i.qty}`).join(", ")}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={onAccept}
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition">
            <CheckCircle className="h-3.5 w-3.5" /> Accept
          </button>
          <button onClick={onDeny}
            className="inline-flex items-center gap-1.5 rounded-full bg-destructive px-3 py-2 text-xs font-bold text-white hover:opacity-90 transition">
            <XCircle className="h-3.5 w-3.5" /> Deny
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Dashboard ───────────────────────────────────────────── */
type AdminTab = "dashboard" | "agents" | "bulk-orders";

export function Dashboard({ onNavigate, pendingBulk = 0 }: { onNavigate?: (tab: AdminTab) => void; pendingBulk?: number }) {
  const [items, setItems] = useState<FoodItem[]>([]);
  const [editing, setEditing] = useState<FoodItem | null>(null);
  const [saving, setSaving] = useState(false);
  const liveOrders = useOrders();
  const [bulkOrders, setBulkOrders] = useState<
    { id: string; name: string; people: number; date: string; status: string }[]
  >([]);
  const [requests, setRequests] = useState<OrderRequest[]>([]);

  function playBeep() {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      [0, 0.2].forEach((t) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 1000;
        gain.gain.setValueAtTime(0.4, ctx.currentTime + t);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.18);
        osc.start(ctx.currentTime + t); osc.stop(ctx.currentTime + t + 0.18);
      });
    } catch {}
  }

  const loadMenu = useCallback(async () => {
    const { data } = await (supabase.from("menu_items") as any)
      .select("id,name,description,price,rating,category,veg,image,badge,available,sold_out")
      .order("created_at", { ascending: true });
    if (data) setItems(data as FoodItem[]);
  }, []);

  useEffect(() => {
    // ── initial loads ──
    loadMenu();

    // Load pending order requests once
    adminClient.from("order_requests" as any).select("*")
      .eq("status", "pending").order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setRequests((data as any[]).map(r => ({ ...r, items: r.items as { name: string; qty: number }[] })));
      });

    // Load pending/accepted bulk orders once
    supabase.from("bulk_orders" as any).select("id,name,people,date,status")
      .in("status", ["Pending", "Accepted"]).order("created_at", { ascending: false }).limit(10)
      .then(({ data }) => { if (data) setBulkOrders(data as any); });

    // ── menu realtime (full reload is fine — menu changes are rare) ──
    const menuCh = supabase.channel("adm-menu")
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_items" }, loadMenu)
      .subscribe();

    // ── order_requests realtime — IN-PLACE patch, never full reload ──
    const reqCh = adminClient.channel("adm-order-req")
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "order_requests" },
        ({ new: row }) => {
          const r = row as any;
          if (r.status !== "pending") return;
          setRequests(prev => {
            if (prev.some(x => x.id === r.id)) return prev;
            playBeep();
            return [...prev, { ...r, items: r.items as { name: string; qty: number }[] }];
          });
        }
      )
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "order_requests" },
        ({ new: row }) => {
          const r = row as any;
          // Remove from list if no longer pending (accepted / denied)
          if (r.status !== "pending") {
            setRequests(prev => prev.filter(x => x.id !== r.id));
          } else {
            setRequests(prev => prev.map(x => x.id === r.id ? { ...r, items: r.items } : x));
          }
        }
      )
      .on("postgres_changes",
        { event: "DELETE", schema: "public", table: "order_requests" },
        ({ old: row }) => {
          setRequests(prev => prev.filter(x => x.id !== (row as any).id));
        }
      )
      .subscribe();

    // ── bulk_orders realtime — IN-PLACE patch ──
    const bulkCh = supabase.channel("adm-bulk")
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "bulk_orders" },
        ({ new: row }) => {
          const b = row as any;
          if (![ "Pending", "Accepted"].includes(b.status)) return;
          setBulkOrders(prev => {
            if (prev.some(x => x.id === b.id)) return prev;
            return [{ id: b.id, name: b.name, people: b.people, date: b.date, status: b.status }, ...prev];
          });
          playBeep();
        }
      )
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "bulk_orders" },
        ({ new: row }) => {
          const b = row as any;
          if (!["Pending", "Accepted"].includes(b.status)) {
            setBulkOrders(prev => prev.filter(x => x.id !== b.id));
          } else {
            setBulkOrders(prev => prev.map(x => x.id === b.id ? { id: b.id, name: b.name, people: b.people, date: b.date, status: b.status } : x));
          }
        }
      )
      .on("postgres_changes",
        { event: "DELETE", schema: "public", table: "bulk_orders" },
        ({ old: row }) => { setBulkOrders(prev => prev.filter(x => x.id !== (row as any).id)); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(menuCh);
      adminClient.removeChannel(reqCh);
      supabase.removeChannel(bulkCh);
    };
  }, [loadMenu]);

  async function acceptRequest(req: OrderRequest) {
    // Create real order from request
    const { data: orderData, error } = await (adminClient.from("orders") as any).insert({
      user_id: req.user_id,
      customer: req.customer,
      email: req.email,
      room: req.room,
      delivery_time: req.delivery_time,
      items: req.items,
      subtotal: req.subtotal,
      delivery_fee: req.delivery_fee,
      gst: req.gst,
      total: req.total,
      discount: req.discount,
      status: "Placed",
      payment_method: req.payment_method,
      payment_status: req.payment_status,
      razorpay_order_id: req.razorpay_order_id,
      razorpay_payment_id: req.razorpay_payment_id,
    }).select().single();

    if (error || !orderData) return;

    // Assign nearest (least busy) agent
    await assignNearestAgent((orderData as any).id);

    // Mark request accepted with order_id so user gets redirected
    await (adminClient.from("order_requests") as any)
      .update({ status: "accepted", order_id: (orderData as any).id })
      .eq("id", req.id);

    setRequests(p => p.filter(r => r.id !== req.id));
  }

  async function denyRequest(id: string) {
    await (adminClient.from("order_requests") as any)
      .update({ status: "denied" }).eq("id", id);
    setRequests(p => p.filter(r => r.id !== id));
  }

  async function toggleSoldOut(id: string, current: boolean) {
    await (supabase.from("menu_items") as any)
      .update({ sold_out: !current }).eq("id", id);
  }

  async function saveItem() {
    if (!editing) return;
    setSaving(true);
    const isNew = editing.id === "new";
    const payload = { ...editing, id: isNew ? `item-${Date.now()}` : editing.id, available: true };
    await (supabase.from("menu_items") as any).upsert(payload);
    setSaving(false);
    setEditing(null);
  }

  async function deleteItem(id: string) {
    await (supabase.from("menu_items") as any).delete().eq("id", id);
  }

  const stats = [
    { label: "Today's Revenue", value: `₹${liveOrders.reduce((s, o) => s + o.total, 0).toLocaleString()}`, icon: IndianRupee, trend: "Live" },
    { label: "Orders", value: String(liveOrders.length), icon: ShoppingBag, trend: "Live" },
    { label: "Pending Requests", value: String(requests.length), icon: Bell, trend: requests.length > 0 ? "!" : "" },
    { label: "Menu Items", value: String(items.length), icon: Utensils, trend: "" },
  ];

  return (
    <AdminShell activeTab="dashboard" onNavigate={onNavigate} pendingBulk={pendingBulk}>
      <section className="mx-auto max-w-7xl px-4 py-10 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-primary">Admin</div>
            <h1 className="font-[Fraunces] text-4xl font-black md:text-5xl">SAM Command Center</h1>
          </div>
          <a href="http://localhost:5173" target="_blank" rel="noopener noreferrer"
            className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-accent transition">
            View site ↗
          </a>
        </div>

        {/* ── Order Request Alerts ── */}
        <AnimatePresence>
          {requests.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6">
              <div className="mb-2 flex items-center gap-2 text-sm font-bold text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" /> {requests.length} order request{requests.length !== 1 ? "s" : ""} waiting
              </div>
              {requests.map(req => (
                <OrderRequestAlert key={req.id} req={req}
                  onAccept={() => acceptRequest(req)}
                  onDeny={() => denyRequest(req.id)} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Stats ── */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl gradient-primary text-primary-foreground">
                  <s.icon className="h-5 w-5" />
                </span>
                {s.trend && (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s.trend === "!" ? "bg-amber-500/10 text-amber-600" : "bg-emerald-600/10 text-emerald-600"}`}>
                    {s.trend === "!" ? "Pending" : s.trend}
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
                No orders yet. Accepted orders appear here instantly.
              </p>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {liveOrders.map((o) => (
                  <div key={o.id} className="rounded-2xl border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{o.id.slice(0, 8)}</span>
                        <span className="text-sm font-semibold">{o.customer}</span>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary truncate max-w-[120px]">{o.room}</span>
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

          <div className="rounded-3xl border border-border bg-card p-5">
            <h2 className="mb-3 font-[Fraunces] text-xl font-bold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" /> Weekly Revenue
            </h2>
            <div className="flex h-44 items-end gap-2">
              {[42, 58, 36, 71, 48, 88, 65].map((h, i) => (
                <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${h}%` }}
                  transition={{ delay: i * 0.07, type: "spring", stiffness: 120 }}
                  className="flex-1 rounded-t-lg gradient-primary opacity-90" />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
              {["M","T","W","T","F","S","S"].map((d, i) => <span key={i}>{d}</span>)}
            </div>
          </div>
        </div>

        {/* ── Manage Menu + Bulk Bookings ── */}
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-3xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-[Fraunces] text-xl font-bold flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-primary" /> Manage Menu
              </h2>
              <button onClick={() => setEditing({ id: "new", name: "", description: "", price: 0, rating: 4.5, category: "Starters", veg: true, image: "" })}
                className="inline-flex items-center gap-1 rounded-full gradient-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
                <Plus className="h-3.5 w-3.5" /> Add item
              </button>
            </div>
            <div className="max-h-[480px] overflow-y-auto pr-1">
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((it) => (
                  <div key={it.id} className={`flex items-center gap-3 rounded-2xl border p-2 transition ${it.sold_out ? "border-destructive/30 bg-destructive/5" : "border-border"}`}>
                    <div className="relative shrink-0">
                      <img src={it.image} alt={it.name} className={`h-14 w-14 rounded-xl object-cover ${it.sold_out ? "brightness-50" : ""}`} />
                      {it.sold_out && (
                        <span className="absolute inset-0 flex items-center justify-center rounded-xl">
                          <span className="text-[9px] font-black text-white uppercase">Sold Out</span>
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold leading-tight truncate">{it.name}</div>
                      <div className="text-xs text-muted-foreground">{it.category} · ₹{it.price}</div>
                    </div>
                    {/* Sold out / Release toggle */}
                    <button onClick={() => toggleSoldOut(it.id, !!it.sold_out)}
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold transition ${it.sold_out ? "bg-emerald-600/10 text-emerald-600 hover:bg-emerald-600/20" : "bg-destructive/10 text-destructive hover:bg-destructive/20"}`}>
                      {it.sold_out ? "Release" : "Sold Out"}
                    </button>
                    <button onClick={() => setEditing(it)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-accent transition">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => deleteItem(it.id)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-destructive hover:bg-destructive/10 transition">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-5">
            <h2 className="mb-3 font-[Fraunces] text-xl font-bold">Bulk Bookings</h2>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {bulkOrders.length === 0 && <p className="text-sm text-muted-foreground">No bulk bookings yet.</p>}
              {bulkOrders.map((b) => (
                <div key={b.id} className="rounded-2xl border border-border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{b.name}</span>
                    <StatusPill s={b.status} />
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{b.people} guests · {b.date}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Edit / Add modal ── */}
        {editing && (
          <div onClick={() => setEditing(null)} className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
            <motion.div initial={{ y: 20, opacity: 0, scale: 0.97 }} animate={{ y: 0, opacity: 1, scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-elegant">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-[Fraunces] text-2xl font-bold">{editing.id === "new" ? "Add" : "Edit"} Item</h3>
                <button onClick={() => setEditing(null)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-accent transition">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3">
                <input className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary transition"
                  placeholder="Name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                <input className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary transition"
                  placeholder="Description" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <input className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary transition"
                    type="number" placeholder="Price (₹)" value={editing.price || ""}
                    onChange={(e) => setEditing({ ...editing, price: +e.target.value })} />
                  <select className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary transition"
                    value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value as FoodItem["category"] })}>
                    {["Briyani","Meals","Starters","Drinks","Desserts"].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <input className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary transition"
                  placeholder="Image URL" value={editing.image} onChange={(e) => setEditing({ ...editing, image: e.target.value })} />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={editing.veg} onChange={(e) => setEditing({ ...editing, veg: e.target.checked })} className="accent-primary" />
                  <span className="text-muted-foreground">Vegetarian</span>
                </label>
              </div>
              <div className="mt-5 flex gap-3">
                <button onClick={() => setEditing(null)} className="flex-1 rounded-full border border-border py-2.5 text-sm font-semibold hover:bg-accent transition">Cancel</button>
                <button onClick={saveItem} disabled={saving} className="flex-1 rounded-full gradient-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </section>
    </AdminShell>
  );
}
