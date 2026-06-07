import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3, ChefHat, IndianRupee, LogOut, Pencil, Plus,
  ShoppingBag, Trash2, Users, Utensils, ShieldCheck,
  Clock, CheckCircle2, X, AlertTriangle, Banknote,
  Smartphone, Filter, RefreshCw, Tag,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { type FoodItem, CATEGORIES } from "@/lib/menu-data";
import { useOrders, updateOrderStatus, STATUS_FLOW, type OrderStatus } from "@/lib/orders-store";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Admin Dashboard — SAM Foods" }] }),
});

// ─── Types ────────────────────────────────────────────────────────────────────
type BulkOrder = {
  id: string; name: string; phone: string; people: number;
  date: string; status: string; event: string; budget: string;
  location: string; menu_request: string | null; created_at: string;
};

// ─── Status Pill ──────────────────────────────────────────────────────────────
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
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${map[s] || "bg-muted text-foreground"}`}>
      {s}
    </span>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
function ConfirmDialog({
  message, onConfirm, onCancel,
}: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-elegant">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </span>
          <p className="text-sm font-semibold">{message}</p>
        </div>
        <div className="mt-5 flex gap-3">
          <button onClick={onCancel}
            className="flex-1 rounded-full border border-border py-2.5 text-sm font-semibold hover:bg-accent">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 rounded-full bg-destructive py-2.5 text-sm font-semibold text-white">
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Real Weekly Revenue Hook ─────────────────────────────────────────────────
function useWeeklyRevenue() {
  const [bars, setBars] = useState<{ day: string; total: number; pct: number }[]>([]);

  useEffect(() => {
    const fetch = async () => {
      // Get orders from the last 7 days
      const since = new Date();
      since.setDate(since.getDate() - 6);
      since.setHours(0, 0, 0, 0);

      const { data } = await (supabase.from("orders") as any)
        .select("total, created_at")
        .gte("created_at", since.toISOString())
        .neq("status", "Cancelled");

      // Build last-7-days buckets
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const buckets: Record<string, number> = {};
      const labels: string[] = [];

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        buckets[key] = 0;
        labels.push(days[d.getDay()]);
      }

      (data ?? []).forEach((o: any) => {
        const key = new Date(o.created_at).toISOString().slice(0, 10);
        if (key in buckets) buckets[key] += Number(o.total);
      });

      const values = Object.values(buckets);
      const max = Math.max(...values, 1);
      const result = Object.keys(buckets).map((k, i) => ({
        day: labels[i],
        total: buckets[k],
        pct: Math.round((buckets[k] / max) * 100),
      }));
      setBars(result);
    };
    fetch();
  }, []);

  return bars;
}

// ─── Customer Count Hook ──────────────────────────────────────────────────────
function useCustomerCount() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    (supabase.from("profiles") as any)
      .select("id", { count: "exact", head: true })
      .eq("role", "customer")
      .then(({ count: c }: any) => { if (c !== null) setCount(c); });
  }, []);
  return count;
}

// ─── Menu Hook (Supabase with static fallback) ────────────────────────────────
function useAdminMenu() {
  const [items, setItems] = useState<FoodItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data, error } = await (supabase.from("menu_items") as any)
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("[AdminMenu] load error:", error.code, error.message);
        return; // keep whatever items we currently have
      }

      // Always set from DB — never fall back to static MENU here
      setItems(Array.isArray(data) ? (data as FoodItem[]) : []);
    } catch (e) {
      console.error("[AdminMenu] exception:", e);
    } finally {
      setMenuLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-menu-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "menu_items" },
        () => { load(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const saveItem = async (item: FoodItem): Promise<void> => {
    const payload = {
      name: item.name,
      description: item.description,
      price: item.price,
      rating: item.rating,
      category: item.category,
      veg: item.veg,
      image: item.image,
      badge: item.badge || null,
      available: true,
    };

    if (item.id === "new") {
      const { data, error } = await (supabase.from("menu_items") as any)
        .insert(payload)
        .select()
        .single();
      if (error) {
        console.error("[AdminMenu] insert error:", error);
        throw new Error(error.message);
      }
      if (!data) {
        throw new Error("Insert blocked by database policy. Check Supabase RLS policies for menu_items.");
      }
      // Add to list immediately
      setItems(prev => [...prev, { ...(data as any), badge: (data as any).badge ?? undefined } as FoodItem]);
    } else {
      const { error } = await (supabase.from("menu_items") as any)
        .update(payload)
        .eq("id", item.id);
      if (error) {
        console.error("[AdminMenu] update error:", error);
        throw new Error(error.message);
      }
      setItems(prev => prev.map(p => p.id === item.id ? { ...p, ...payload, badge: payload.badge ?? undefined } : p));
    }
    // Re-fetch to confirm DB state
    await load();
  };

  const deleteItem = async (id: string): Promise<void> => {
    const { error } = await (supabase.from("menu_items") as any).delete().eq("id", id);
    if (error) {
      console.error("[AdminMenu] delete error:", error);
      throw new Error(error.message);
    }
    // Immediately remove from list
    setItems(prev => prev.filter(p => p.id !== id));
    load();
  };

  return { items, menuLoading, saveItem, deleteItem };
}

// ─── Bulk Orders Hook (Supabase + realtime) ───────────────────────────────────
function useBulkOrders() {
  const [bulkOrders, setBulkOrders] = useState<BulkOrder[]>([]);

  const load = useCallback(async () => {
    const { data } = await (supabase.from("bulk_orders") as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setBulkOrders(data as BulkOrder[]);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-bulk-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "bulk_orders" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const updateBulkStatus = async (id: string, status: "Confirmed" | "Cancelled") => {
    await (supabase.from("bulk_orders") as any).update({ status }).eq("id", id);
    setBulkOrders(p => p.map(x => x.id === id ? { ...x, status } : x));
  };

  return { bulkOrders, updateBulkStatus, reload: load };
}

// ─── Admin Page ───────────────────────────────────────────────────────────────
function AdminPage() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      navigate({ to: "/owner/login" });
    }
  }, [user, loading, navigate]);

  const [activeTab, setActiveTab] = useState<"orders" | "menu" | "bulk">("orders");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "All">("All");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editing, setEditing] = useState<FoodItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  const liveOrders = useOrders();
  const { items, menuLoading, saveItem, deleteItem } = useAdminMenu();
  const { bulkOrders, updateBulkStatus } = useBulkOrders();
  const weeklyBars = useWeeklyRevenue();
  const customerCount = useCustomerCount();

  // Today's revenue — only today's non-cancelled orders
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRevenue = liveOrders
    .filter(o => o.created_at?.slice(0, 10) === todayStr && o.status !== "Cancelled")
    .reduce((s, o) => s + o.total, 0);

  const filteredOrders = statusFilter === "All"
    ? liveOrders
    : liveOrders.filter(o => o.status === statusFilter);

  const stats = [
    { label: "Today's Revenue", value: `₹${todayRevenue.toLocaleString()}`, icon: IndianRupee, color: "text-emerald-600", bg: "bg-emerald-500/10" },
    { label: "Total Orders", value: String(liveOrders.length), icon: ShoppingBag, color: "text-blue-600", bg: "bg-blue-500/10" },
    { label: "Customers", value: customerCount !== null ? String(customerCount) : "…", icon: Users, color: "text-purple-600", bg: "bg-purple-500/10" },
    { label: "Menu Items", value: String(items.length), icon: Utensils, color: "text-amber-600", bg: "bg-amber-500/10" },
  ];

  // Only allow advancing to NEXT status in flow (not jumping)
  const nextStatus = (current: OrderStatus): OrderStatus | null => {
    const i = STATUS_FLOW.indexOf(current);
    return i < STATUS_FLOW.length - 1 ? STATUS_FLOW[i + 1] : null;
  };

  const handleSaveItem = async () => {
    if (!editing) return;
    setSaveErr(null);
    if (!editing.name.trim()) return setSaveErr("Name is required.");
    if (!editing.price || editing.price <= 0) return setSaveErr("Enter a valid price.");
    if (!editing.image.trim()) return setSaveErr("Image URL is required.");
    setSaving(true);
    try {
      await saveItem(editing);
      setEditing(null);
    } catch (e) {
      setSaveErr(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    await deleteItem(id);
    setDeleteTarget(null);
  };

  if (loading || !user) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-border border-t-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Header ── */}
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
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 sm:flex">
              <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-xs font-semibold text-amber-600">{user.name}</span>
            </div>
            <Link to="/" className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-accent">
              View Site
            </Link>
            <button
              onClick={() => { logout(); navigate({ to: "/owner/login" }); }}
              className="flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20"
            >
              <LogOut className="h-3.5 w-3.5" /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 md:px-6">

        {/* ── Stats ── */}
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

        {/* ── Tabs ── */}
        <div className="mt-8 flex gap-2 rounded-2xl border border-border bg-card p-1.5">
          {([
            { key: "orders", label: "Live Orders", icon: ShoppingBag },
            { key: "menu", label: "Menu", icon: Utensils },
            { key: "bulk", label: "Bulk Bookings", icon: Users },
          ] as const).map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition ${activeTab === t.key ? "gradient-primary text-primary-foreground shadow-elegant" : "text-muted-foreground hover:text-foreground"}`}>
              <t.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════
            ORDERS TAB
        ════════════════════════════════════════ */}
        {activeTab === "orders" && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">

            {/* Order list */}
            <div className="rounded-3xl border border-border bg-card p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="font-[Fraunces] text-xl font-bold">Live Orders</h2>
                  <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600">
                    <span className="relative grid h-2 w-2">
                      <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/70" />
                      <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    Real-time
                  </span>
                </div>
                {/* Status filter */}
                <div className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs">
                  <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as any)}
                    className="bg-transparent text-xs outline-none"
                  >
                    <option value="All">All statuses</option>
                    {STATUS_FLOW.map(s => <option key={s} value={s}>{s}</option>)}
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
                  {statusFilter === "All" ? "No orders yet." : `No ${statusFilter} orders.`}
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {filteredOrders.map((o) => {
                    const next = nextStatus(o.status as OrderStatus);
                    const time = new Date(o.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
                    return (
                      <div key={o.id} className="rounded-2xl border border-border p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs text-muted-foreground">{o.id}</span>
                              <span className="font-semibold">{o.customer}</span>
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Room {o.room}</span>
                              <span className="text-[10px] text-muted-foreground">· {o.delivery_time}</span>
                              <span className="text-[10px] text-muted-foreground">· {time}</span>
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">{o.items.map(i => `${i.name} ×${i.qty}`).join(", ")}</div>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold">₹{o.total}</span>
                              <StatusPill s={o.status} />
                            </div>
                            {/* Payment method */}
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              (o as any).payment_method === "gpay"
                                ? "bg-blue-500/10 text-blue-600"
                                : "bg-amber-500/10 text-amber-600"
                            }`}>
                              {(o as any).payment_method === "gpay"
                                ? <><Smartphone className="h-2.5 w-2.5" /> GPay</>
                                : <><Banknote className="h-2.5 w-2.5" /> COD</>
                              }
                            </span>
                          </div>
                        </div>
                        {/* Next-only status button — only show if not delivered/cancelled */}
                        {o.status !== "Delivered" && o.status !== "Cancelled" && next && (
                          <div className="mt-3">
                            <button
                              onClick={() => updateOrderStatus(o.id, next)}
                              className="rounded-full gradient-primary px-4 py-1.5 text-[11px] font-bold text-primary-foreground shadow-elegant"
                            >
                              → Mark as {next}
                            </button>
                          </div>
                        )}
                        {o.status === "Cancelled" && (
                          <div className="mt-2 text-xs text-destructive font-semibold">Order cancelled by customer</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Weekly chart + order summary */}
            <div className="rounded-3xl border border-border bg-card p-5">
              <h2 className="mb-4 flex items-center gap-2 font-[Fraunces] text-xl font-bold">
                <BarChart3 className="h-5 w-5 text-primary" /> Weekly Revenue
              </h2>
              {weeklyBars.length === 0 ? (
                <div className="flex h-44 items-center justify-center">
                  <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="flex h-44 items-end gap-1.5">
                    {weeklyBars.map((b, i) => (
                      <div key={i} className="group relative flex flex-1 flex-col items-center gap-1">
                        {/* Tooltip */}
                        <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[10px] font-semibold text-background opacity-0 transition group-hover:opacity-100">
                          ₹{b.total.toLocaleString()}
                        </div>
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max(b.pct, 4)}%` }}
                          transition={{ delay: i * 0.07, type: "spring", stiffness: 120 }}
                          className={`w-full rounded-t-lg ${b.pct > 0 ? "gradient-primary opacity-90" : "bg-border"}`}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
                    {weeklyBars.map((b, i) => <span key={i}>{b.day}</span>)}
                  </div>
                </>
              )}

              <div className="mt-5 space-y-2 border-t border-border pt-4">
                {[
                  { label: "Placed", icon: Clock, color: "text-blue-500", status: "Placed" },
                  { label: "Preparing", icon: ChefHat, color: "text-amber-500", status: "Preparing" },
                  { label: "Delivered", icon: CheckCircle2, color: "text-emerald-500", status: "Delivered" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center justify-between text-xs">
                    <span className={`flex items-center gap-1.5 ${s.color}`}>
                      <s.icon className="h-3.5 w-3.5" />{s.label}
                    </span>
                    <span className="font-semibold">{liveOrders.filter(o => o.status === s.status).length}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            MENU TAB
        ════════════════════════════════════════ */}
        {activeTab === "menu" && (
          <div className="mt-6 rounded-3xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-[Fraunces] text-xl font-bold">
                <ChefHat className="h-5 w-5 text-primary" /> Manage Menu
              </h2>
              <button
                onClick={() => setEditing({ id: "new", name: "", description: "", price: 0, rating: 4.5, category: "Starters", veg: true, image: "", badge: "" })}
                className="inline-flex items-center gap-1.5 rounded-full gradient-primary px-4 py-2 text-xs font-bold text-primary-foreground"
              >
                <Plus className="h-3.5 w-3.5" /> Add item
              </button>
            </div>

            {menuLoading ? (
              <div className="flex justify-center py-10">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((it) => (
                  <div key={it.id} className="flex items-center gap-3 rounded-2xl border border-border p-3">
                    <img
                      src={it.image || "https://placehold.co/56x56?text=IMG"}
                      alt={it.name}
                      className="h-14 w-14 shrink-0 rounded-xl object-cover"
                      onError={e => { (e.target as HTMLImageElement).src = "https://placehold.co/56x56?text=IMG"; }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold">{it.name}</span>
                        {it.badge && (
                          <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">{it.badge}</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{it.category} · ₹{it.price}</div>
                      <div className="text-xs text-muted-foreground">⭐ {it.rating} · {it.veg ? "Veg" : "Non-veg"}</div>
                    </div>
                    <button onClick={() => setEditing(it)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-accent">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setDeleteTarget(it.id)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════
            BULK BOOKINGS TAB
        ════════════════════════════════════════ */}
        {activeTab === "bulk" && (
          <div className="mt-6 rounded-3xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-[Fraunces] text-xl font-bold">Bulk Bookings</h2>
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600">
                <span className="relative grid h-2 w-2">
                  <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/70" />
                  <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Real-time
              </span>
            </div>

            {bulkOrders.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
                No bulk bookings yet.
              </div>
            ) : (
              <div className="space-y-3">
                {bulkOrders.map((b) => (
                  <div key={b.id} className="rounded-2xl border border-border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{b.name}</span>
                          <StatusPill s={b.status} />
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {b.event} · {b.people} guests · {b.date} · {b.budget}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">📞 {b.phone}</div>
                        {b.location && <div className="mt-0.5 text-xs text-muted-foreground">📍 {b.location}</div>}
                        {b.menu_request && (
                          <div className="mt-1 rounded-lg bg-accent px-2 py-1 text-xs text-muted-foreground">
                            Menu: {b.menu_request}
                          </div>
                        )}
                        <div className="mt-1 text-[10px] text-muted-foreground">
                          Submitted: {new Date(b.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </div>
                      </div>
                      {b.status === "Pending" && (
                        <div className="flex shrink-0 flex-col gap-2">
                          <button
                            onClick={() => updateBulkStatus(b.id, "Confirmed")}
                            className="rounded-full gradient-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-elegant"
                          >
                            ✓ Confirm
                          </button>
                          <button
                            onClick={() => updateBulkStatus(b.id, "Cancelled")}
                            className="rounded-full border border-destructive/30 bg-destructive/10 px-4 py-1.5 text-xs font-bold text-destructive"
                          >
                            ✕ Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ════════════════════════════════════════
          MENU EDIT / ADD MODAL
      ════════════════════════════════════════ */}
      <AnimatePresence>
        {editing && (
          <div onClick={() => setEditing(null)} className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.97 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-elegant"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-[Fraunces] text-2xl font-bold">{editing.id === "new" ? "Add" : "Edit"} item</h3>
                <button onClick={() => setEditing(null)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-accent">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <input
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                  placeholder="Name *"
                  value={editing.name}
                  onChange={e => setEditing({ ...editing, name: e.target.value })}
                />
                <input
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                  placeholder="Description"
                  value={editing.description}
                  onChange={e => setEditing({ ...editing, description: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                    type="number"
                    placeholder="Price (₹) *"
                    value={editing.price || ""}
                    onChange={e => setEditing({ ...editing, price: +e.target.value })}
                  />
                  <input
                    className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                    type="number"
                    placeholder="Rating (0-5)"
                    step="0.1"
                    min="0"
                    max="5"
                    value={editing.rating || ""}
                    onChange={e => setEditing({ ...editing, rating: parseFloat(e.target.value) || 4.5 })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                    value={editing.category}
                    onChange={e => setEditing({ ...editing, category: e.target.value as FoodItem["category"] })}
                  >
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      className="w-full rounded-xl border border-border bg-background pl-8 pr-4 py-2.5 text-sm outline-none focus:border-primary"
                      placeholder='Badge (e.g. "Spicy")'
                      value={editing.badge ?? ""}
                      onChange={e => setEditing({ ...editing, badge: e.target.value })}
                    />
                  </div>
                </div>
                <input
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                  placeholder="Image URL *"
                  value={editing.image}
                  onChange={e => setEditing({ ...editing, image: e.target.value })}
                />
                {/* Image preview */}
                {editing.image && (
                  <img
                    src={editing.image}
                    alt="preview"
                    className="h-24 w-full rounded-xl object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                )}
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editing.veg}
                    onChange={e => setEditing({ ...editing, veg: e.target.checked })}
                    className="accent-primary"
                  />
                  <span className="text-muted-foreground">Vegetarian item</span>
                </label>
              </div>

              {saveErr && (
                <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{saveErr}</p>
              )}

              <div className="mt-5 flex gap-3">
                <button onClick={() => setEditing(null)} className="flex-1 rounded-full border border-border py-2.5 text-sm font-semibold hover:bg-accent">
                  Cancel
                </button>
                <button onClick={handleSaveItem} disabled={saving}
                  className="flex-1 rounded-full gradient-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                  {saving ? "Saving…" : "Save item"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════
          DELETE CONFIRM DIALOG
      ════════════════════════════════════════ */}
      {deleteTarget && (
        <ConfirmDialog
          message="Delete this menu item? This cannot be undone."
          onConfirm={() => handleDeleteItem(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
