import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3, Bell, ChefHat, CheckCircle, XCircle,
  IndianRupee, Pencil, Plus, ShoppingBag, Trash2,
  Utensils, X, AlertTriangle, Eye, MapPin, CreditCard, Clock, User, RefreshCw, Activity,
  Download, ChevronDown, ChevronUp, Smartphone, CheckCircle2,
} from "lucide-react";
import { AdminShell } from "@/components/AdminShell";
import { type FoodItem } from "@/lib/menu-data";
import { useOrders, updateOrderStatus, type OrderStatus, assignNearestAgent } from "@/lib/orders-store";
import { supabase } from "@/integrations/supabase/client";

/* ─── Excel export helper ─────────────────────────────────── */
function exportToExcel(rows: Record<string, any>[], filename: string) {
  const headers = Object.keys(rows[0] ?? {});
  const csv = [
    headers.join(","),
    ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? "")).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${filename}.csv`; a.click();
  URL.revokeObjectURL(url);
}

/* ─── Revenue hook (today / week / monthly) ───────────────── */
function useRevenueStats() {
  const [todayRev, setTodayRev] = useState(0);
  const [weekRev, setWeekRev] = useState(0);
  const [monthRev, setMonthRev] = useState(0);
  const [todayOrders, setTodayOrders] = useState<any[]>([]);
  const [weekOrders, setWeekOrders] = useState<any[]>([]);
  const [monthOrders, setMonthOrders] = useState<any[]>([]);

  const load = useCallback(async () => {
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
    const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - 6); weekStart.setHours(0,0,0,0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data } = await (supabase.from("orders") as any)
      .select("id,customer,room,total,items,created_at,payment_method,status")
      .neq("status", "Cancelled")
      .gte("created_at", monthStart.toISOString())
      .order("created_at", { ascending: false });

    const all = (data as any[]) ?? [];
    const todays = all.filter(o => new Date(o.created_at) >= todayStart);
    const weeks = all.filter(o => new Date(o.created_at) >= weekStart);

    setTodayOrders(todays); setWeekOrders(weeks); setMonthOrders(all);
    setTodayRev(todays.reduce((s: number, o: any) => s + Number(o.total), 0));
    setWeekRev(weeks.reduce((s: number, o: any) => s + Number(o.total), 0));
    setMonthRev(all.reduce((s: number, o: any) => s + Number(o.total), 0));
  }, []);

  // Initial load + midnight refresh
  useEffect(() => {
    load();
    const now = new Date();
    const msToMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
    const mid = setTimeout(() => { load(); }, msToMidnight);
    return () => clearTimeout(mid);
  }, [load]);

  // Realtime order updates
  useEffect(() => {
    const ch = supabase.channel("revenue-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, load)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  return { todayRev, weekRev, monthRev, todayOrders, weekOrders, monthOrders, reload: load };
}

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
    Cancelled: "bg-destructive/10 text-destructive",
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
              <span className="ml-2 font-semibold">
                · {new Date(req.created_at).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: true })}
              </span>
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

/* ─── Real Weekly Revenue Chart ──────────────────────────── */
function useWeeklyRevenue() {
  const [bars, setBars] = useState<{ day: string; total: number; pct: number }[] | null>(null);
  useEffect(() => {
    const load = async () => {
      const since = new Date();
      since.setDate(since.getDate() - 6);
      since.setHours(0, 0, 0, 0);
      const { data } = await (supabase.from("orders") as any)
        .select("total,created_at").gte("created_at", since.toISOString()).neq("status", "Cancelled");
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const buckets: Record<string, number> = {};
      const labels: string[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        buckets[d.toISOString().slice(0, 10)] = 0;
        labels.push(days[d.getDay()]);
      }
      (data ?? []).forEach((o: any) => {
        const key = new Date(o.created_at).toISOString().slice(0, 10);
        if (key in buckets) buckets[key] += Number(o.total);
      });
      const values = Object.values(buckets);
      const max = Math.max(...values, 1);
      setBars(Object.keys(buckets).map((k, i) => ({ day: labels[i], total: buckets[k], pct: Math.round((buckets[k] / max) * 100) })));
    };
    load();
  }, []);
  return bars;
}

const CHART_HEIGHT_PX = 280;

function WeeklyRevenueChart() {
  const bars = useWeeklyRevenue();
  return (
    <div className="rounded-3xl border border-border bg-card p-5">
      <h2 className="mb-3 font-[Fraunces] text-xl font-bold flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" /> Weekly Revenue
      </h2>
      {bars === null ? (
        <div className="flex h-44 items-center justify-center">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div style={{ height: `${CHART_HEIGHT_PX}px` }} className="flex items-end gap-2 w-full">
            {bars.map((b, i) => {
              const barPx = Math.max(Math.round((b.pct / 100) * CHART_HEIGHT_PX), 14);
              return (
                <div key={i} className="group relative flex flex-1 flex-col items-center" style={{ height: `${CHART_HEIGHT_PX}px`, justifyContent: "flex-end" }}>
                  <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[10px] font-semibold text-background opacity-0 transition group-hover:opacity-100"
                    style={{ bottom: `${barPx + 4}px` }}>
                    ₹{b.total.toLocaleString()}
                  </div>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: barPx }}
                    transition={{ delay: i * 0.07, type: "spring", stiffness: 120, damping: 14 }}
                    className={`w-full rounded-t-lg ${b.total > 0 ? "gradient-primary opacity-90" : "bg-muted"}`}
                    style={{ minHeight: 14 }}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
            {bars.map((b, i) => <span key={i} className="flex-1 text-center">{b.day}</span>)}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Dashboard ───────────────────────────────────────────── */
type AdminTab = "dashboard" | "agents" | "bulk-orders";

export function Dashboard({ onNavigate, pendingBulk = 0 }: { onNavigate?: (tab: AdminTab) => void; pendingBulk?: number }) {
  const [items, setItems] = useState<FoodItem[]>([]);
  const [editing, setEditing] = useState<FoodItem | null>(null);
  const [viewOrder, setViewOrder] = useState<ReturnType<typeof useOrders>[number] | null>(null);
  const [saving, setSaving] = useState(false);
  const allOrders = useOrders();
  // GPay orders waiting for payment — yellow pending section
  const gpayPending = allOrders.filter(
    o => o.payment_method === "gpay" && o.payment_status === "pending"
  );
  // Live orders — COD always + GPay only after paid
  const liveOrders = allOrders.filter(
    o => o.payment_method !== "gpay" || o.payment_status === "paid"
  );
  const { todayRev, weekRev, monthRev, todayOrders, weekOrders, monthOrders, reload: reloadRevenue } = useRevenueStats();
  const [revExpanded, setRevExpanded] = useState(false);
  const [revView, setRevView] = useState<"week" | "month">("week");

  const ADMIN_STATUS_FLOW: OrderStatus[] = ["Placed", "Preparing", "Ready"];

  // Returns only the buttons valid for an order: next step only (forward-only, no undo)
  function adminButtons(status: OrderStatus): OrderStatus[] {
    if (status === "Placed") return ["Preparing"];
    if (status === "Preparing") return ["Ready"];
    return []; // Ready and beyond: agent handles it
  }

  async function handleAdminStatus(orderId: string, newStatus: OrderStatus) {
    await updateOrderStatus(orderId, newStatus);
    if (newStatus === "Ready") {
      const err = await assignNearestAgent(orderId);
      if (err) setAgentError(err);
    }
  }

  async function markGPayPaid(orderId: string) {
    await (supabase.from("orders") as any)
      .update({ payment_status: "paid" })
      .eq("id", orderId);
  }
  const [bulkOrders, setBulkOrders] = useState<
    { id: string; name: string; people: number; date: string; status: string }[]
  >([]);
  const [requests, setRequests] = useState<OrderRequest[]>([]);
  const [agentError, setAgentError] = useState<string | null>(null);

  // ── Singleton AudioContext — created once on first user gesture ──
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Unlock AudioContext on first user interaction (required by browsers)
  useEffect(() => {
    const unlock = () => {
      if (!audioCtxRef.current) {
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        if (AC) audioCtxRef.current = new AC();
      }
      if (audioCtxRef.current?.state === "suspended") {
        audioCtxRef.current.resume();
      }
    };
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  function playBeep() {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!audioCtxRef.current && AC) audioCtxRef.current = new AC();
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === "suspended") { ctx.resume(); return; }
      const now = ctx.currentTime;
      [[880, 0], [880, 0.18], [1100, 0.36]].forEach(([freq, t]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + t);
        gain.gain.linearRampToValueAtTime(0.4, now + t + 0.01);
        gain.gain.linearRampToValueAtTime(0, now + t + 0.14);
        osc.start(now + t); osc.stop(now + t + 0.15);
      });
    } catch {}
  }

  // ── Continuous beep while there are pending requests ──
  const requestsRef = useRef(requests);
  useEffect(() => { requestsRef.current = requests; }, [requests]);

  useEffect(() => {
    if (requests.length === 0) return;
    // Play immediately, then repeat every 4 seconds until all requests are handled
    playBeep();
    const interval = setInterval(() => {
      if (requestsRef.current.length > 0) playBeep();
    }, 4000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests.length > 0]);

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
    supabase.from("order_requests" as any).select("*")
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
    const reqCh = supabase.channel("adm-order-req")
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
      supabase.removeChannel(reqCh);
      supabase.removeChannel(bulkCh);
    };
  }, [loadMenu]);

  async function acceptRequest(req: OrderRequest) {
    const { data: orderData, error } = await (supabase.from("orders") as any).insert({
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

    // Delivery request is sent when admin clicks Ready (not here)
    // Mark request accepted with order_id so user gets redirected to track page
    await (supabase.from("order_requests") as any)
      .update({ status: "accepted", order_id: (orderData as any).id })
      .eq("id", req.id);

    setRequests(p => p.filter(r => r.id !== req.id));
  }

  async function denyRequest(id: string) {
    await (supabase.from("order_requests") as any)
      .update({ status: "denied" }).eq("id", id);
    setRequests(p => p.filter(r => r.id !== id));
  }

  async function toggleSoldOut(id: string, current: boolean) {
    const next = !current;
    // Optimistic update — flip instantly in UI
    setItems(prev => prev.map(it => it.id === id ? { ...it, sold_out: next } : it));
    await (supabase.from("menu_items") as any).update({ sold_out: next }).eq("id", id);
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

  // Map of known item IDs to their local /food/ image paths
  const LOCAL_IMAGES: Record<string, string> = {
    bf1:  "/food/IDLY.jpeg",
    bf2:  "/food/kal dosa.jpeg",
    bf3:  "/food/NYC dosa.jpeg",
    bf4:  "/food/plain dosa.jpeg",
    bf5:  "/food/masala dosa.jpeg",
    bf6:  "/food/podi dosa.jpeg",
    bf7:  "/food/onion uththappam.jpeg",
    bf8:  "/food/plain dosa.jpeg",
    bf9:  "/food/pongal.jpeg",
    bf10: "/food/kitchadi.jpeg",
    bf11: "/food/upma.jpeg",
    bf12: "/food/keerai dosa.jpeg",
    bf13: "/food/ravi rotti.jpeg",
    bf14: "/food/mysore masala dosa.jpeg",
    bf15: "/food/Thakkali dosa.jpeg",
    sn1:  "/food/medu vadai.jpeg",
    sn2:  "/food/kara vadai.jpeg",
    ml1:  "/food/full meal.jpeg",
    ml2:  "/food/half meals.jpeg",
    rb1:  "/food/mushroom biriyani.jpeg",
    rb2:  "/food/veg biryani.jpeg",
    rb3:  "/food/Ghee rice.jpeg",
    rb4:  "/food/tomato rice.jpeg",
    rb5:  "/food/curd rice.jpeg",
    rb6:  "/food/lemon rice.jpeg",
    rb7:  "/food/puli rice.jpeg",
    sp1:  "/food/kothu parotta.jpeg",
    ds1:  "/food/kesari.jpeg",
  };

  const [fixingImages, setFixingImages] = useState(false);
  async function fixAllImages() {
    setFixingImages(true);
    const updates = Object.entries(LOCAL_IMAGES).map(([id, image]) =>
      (supabase.from("menu_items") as any).update({ image }).eq("id", id)
    );
    await Promise.all(updates);
    await loadMenu();
    setFixingImages(false);
  }

  const stats = [
    { label: "Today's Revenue", value: `₹${todayRev.toLocaleString()}`, icon: IndianRupee, trend: "Live" },
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

        {/* ── Agent dispatch error ── */}
        {agentError && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" /> {agentError}
            </div>
            <button onClick={() => setAgentError(null)} className="grid h-6 w-6 place-items-center rounded-full hover:bg-destructive/20 transition">
              <X className="h-3.5 w-3.5 text-destructive" />
            </button>
          </div>
        )}

        {/* ── Stats ── */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => {
            const isRevCard = s.label === "Today's Revenue";
            return isRevCard ? (
              <motion.button
                key={s.label}
                type="button"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                onClick={() => setRevExpanded(v => !v)}
                className="rounded-2xl border border-border bg-card p-5 shadow-sm text-left cursor-pointer hover:border-primary/50 hover:shadow-md transition w-full"
              >
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-xl gradient-primary text-primary-foreground">
                    <s.icon className="h-5 w-5" />
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-full px-2 py-0.5 text-xs font-semibold bg-emerald-600/10 text-emerald-600">Live</span>
                    {revExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
                <div className="mt-3 text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground">Today's Revenue — click for breakdown</div>
              </motion.button>
            ) : (
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
            );
          })}
        </div>

        {/* ── Revenue Breakdown (click on Today's Revenue) ── */}
        <AnimatePresence>
          {revExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 rounded-3xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex rounded-full border border-border bg-background p-1">
                      {(["week", "month"] as const).map((v) => (
                        <button key={v} onClick={() => setRevView(v)}
                          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition capitalize ${
                            revView === v ? "gradient-primary text-primary-foreground" : "text-muted-foreground"
                          }`}>
                          {v === "week" ? "This Week" : "This Month"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-2xl font-bold">₹{(revView === "week" ? weekRev : monthRev).toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{revView === "week" ? "Last 7 days" : "This month"}</div>
                    </div>
                    <button
                      onClick={() => {
                        const orders = revView === "week" ? weekOrders : monthOrders;
                        const label = revView === "week" ? "weekly" : "monthly";
                        exportToExcel(
                          orders.map(o => ({
                            Date: new Date(o.created_at).toLocaleDateString("en-IN"),
                            Time: new Date(o.created_at).toLocaleTimeString("en-IN"),
                            Customer: o.customer,
                            Location: o.room,
                            Items: o.items?.map((i: any) => `${i.name} x${i.qty}`).join(" | "),
                            Total: o.total,
                            Payment: o.payment_method,
                            Status: o.status,
                          })),
                          `sam-revenue-${label}-${new Date().toISOString().slice(0,10)}`
                        );
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-accent transition"
                    >
                      <Download className="h-3.5 w-3.5" /> Export
                    </button>
                  </div>
                </div>

                {/* Today's revenue download */}
                <div className="mb-3 flex items-center justify-between rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Today's Revenue</div>
                    <div className="text-lg font-bold">₹{todayRev.toLocaleString()}</div>
                  </div>
                  <button
                    onClick={() => exportToExcel(
                      todayOrders.map(o => ({
                        Date: new Date(o.created_at).toLocaleDateString("en-IN"),
                        Time: new Date(o.created_at).toLocaleTimeString("en-IN"),
                        Customer: o.customer,
                        Location: o.room,
                        Items: o.items?.map((i: any) => `${i.name} x${i.qty}`).join(" | "),
                        Total: o.total,
                        Payment: o.payment_method,
                        Status: o.status,
                      })),
                      `sam-revenue-today-${new Date().toISOString().slice(0,10)}`
                    )}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-accent transition"
                  >
                    <Download className="h-3.5 w-3.5" /> Today
                  </button>
                </div>

                {/* Order rows */}
                <div className="max-h-[320px] overflow-y-auto space-y-1.5 pr-1">
                  {(revView === "week" ? weekOrders : monthOrders).map((o: any) => (
                    <div key={o.id} className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-xs">
                      <div className="min-w-0">
                        <span className="font-semibold">{o.customer}</span>
                        <span className="ml-2 text-muted-foreground">{o.room}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-bold">₹{o.total}</span>
                        <span className="text-muted-foreground">{new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── GPay Pending Payment section ── */}
        <AnimatePresence>
          {gpayPending.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-8">
              <div className="rounded-3xl border border-amber-400/40 bg-amber-50 dark:bg-amber-950/20 p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-[Fraunces] text-xl font-bold flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-amber-600" />
                    GPay — Awaiting Payment
                  </h2>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-600">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                    </span>
                    {gpayPending.length} pending
                  </span>
                </div>
                <div className="space-y-2">
                  {gpayPending.map((o) => (
                    <div key={o.id} className={`rounded-2xl border p-3 ${
                      o.status === "Cancelled"
                        ? "border-destructive/40 bg-destructive/5"
                        : "border-amber-400/30 bg-white dark:bg-amber-950/30"
                    }`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{o.id.slice(0, 8)}</span>
                          <span className="text-sm font-semibold">{o.customer}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold truncate max-w-[120px] ${
                            o.status === "Cancelled" ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-700"
                          }`}>{o.room}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">₹{o.total}</span>
                          {o.status === "Cancelled" ? (
                            <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">✕ Cancelled by user</span>
                          ) : (
                            <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-700">⏳ Awaiting Payment</span>
                          )}
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {o.items.map((i) => `${i.name} ×${i.qty}`).join(", ")} · {new Date(o.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: true })}
                      </div>
                      {o.status !== "Cancelled" && (
                        <div className="mt-2 flex items-center gap-2">
                          <button onClick={() => markGPayPaid(o.id)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-emerald-700 transition">
                            <CheckCircle2 className="h-3 w-3" /> Mark Paid — Move to Live Orders
                          </button>
                          <button onClick={() => setViewOrder(o)}
                            className="ml-auto inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-semibold text-muted-foreground hover:bg-accent transition">
                            <Eye className="h-3 w-3" /> View
                          </button>
                        </div>
                      )}
                      {o.status === "Cancelled" && (
                        <div className="mt-2 flex justify-end">
                          <button onClick={() => setViewOrder(o)}
                            className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-semibold text-muted-foreground hover:bg-accent transition">
                            <Eye className="h-3 w-3" /> View
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Live orders + Weekly revenue + Bulk Bookings ── */}
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-3xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-[Fraunces] text-xl font-bold">Live Orders</h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                <Activity className="h-3 w-3 animate-pulse" />
                Live Sync
              </span>
            </div>
            {liveOrders.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                No orders yet. Accepted orders appear here instantly.
              </p>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {liveOrders.map((o) => (
                  <div key={o.id} className={`rounded-2xl border p-3 transition-colors duration-700 ${
                    o.status === "Cancelled"
                      ? "border-destructive/40 bg-destructive/10"
                      : o.status === "Delivered"
                      ? "border-emerald-500/40 bg-emerald-500/20"
                      : o.status === "Out for delivery"
                      ? "border-emerald-400/30 bg-emerald-500/10"
                      : "border-border"
                  }`}>
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
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <span>{o.items.map((i) => `${i.name} ×${i.qty}`).join(", ")}</span>
                      <span className="text-muted-foreground/50">·</span>
                      <span className="font-medium text-foreground/70">{new Date(o.created_at).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: true })}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {/* Forward-only buttons — only next valid step shown */}
                      {adminButtons(o.status).map((s) => (
                        <button key={s} onClick={() => handleAdminStatus(o.id, s)}
                          className="rounded-full gradient-primary px-2.5 py-1 text-[10px] font-bold text-primary-foreground shadow-sm transition hover:opacity-90">
                          → {s}
                        </button>
                      ))}
                      {/* Cancelled by user */}
                      {o.status === "Cancelled" && (
                        <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-[10px] font-semibold text-destructive">
                          ✕ Cancelled by user
                        </span>
                      )}
                      {/* Current status badge (read-only) */}
                      {(o.status === "Out for delivery" || o.status === "Delivered" || o.status === "Ready") && (
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                          o.status === "Delivered" ? "bg-emerald-600/10 text-emerald-600"
                          : o.status === "Out for delivery" ? "bg-blue-500/10 text-blue-600"
                          : "bg-amber-500/10 text-amber-600"
                        }`}>
                          {o.status === "Ready" ? "⏳ Awaiting agent" : o.status}
                        </span>
                      )}
                      {/* Current stage label for Placed/Preparing */}
                      {(o.status === "Placed" || o.status === "Preparing") && (
                        <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] text-muted-foreground font-medium">
                          {o.status}
                        </span>
                      )}
                      <button onClick={() => setViewOrder(o)}
                        className="ml-auto inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-semibold text-muted-foreground hover:bg-accent transition">
                        <Eye className="h-3 w-3" /> View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <WeeklyRevenueChart />
        </div>

        {/* ── Manage Menu ── */}
        <div className="mt-8">
          <div className="rounded-3xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-[Fraunces] text-xl font-bold flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-primary" /> Manage Menu
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={fixAllImages}
                  disabled={fixingImages}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-accent transition disabled:opacity-60"
                >
                  {fixingImages ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  {fixingImages ? "Fixing…" : "Fix Images"}
                </button>
                <button onClick={() => setEditing({ id: "new", name: "", description: "", price: 0, rating: 4.5, category: "Starters", veg: true, image: "" })}
                  className="inline-flex items-center gap-1 rounded-full gradient-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
                  <Plus className="h-3.5 w-3.5" /> Add item
                </button>
              </div>
            </div>
            <div className="max-h-[480px] overflow-y-auto pr-1">
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {[...items].sort((a, b) => a.name.localeCompare(b.name)).map((it) => (
                  <div key={it.id} className={`rounded-2xl border p-3 transition ${it.sold_out ? "border-destructive/30 bg-destructive/5" : "border-border"}`}>
                    {/* Top row: image + name + category */}
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <img src={it.image} alt={it.name} className={`h-14 w-14 rounded-xl object-cover ${it.sold_out ? "brightness-50" : ""}`} />
                        {it.sold_out && (
                          <span className="absolute inset-0 flex items-center justify-center rounded-xl">
                            <span className="text-[9px] font-black text-white uppercase">Sold Out</span>
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold leading-tight">{it.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{it.category} · ₹{it.price}</div>
                      </div>
                    </div>
                    {/* Bottom row: action buttons */}
                    <div className="mt-3 flex items-center gap-2">
                      <button onClick={() => toggleSoldOut(it.id, !!it.sold_out)}
                        className={`cursor-pointer flex-1 rounded-full py-1.5 text-[11px] font-bold transition active:scale-95 ${
                          it.sold_out
                            ? "bg-emerald-600/10 text-emerald-600 hover:bg-emerald-600 hover:text-white"
                            : "bg-destructive/10 text-destructive hover:bg-destructive hover:text-white"
                        }`}>
                        {it.sold_out ? "Release" : "Sold Out"}
                      </button>
                      <button onClick={() => setEditing(it)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-accent transition">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => deleteItem(it.id)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-destructive hover:bg-destructive/10 transition">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── View Order Modal ── */}

        {viewOrder && (
          <div onClick={() => setViewOrder(null)} className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
            <motion.div initial={{ y: 20, opacity: 0, scale: 0.97 }} animate={{ y: 0, opacity: 1, scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-elegant">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-[Fraunces] text-xl font-bold">Order Details</h3>
                <button onClick={() => setViewOrder(null)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-accent transition">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3">
                  <User className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Customer</div>
                    <div className="text-sm font-semibold">{viewOrder.customer}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3">
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Delivery Location</div>
                    <div className="text-sm font-semibold">{viewOrder.room}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3">
                  <CreditCard className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Mode of Payment</div>
                    <div className="text-sm font-semibold uppercase">{viewOrder.payment_method ?? "—"}
                      <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        viewOrder.payment_status === "paid" ? "bg-emerald-600/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
                      }`}>{viewOrder.payment_status ?? "pending"}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3">
                  <Clock className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Order Placed</div>
                    <div className="text-sm font-semibold">
                      {new Date(viewOrder.created_at).toLocaleString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })}
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-background p-3">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">Items</div>
                  <div className="space-y-0.5">
                    {viewOrder.items.map((it, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>{it.name}</span>
                        <span className="text-muted-foreground">×{it.qty}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 border-t border-border pt-2 flex justify-between text-sm font-bold">
                    <span>Total</span><span>₹{viewOrder.total}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-border bg-background p-3">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <StatusPill s={viewOrder.status} />
                </div>
              </div>
            </motion.div>
          </div>
        )}

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
                    {["Breakfast","Briyani","Meals","Starters","Desserts"].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>

                {/* Image upload */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Food Image</label>
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 px-4 py-5 hover:border-primary hover:bg-primary/5 transition">
                    {editing.image ? (
                      <img src={editing.image} alt="preview" className="h-24 w-24 rounded-xl object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-muted-foreground">
                        <Plus className="h-6 w-6" />
                        <span className="text-xs">Click to upload image</span>
                      </div>
                    )}
                    <span className="text-[10px] text-muted-foreground">{editing.image ? "Click to change" : "JPG, PNG, WEBP"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev) => setEditing({ ...editing, image: ev.target?.result as string });
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                </div>

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
