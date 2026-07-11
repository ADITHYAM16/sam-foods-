import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3, ChefHat, IndianRupee, LogOut, Pencil, Plus,
  ShoppingBag, Trash2, Users, Utensils, ShieldCheck,
  Clock, CheckCircle2, X, AlertTriangle, Banknote,
  Smartphone, Filter, RefreshCw, Tag, EyeOff, Eye,
  Search, Download, UserCheck, Bell,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { type FoodItem, CATEGORIES } from "@/lib/menu-data";
import { useOrders, updateOrderStatus, assignNearestAgent, STATUS_FLOW, type OrderStatus } from "@/lib/orders-store";
import { supabase } from "@/integrations/supabase/client";
import { resolveImage, resolveDescription } from "@/lib/food-image-resolver";
import { playBeep } from "@/lib/beep";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "Admin Dashboard — SAM Foods" }] }),
});

// ─── Types ────────────────────────────────────────────────────────────────────
type BulkOrder = {
  id: string; name: string; phone: string; people: number;
  date: string; status: string; event: string; budget: string;
  location: string; menu_request: string | null; created_at: string;
  quoted_amount: number | null; payment_status: string;
};

type Agent = { id: string; name: string; email: string; phone: string | null };

// ─── Excel (CSV) Export ───────────────────────────────────────────────────────
function downloadExcel(rows: (string | number)[][], filename: string) {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

function exportOrdersCSV(orders: ReturnType<typeof useOrders>) {
  downloadExcel(
    [["ID", "Customer", "Room", "Items", "Total", "Status", "Payment", "Date"],
     ...orders.map(o => [o.id, o.customer, o.room, o.items.map(i => `${i.name}x${i.qty}`).join("; "), o.total, o.status, o.payment_method, new Date(o.created_at).toLocaleString("en-IN")])],
    "sam-orders"
  );
}

function exportBulkCSV(orders: BulkOrder[]) {
  downloadExcel(
    [["ID", "Name", "Phone", "Event", "People", "Date", "Location", "Menu Request", "Quoted Amount", "Status", "Payment", "Submitted"],
     ...orders.map(b => [b.id, b.name, b.phone, b.event, b.people, b.date, b.location, b.menu_request ?? "", b.quoted_amount ?? "", b.status, b.payment_status, new Date(b.created_at).toLocaleString("en-IN")])],
    "sam-bulk-orders"
  );
}

// ─── Status Pill ──────────────────────────────────────────────────────────────
function StatusPill({ s }: { s: string }) {
  const map: Record<string, string> = {
    Delivered: "bg-emerald-600/10 text-emerald-600",
    "Out for delivery": "bg-blue-500/10 text-blue-600",
    Ready: "bg-purple-500/10 text-purple-600",
    Preparing: "bg-amber-500/10 text-amber-600",
    Placed: "bg-gray-500/10 text-gray-600",
    Confirmed: "bg-emerald-600/10 text-emerald-600",
    Accepted: "bg-blue-500/10 text-blue-600",
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
function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
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
          <button onClick={onCancel} className="flex-1 rounded-full border border-border py-2.5 text-sm font-semibold hover:bg-accent transition">Cancel</button>
          <button onClick={onConfirm} className="flex-1 rounded-full bg-destructive py-2.5 text-sm font-semibold text-white hover:bg-destructive/80 transition">Delete</button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Manual Agent Assign Modal ─────────────────────────────────────────────────
function AssignAgentModal({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    (supabase.from("delivery_agents") as any)
      .select("id,name,email,phone").eq("active", true)
      .then(({ data }: any) => { if (data) setAgents(data as Agent[]); });
  }, []);

  const assign = async (agentId: string) => {
    setAssigning(agentId);
    // Cancel any existing pending delivery requests for this order
    await (supabase.from("delivery_requests") as any)
      .update({ status: "denied" }).eq("order_id", orderId).eq("status", "pending");
    // Insert new accepted request for the chosen agent
    await (supabase.from("delivery_requests") as any)
      .insert({ order_id: orderId, agent_id: agentId, status: "accepted" });
    // Assign to order
    await (supabase.from("orders") as any)
      .update({ delivery_agent_id: agentId }).eq("id", orderId);
    setAssigning(null);
    setDone(true);
    setTimeout(onClose, 800);
  };

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      <motion.div initial={{ y: 20, opacity: 0, scale: 0.97 }} animate={{ y: 0, opacity: 1, scale: 1 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-elegant">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-[Fraunces] text-xl font-bold">Assign Delivery Agent</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full hover:bg-accent transition"><X className="h-4 w-4" /></button>
        </div>
        {done ? (
          <div className="flex flex-col items-center gap-2 py-6 text-emerald-600">
            <CheckCircle2 className="h-10 w-10" />
            <p className="font-semibold">Agent assigned!</p>
          </div>
        ) : agents.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No active delivery agents found.</p>
        ) : (
          <div className="space-y-2">
            {agents.map(a => (
              <button key={a.id} onClick={() => assign(a.id)} disabled={!!assigning}
                className="flex w-full items-center gap-3 rounded-2xl border border-border bg-background p-3 text-left transition hover:border-primary/40 hover:bg-accent disabled:opacity-60">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full gradient-primary text-sm font-bold text-primary-foreground">
                  {a.name[0]?.toUpperCase()}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{a.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{a.email}</div>
                </div>
                {assigning === a.id && <RefreshCw className="h-4 w-4 animate-spin text-primary shrink-0" />}
                {assigning !== a.id && <UserCheck className="h-4 w-4 text-muted-foreground shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Revenue Hooks ────────────────────────────────────────────────────────────
function useWeeklyRevenue() {
  const [bars, setBars] = useState<{ day: string; date: string; total: number; pct: number }[]>([]);

  useEffect(() => {
    const load = async () => {
      const since = new Date(); since.setDate(since.getDate() - 6); since.setHours(0, 0, 0, 0);
      const { data } = await (supabase.from("orders") as any)
        .select("total,created_at").gte("created_at", since.toISOString()).neq("status", "Cancelled");
      const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
      const buckets: Record<string, number> = {};
      const labels: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const k = d.toISOString().slice(0, 10);
        buckets[k] = 0; labels.push(days[d.getDay()]);
      }
      (data ?? []).forEach((o: any) => {
        const k = new Date(o.created_at).toISOString().slice(0, 10);
        if (k in buckets) buckets[k] += Number(o.total);
      });
      const values = Object.values(buckets);
      const max = Math.max(...values, 1);
      setBars(Object.keys(buckets).map((k, i) => ({ day: labels[i], date: k, total: buckets[k], pct: Math.round((buckets[k] / max) * 100) })));
    };
    load();
    // Refresh chart at midnight
    const now = new Date();
    const msToMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
    const t = setTimeout(load, msToMidnight);
    return () => clearTimeout(t);
  }, []);

  return bars;
}

function useMonthlyRevenue() {
  const [months, setMonths] = useState<{ label: string; total: number; pct: number }[]>([]);
  useEffect(() => {
    const load = async () => {
      const since = new Date(); since.setMonth(since.getMonth() - 5); since.setDate(1); since.setHours(0,0,0,0);
      const { data } = await (supabase.from("orders") as any)
        .select("total,created_at").gte("created_at", since.toISOString()).neq("status", "Cancelled");
      const buckets: Record<string, number> = {};
      const labels: Record<string, string> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
        buckets[k] = 0;
        labels[k] = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
      }
      (data ?? []).forEach((o: any) => {
        const d = new Date(o.created_at);
        const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
        if (k in buckets) buckets[k] += Number(o.total);
      });
      const max = Math.max(...Object.values(buckets), 1);
      setMonths(Object.keys(buckets).map(k => ({ label: labels[k], total: buckets[k], pct: Math.round((buckets[k]/max)*100) })));
    };
    load();
  }, []);
  return months;
}

// ─── Customer Count Hook ──────────────────────────────────────────────────────
function useCustomerCount() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    (supabase.from("profiles") as any).select("id", { count: "exact", head: true }).eq("role", "customer")
      .then(({ count: c }: any) => { if (c !== null) setCount(c); });
  }, []);
  return count;
}

// ─── Menu Hook ────────────────────────────────────────────────────────────────
function useAdminMenu() {
  const [items, setItems] = useState<FoodItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data, error } = await (supabase.from("menu_items") as any).select("*").order("created_at", { ascending: true });
      if (!error) setItems(Array.isArray(data) ? (data as FoodItem[]) : []);
    } catch {} finally { setMenuLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const ch = supabase.channel("admin-menu-rt").on("postgres_changes", { event: "*", schema: "public", table: "menu_items" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const saveItem = async (item: FoodItem) => {
    const payload = {
      name: item.name, description: resolveDescription(item.description, item.category),
      price: item.price, rating: item.rating, category: item.category, veg: item.veg,
      image: resolveImage(item.name, item.image, item.category), badge: item.badge || null, available: true,
    };
    if (item.id === "new") {
      const { data, error } = await (supabase.from("menu_items") as any).insert(payload).select().single();
      if (error) throw new Error(error.message);
      if (!data) throw new Error("Insert blocked by RLS policy.");
    } else {
      const { error } = await (supabase.from("menu_items") as any).update(payload).eq("id", item.id);
      if (error) throw new Error(error.message);
    }
    await load();
  };

  const deleteItem = async (id: string) => {
    const { error } = await (supabase.from("menu_items") as any).delete().eq("id", id);
    if (error) throw new Error(error.message);
    setItems(prev => prev.filter(p => p.id !== id));
  };

  const toggleAvailable = async (id: string, current: boolean) => {
    await (supabase.from("menu_items") as any).update({ available: !current }).eq("id", id);
    setItems(prev => prev.map(p => p.id === id ? { ...p, available: !current } : p));
  };

  return { items, menuLoading, saveItem, deleteItem, toggleAvailable };
}

// ─── Bulk Orders Hook ─────────────────────────────────────────────────────────
function useBulkOrders() {
  const [bulkOrders, setBulkOrders] = useState<BulkOrder[]>([]);

  const load = useCallback(async () => {
    const { data } = await (supabase.from("bulk_orders") as any).select("*").order("created_at", { ascending: false });
    if (data) setBulkOrders(data as BulkOrder[]);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase.channel("admin-bulk-rt").on("postgres_changes", { event: "*", schema: "public", table: "bulk_orders" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  // Use "Accepted" status — consistent with admin-panel BulkOrdersPage
  const updateBulkStatus = async (id: string, status: "Accepted" | "Cancelled", quotedAmount?: number) => {
    const patch: any = { status };
    if (quotedAmount !== undefined) patch.quoted_amount = quotedAmount;
    await (supabase.from("bulk_orders") as any).update(patch).eq("id", id);
    setBulkOrders(p => p.map(x => x.id === id ? { ...x, status, ...(quotedAmount !== undefined ? { quoted_amount: quotedAmount } : {}) } : x));
  };

  return { bulkOrders, updateBulkStatus, reload: load };
}

// ─── Admin Page ───────────────────────────────────────────────────────────────
function AdminPage() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const prevOrderCount = useRef(0);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== "admin") navigate({ to: "/owner/login" });
  }, [user, loading, navigate]);

  const [activeTab, setActiveTab] = useState<"orders" | "menu" | "bulk">("orders");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "All">("All");
  const [searchQ, setSearchQ] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editing, setEditing] = useState<FoodItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [assignOrderId, setAssignOrderId] = useState<string | null>(null);
  // Bulk quote modal state
  const [quotingId, setQuotingId] = useState<string | null>(null);
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteErr, setQuoteErr] = useState<string | null>(null);

  const liveOrders = useOrders();
  const { items, menuLoading, saveItem, deleteItem, toggleAvailable } = useAdminMenu();
  const { bulkOrders, updateBulkStatus } = useBulkOrders();
  const weeklyBars = useWeeklyRevenue();
  const [weekDrillDate, setWeekDrillDate] = useState<string | null>(null);
  const drillOrders = weekDrillDate ? liveOrders.filter(o => o.created_at?.slice(0, 10) === weekDrillDate && o.status !== "Cancelled") : [];
  const drillRevenue = drillOrders.reduce((s, o) => s + o.total, 0);
  const customerCount = useCustomerCount();

  // Play beep when new orders arrive
  useEffect(() => {
    if (liveOrders.length > prevOrderCount.current && prevOrderCount.current > 0) {
      playBeep("new-order");
    }
    prevOrderCount.current = liveOrders.length;
  }, [liveOrders.length]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRevenue = liveOrders
    .filter(o => o.created_at?.slice(0, 10) === todayStr && o.status !== "Cancelled")
    .reduce((s, o) => s + o.total, 0);

  const [revenueView, setRevenueView] = useState<"today" | "week" | "month">("today");
  const monthlyBars = useMonthlyRevenue();

  // Combined filters: status + search (name/room) + date
  const filteredOrders = liveOrders.filter(o => {
    if (statusFilter !== "All" && o.status !== statusFilter) return false;
    if (searchQ) {
      const q = searchQ.toLowerCase();
      if (!o.customer.toLowerCase().includes(q) && !o.room.toLowerCase().includes(q)) return false;
    }
    if (dateFilter && o.created_at?.slice(0, 10) !== dateFilter) return false;
    return true;
  });

  const stats = [
    { label: "Today's Revenue", value: `₹${todayRevenue.toLocaleString()}`, icon: IndianRupee, color: "text-emerald-600", bg: "bg-emerald-500/10" },
    { label: "Total Orders", value: String(liveOrders.length), icon: ShoppingBag, color: "text-blue-600", bg: "bg-blue-500/10" },
    { label: "Customers", value: customerCount !== null ? String(customerCount) : "…", icon: Users, color: "text-purple-600", bg: "bg-purple-500/10" },
    { label: "Menu Items", value: String(items.length), icon: Utensils, color: "text-amber-600", bg: "bg-amber-500/10" },
  ];

  const nextStatus = (current: OrderStatus): OrderStatus | null => {
    if (current === "Placed") return "Preparing";
    if (current === "Preparing") return "Ready";
    return null;
  };

  const handleAdvanceOrder = async (orderId: string, next: OrderStatus) => {
    await updateOrderStatus(orderId, next);
    if (next === "Ready") await assignNearestAgent(orderId);
  };

  const handleSaveItem = async () => {
    if (!editing) return;
    setSaveErr(null);
    if (!editing.name.trim()) return setSaveErr("Name is required.");
    if (!editing.price || editing.price <= 0) return setSaveErr("Enter a valid price.");
    setSaving(true);
    try { await saveItem(editing); setEditing(null); }
    catch (e) { setSaveErr(e instanceof Error ? e.message : "Failed to save."); }
    finally { setSaving(false); }
  };

  const handleAcceptBulk = async () => {
    if (!quotingId) return;
    const amt = parseFloat(quoteAmount);
    if (!amt || amt <= 0) return setQuoteErr("Enter a valid quoted amount.");
    await updateBulkStatus(quotingId, "Accepted", amt);
    setQuotingId(null); setQuoteAmount(""); setQuoteErr(null);
  };

  if (loading || !user || user.role !== "admin") return (
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
            <Link to="/" className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-accent transition">View Site</Link>
            <button onClick={() => { logout(); navigate({ to: "/owner/login" }); }}
              className="flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/20 transition">
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
        <div className="mt-8 flex gap-1.5 rounded-2xl border border-border bg-card p-1.5">
          {([
            { key: "orders", label: "Live Orders", icon: ShoppingBag },
            { key: "menu", label: "Menu", icon: Utensils },
            { key: "bulk", label: "Bulk", icon: Users },
          ] as const).map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl min-h-[44px] px-2 text-xs font-semibold transition sm:gap-2 sm:text-sm ${
                activeTab === t.key ? "gradient-primary text-primary-foreground shadow-elegant" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}>
              <t.icon className="h-4 w-4 shrink-0" />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* ════════════════════ ORDERS TAB ════════════════════ */}
        {activeTab === "orders" && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
            <div className="rounded-3xl border border-border bg-card p-5">

              {/* Filters row */}
              <div className="mb-4 flex flex-wrap items-center gap-2">
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
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  {/* Search by name/room */}
                  <div className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs">
                    <Search className="h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      value={searchQ} onChange={e => setSearchQ(e.target.value)}
                      placeholder="Search name / room…"
                      className="w-32 bg-transparent outline-none text-xs"
                    />
                    {searchQ && <button onClick={() => setSearchQ("")}><X className="h-3 w-3 text-muted-foreground" /></button>}
                  </div>
                  {/* Date filter */}
                  <div className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
                      className="bg-transparent outline-none text-xs cursor-pointer" />
                    {dateFilter && <button onClick={() => setDateFilter("")}><X className="h-3 w-3 text-muted-foreground" /></button>}
                  </div>
                  {/* Status filter */}
                  <div className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs">
                    <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="bg-transparent text-xs outline-none">
                      <option value="All">All statuses</option>
                      {STATUS_FLOW.map(s => <option key={s} value={s}>{s}</option>)}
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                  {/* CSV Export */}
                  <button onClick={() => exportOrdersCSV(filteredOrders)}
                    title="Export CSV"
                    className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-accent transition">
                    <Download className="h-3.5 w-3.5" /> Export
                  </button>
                </div>
              </div>

              {filteredOrders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
                  No orders match your filters.
                </div>
              ) : (
                <div className="space-y-3 md:max-h-[600px] md:overflow-y-auto pr-1">
                  {filteredOrders.map((o) => {
                    const next = nextStatus(o.status as OrderStatus);
                    const time = new Date(o.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
                    const isReady = o.status === "Ready";
                    const isCancelled = o.status === "Cancelled";
                    const cancelReason = isCancelled && o.delivery_time?.startsWith("⚠️")
                      ? o.delivery_time.replace("⚠️ ", "")
                      : null;
                    return (
                      <div key={o.id} className={`rounded-2xl border p-4 transition ${
                        isCancelled
                          ? "border-red-300 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30"
                          : "border-border"
                      }`}>
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs text-muted-foreground">{o.id.slice(0, 8)}</span>
                              <span className={`font-semibold ${isCancelled ? "text-red-700 dark:text-red-400" : ""}`}>{o.customer}</span>
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">📍 {o.room}</span>
                              <span className="text-[10px] text-muted-foreground">· {isCancelled ? "" : o.delivery_time + " · "}{time}</span>
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">{o.items.map(i => `${i.name} ×${i.qty}`).join(", ")}</div>
                            {/* Cancellation reason */}
                            {cancelReason && (
                              <div className="mt-1.5 flex items-center gap-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 px-2.5 py-1.5">
                                <X className="h-3 w-3 shrink-0 text-red-600" />
                                <span className="text-[11px] font-semibold text-red-700 dark:text-red-400">{cancelReason}</span>
                              </div>
                            )}
                            {isCancelled && !cancelReason && (
                              <div className="mt-1.5 flex items-center gap-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 px-2.5 py-1.5">
                                <X className="h-3 w-3 shrink-0 text-red-600" />
                                <span className="text-[11px] font-semibold text-red-700 dark:text-red-400">Cancelled by customer</span>
                              </div>
                            )}
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1.5">
                            <div className="flex items-center gap-2">
                              <span className={`font-bold ${isCancelled ? "text-red-600 line-through opacity-60" : ""}`}>₹{o.total}</span>
                              <StatusPill s={o.status} />
                            </div>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              (o as any).payment_method === "gpay" ? "bg-blue-500/10 text-blue-600" : "bg-amber-500/10 text-amber-600"
                            }`}>
                              {(o as any).payment_method === "gpay"
                                ? <><Smartphone className="h-2.5 w-2.5" /> GPay</>
                                : <><Banknote className="h-2.5 w-2.5" /> COD</>}
                            </span>
                          </div>
                        </div>
                        {!isCancelled && (
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {next && (
                              <button onClick={() => handleAdvanceOrder(o.id, next)}
                                className={`rounded-full px-4 py-1.5 text-[11px] font-bold text-primary-foreground shadow-elegant transition hover:scale-105 active:scale-95 ${next === "Ready" ? "bg-emerald-600 hover:bg-emerald-700" : "gradient-primary"}`}>
                                {next === "Preparing" ? "🍳 Start Preparing" : "✅ Mark Ready & Notify Agent"}
                              </button>
                            )}
                            {isReady && (
                              <button onClick={() => setAssignOrderId(o.id)}
                                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-semibold hover:bg-accent transition">
                                <UserCheck className="h-3.5 w-3.5 text-primary" /> Assign Agent
                              </button>
                            )}
                            <SetDeliveryTime orderId={o.id} current={o.delivery_time} />
                          </div>
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
                        <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[10px] font-semibold text-background opacity-0 transition group-hover:opacity-100">
                          ₹{b.total.toLocaleString()}
                        </div>
                        <motion.div
                          initial={{ height: 0 }} animate={{ height: `${Math.max(b.pct, 4)}%` }}
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
                    <span className={`flex items-center gap-1.5 ${s.color}`}><s.icon className="h-3.5 w-3.5" />{s.label}</span>
                    <span className="font-semibold">{liveOrders.filter(o => o.status === s.status).length}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════ MENU TAB ════════════════════ */}
        {activeTab === "menu" && (
          <div className="mt-6 rounded-3xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-[Fraunces] text-xl font-bold">
                <ChefHat className="h-5 w-5 text-primary" /> Manage Menu
              </h2>
              <button onClick={() => setEditing({ id: "new", name: "", description: "", price: 0, rating: 4.5, category: "Breakfast", veg: true, image: "", badge: "", available: true })}
                className="inline-flex items-center gap-1.5 rounded-full gradient-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-elegant transition hover:scale-105 active:scale-95">
                <Plus className="h-3.5 w-3.5" /> Add item
              </button>
            </div>
            {menuLoading ? (
              <div className="flex justify-center py-10"><RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((it) => (
                  <div key={it.id} className={`flex items-center gap-3 rounded-2xl border p-3 transition ${it.available === false ? "border-destructive/30 bg-destructive/5 opacity-70" : "border-border bg-card hover:border-primary/30 hover:shadow-sm"}`}>
                    <div className="relative shrink-0">
                      <img src={resolveImage(it.name, it.image ?? "", it.category)} alt={it.name}
                        className={`h-14 w-14 rounded-xl object-cover ${it.available === false ? "grayscale" : ""}`}
                        onError={e => { (e.target as HTMLImageElement).src = "https://placehold.co/56x56?text=IMG"; }} />
                      {it.available === false && (
                        <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50">
                          <span className="text-[9px] font-bold text-white">SOLD OUT</span>
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold">{it.name}</span>
                        {it.badge && <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">{it.badge}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">{it.category} · ₹{it.price}</div>
                      <div className="text-xs text-muted-foreground">⭐ {it.rating} · {it.veg ? "Veg" : "Non-veg"}</div>
                    </div>
                    <button title={it.available === false ? "Release" : "Mark sold out"} onClick={() => toggleAvailable(it.id, it.available !== false)}
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full transition ${it.available === false ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" : "hover:bg-amber-500/10 text-amber-500"}`}>
                      {it.available === false ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                    <button onClick={() => setEditing(it)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-accent hover:text-primary transition">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setDeleteTarget(it.id)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-destructive hover:bg-destructive/10 transition">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════ BULK TAB ════════════════════ */}
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
              <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">No bulk bookings yet.</div>
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
                        <div className="mt-1 text-xs text-muted-foreground">{b.event} · {b.people} guests · {b.date}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">📞 {b.phone}</div>
                        {b.location && <div className="mt-0.5 text-xs text-muted-foreground">📍 {b.location}</div>}
                        {b.menu_request && (
                          <div className="mt-1 rounded-lg bg-accent px-2 py-1 text-xs text-muted-foreground">Menu: {b.menu_request}</div>
                        )}
                        {/* quoted_amount display */}
                        {b.quoted_amount != null && (
                          <div className="mt-1 flex items-center gap-1.5 text-sm font-bold">
                            <IndianRupee className="h-3.5 w-3.5 text-primary" />
                            ₹{b.quoted_amount.toLocaleString()} quoted
                            {b.payment_status === "paid" && (
                              <span className="rounded-full bg-emerald-600/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">Paid ✓</span>
                            )}
                          </div>
                        )}
                        <div className="mt-1 text-[10px] text-muted-foreground">
                          Submitted: {new Date(b.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </div>
                      </div>
                      {b.status === "Pending" && (
                        <div className="flex shrink-0 flex-col gap-2">
                          <button onClick={() => { setQuotingId(b.id); setQuoteAmount(""); setQuoteErr(null); }}
                            className="rounded-full gradient-primary px-4 py-1.5 text-xs font-bold text-primary-foreground shadow-elegant transition hover:scale-105 active:scale-95">
                            ✓ Accept & Quote
                          </button>
                          <button onClick={() => updateBulkStatus(b.id, "Cancelled")}
                            className="rounded-full border border-destructive/30 bg-destructive/10 px-4 py-1.5 text-xs font-bold text-destructive transition hover:bg-destructive/20 active:scale-95">
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

      {/* ── Quote/Accept Bulk Modal ── */}
      <AnimatePresence>
        {quotingId && (
          <div onClick={() => setQuotingId(null)} className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
            <motion.div initial={{ y: 20, opacity: 0, scale: 0.97 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 20, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-elegant">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-[Fraunces] text-xl font-bold">Accept & Set Quote</h3>
                <button onClick={() => setQuotingId(null)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-accent transition"><X className="h-4 w-4" /></button>
              </div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quoted Amount (₹)</label>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 focus-within:border-primary transition">
                <IndianRupee className="h-4 w-4 text-muted-foreground shrink-0" />
                <input type="number" placeholder="e.g. 45000" value={quoteAmount} onChange={e => setQuoteAmount(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none" autoFocus />
              </div>
              {quoteErr && <p className="mt-2 text-xs text-destructive">{quoteErr}</p>}
              <div className="mt-4 flex gap-3">
                <button onClick={() => setQuotingId(null)} className="flex-1 rounded-full border border-border py-2.5 text-sm font-semibold hover:bg-accent transition">Cancel</button>
                <button onClick={handleAcceptBulk} className="flex-1 rounded-full gradient-primary py-2.5 text-sm font-bold text-primary-foreground">Confirm</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Menu Edit/Add Modal ── */}
      <AnimatePresence>
        {editing && (
          <div onClick={() => setEditing(null)} className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
            <motion.div initial={{ y: 20, opacity: 0, scale: 0.97 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 20, opacity: 0, scale: 0.97 }}
              onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-elegant">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-[Fraunces] text-2xl font-bold">{editing.id === "new" ? "Add" : "Edit"} item</h3>
                <button onClick={() => setEditing(null)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-accent hover:rotate-90 transition"><X className="h-4 w-4" /></button>
              </div>
              <div className="space-y-3">
                <input className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                  placeholder="Name *" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
                <input className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                  placeholder="Description" value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} />
                <div className="grid grid-cols-2 gap-3">
                  <input className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                    type="number" placeholder="Price (₹) *" value={editing.price || ""} onChange={e => setEditing({ ...editing, price: +e.target.value })} />
                  <input className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                    type="number" placeholder="Rating (0-5)" step="0.1" min="0" max="5" value={editing.rating || ""}
                    onChange={e => setEditing({ ...editing, rating: parseFloat(e.target.value) || 4.5 })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <select className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                    value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value as FoodItem["category"] })}>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input className="w-full rounded-xl border border-border bg-background pl-8 pr-4 py-2.5 text-sm outline-none focus:border-primary"
                      placeholder='Badge (e.g. "Spicy")' value={editing.badge ?? ""} onChange={e => setEditing({ ...editing, badge: e.target.value })} />
                  </div>
                </div>
                <input className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                  placeholder="Image URL (optional)" value={editing.image} onChange={e => setEditing({ ...editing, image: e.target.value })} />
                <img src={resolveImage(editing.name, editing.image, editing.category)} alt="preview"
                  className="h-24 w-full rounded-xl object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={editing.veg} onChange={e => setEditing({ ...editing, veg: e.target.checked })} className="accent-primary" />
                  <span className="text-muted-foreground">Vegetarian item</span>
                </label>
              </div>
              {saveErr && <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{saveErr}</p>}
              <div className="mt-5 flex gap-3">
                <button onClick={() => setEditing(null)} className="flex-1 rounded-full border border-border py-2.5 text-sm font-semibold hover:bg-accent transition">Cancel</button>
                <button onClick={handleSaveItem} disabled={saving}
                  className="flex-1 rounded-full gradient-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60 hover:scale-105 transition">
                  {saving ? "Saving…" : "Save item"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirm ── */}
      {deleteTarget && (
        <ConfirmDialog message="Delete this menu item? This cannot be undone."
          onConfirm={async () => { await deleteItem(deleteTarget); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)} />
      )}

      {/* ── Manual Agent Assign Modal ── */}
      <AnimatePresence>
        {assignOrderId && <AssignAgentModal orderId={assignOrderId} onClose={() => setAssignOrderId(null)} />}
      </AnimatePresence>

      <Footer />
    </div>
  );
}

// ─── Inline delivery-time setter (inline in order row) ───────────────────────
function SetDeliveryTime({ orderId, current }: { orderId: string; current: string }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(current === "ASAP" ? "" : current);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!val) return;
    setSaving(true);
    await (supabase.from("orders") as any).update({ delivery_time: val }).eq("id", orderId);
    setSaving(false);
    setEditing(false);
  };

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-semibold hover:bg-accent transition">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        {current === "ASAP" ? "Set time" : current}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <input type="time" value={val} onChange={e => setVal(e.target.value)}
        className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-primary" />
      <button onClick={save} disabled={saving || !val}
        className="rounded-full gradient-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground disabled:opacity-60">
        {saving ? "…" : "Set"}
      </button>
      <button onClick={() => setEditing(false)} className="grid h-7 w-7 place-items-center rounded-full hover:bg-accent transition">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
