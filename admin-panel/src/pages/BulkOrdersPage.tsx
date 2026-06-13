import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, CalendarDays, CheckCircle, IndianRupee, Loader2,
  MapPin, Phone, Users, X, XCircle, FileText, Clock, Volume2,
  Download, ChevronDown, ChevronUp,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { AdminShell } from "@/components/AdminShell";

// Service-role client — DB mutations only (bypasses RLS)
const adminClient = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

/* ─── Excel export ──────────────────────────────────────── */
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

interface BulkOrder {
  id: string;
  name: string;
  phone: string;
  event: string;
  people: number;
  date: string;
  location: string;
  menu_request: string | null;
  budget: string;
  status: string;
  quoted_amount: number | null;
  payment_status: string;
  payment_ref: string | null;
  paid_at: string | null;
  created_at: string;
}

type AdminTab = "dashboard" | "agents" | "bulk-orders";

function playAlert() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    [{ freq: 660, t: 0 }, { freq: 880, t: 0.18 }, { freq: 550, t: 0.38 }, { freq: 440, t: 0.56 }]
      .forEach(({ freq, t }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = "triangle"; osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.35, ctx.currentTime + t);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.22);
        osc.start(ctx.currentTime + t); osc.stop(ctx.currentTime + t + 0.22);
      });
  } catch { /* blocked until user interaction */ }
}

function StatusBadge({ status, payment_status }: { status: string; payment_status: string }) {
  const map: Record<string, string> = {
    Pending: "bg-amber-500/10 text-amber-600",
    Accepted: "bg-blue-500/10 text-blue-600",
    Confirmed: "bg-emerald-600/10 text-emerald-600",
    Denied: "bg-destructive/10 text-destructive",
    Cancelled: "bg-muted text-muted-foreground",
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${map[status] || "bg-muted text-foreground"}`}>
        {status}
      </span>
      {(status === "Accepted" || status === "Confirmed") && (
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
          payment_status === "paid" ? "bg-emerald-600/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"
        }`}>
          {payment_status === "paid" ? "Paid ✓" : "Awaiting Payment"}
        </span>
      )}
    </div>
  );
}

function OrderDetailModal({
  order, onClose, onAccept, onDeny,
}: {
  order: BulkOrder;
  onClose: () => void;
  onAccept: (id: string, amount: number) => Promise<void>;
  onDeny: (id: string) => Promise<void>;
}) {
  const [amount, setAmount] = useState(order.quoted_amount?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [denying, setDenying] = useState(false);

  useEffect(() => {
    if (order.quoted_amount) setAmount(order.quoted_amount.toString());
  }, [order.quoted_amount]);

  async function handleAccept() {
    const num = parseFloat(amount);
    if (!num || num <= 0) return;
    setSaving(true);
    await onAccept(order.id, num);
    setSaving(false);
  }

  async function handleDeny() {
    setDenying(true);
    await onDeny(order.id);
    setDenying(false);
  }

  const isPending = order.status === "Pending";
  const isAccepted = order.status === "Accepted";
  const isPaid = order.payment_status === "paid" || order.status === "Confirmed";
  const isDenied = order.status === "Denied" || order.status === "Cancelled";

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ y: 20, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.97 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl border border-border bg-card shadow-elegant overflow-hidden"
      >
        <div className="relative gradient-primary p-6 text-primary-foreground">
          <button onClick={onClose}
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-white/20 hover:bg-white/30 transition">
            <X className="h-4 w-4" />
          </button>
          <div className="text-xs uppercase tracking-wider opacity-75 mb-1">Bulk Catering Request</div>
          <div className="text-2xl font-bold font-[Fraunces]">{order.name}</div>
          <div className="mt-2 flex flex-wrap gap-3 text-sm opacity-90">
            <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{order.phone}</span>
            <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{order.date}</span>
            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{order.people} guests</span>
          </div>
          <div className="mt-3">
            <StatusBadge status={order.status} payment_status={order.payment_status} />
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-muted/50 p-3">
              <div className="text-[10px] uppercase text-muted-foreground">Event</div>
              <div className="font-semibold text-sm mt-0.5">{order.event}</div>
            </div>
            <div className="rounded-2xl bg-muted/50 p-3">
              <div className="text-[10px] uppercase text-muted-foreground">Guests</div>
              <div className="font-semibold text-sm mt-0.5">{order.people}</div>
            </div>
            <div className="rounded-2xl bg-muted/50 p-3 col-span-2">
              <div className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />Location
              </div>
              <div className="font-semibold text-sm mt-0.5 line-clamp-2">{order.location}</div>
            </div>
            {order.menu_request && (
              <div className="rounded-2xl bg-muted/50 p-3 col-span-2">
                <div className="text-[10px] uppercase text-muted-foreground">Menu Request</div>
                <div className="text-sm mt-0.5 text-muted-foreground">{order.menu_request}</div>
              </div>
            )}
          </div>

          {isPaid && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 p-4">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold">
                <CheckCircle className="h-5 w-5" /> Payment Received!
              </div>
              <div className="mt-1 text-sm text-emerald-700/80 dark:text-emerald-400/80">
                ₹{order.quoted_amount?.toLocaleString()} · Ref: <span className="font-mono">{order.payment_ref}</span>
              </div>
              {order.paid_at && (
                <div className="text-xs text-emerald-600/70 mt-0.5">
                  {new Date(order.paid_at).toLocaleString("en-IN")}
                </div>
              )}
            </motion.div>
          )}

          {isPending && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Quote Amount (₹) — required to accept
                </label>
                <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 focus-within:border-primary transition">
                  <IndianRupee className="h-4 w-4 text-muted-foreground shrink-0" />
                  <input
                    type="number" placeholder="e.g. 45000" value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleDeny} disabled={denying || saving}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full border border-destructive/40 bg-destructive/5 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10 transition disabled:opacity-60">
                  {denying ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />} Deny
                </button>
                <button onClick={handleAccept} disabled={saving || denying || !amount || parseFloat(amount) <= 0}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full gradient-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60 transition">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  {saving ? "Saving…" : "Accept & Quote"}
                </button>
              </div>
            </div>
          )}

          {isAccepted && !isPaid && (
            <div className="rounded-xl bg-blue-50 dark:bg-blue-950/20 p-3 text-sm text-blue-700 dark:text-blue-400 flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 animate-pulse" />
              Waiting for customer to pay <span className="font-bold ml-1">₹{order.quoted_amount?.toLocaleString()}</span>
            </div>
          )}

          {isDenied && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive text-center font-semibold">
              This request was {order.status.toLowerCase()}.
            </div>
          )}

          <button onClick={onClose}
            className="w-full rounded-full border border-border py-2.5 text-sm font-semibold hover:bg-accent transition">
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}

async function fetchAllOrders(): Promise<BulkOrder[]> {
  const { data } = await (adminClient.from("bulk_orders") as any)
    .select("*").order("created_at", { ascending: false });
  return (data as BulkOrder[]) ?? [];
}

export function BulkOrdersPage({ onNavigate }: { onNavigate?: (tab: AdminTab) => void }) {
  const [orders, setOrders] = useState<BulkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "Pending" | "Accepted" | "Confirmed" | "Denied">("all");
  const soundUnlocked = useRef(false);
  const prevIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDone = useRef(false);

  // Revenue stats
  const [todayRev, setTodayRev] = useState(0);
  const [weekRev, setWeekRev] = useState(0);
  const [monthRev, setMonthRev] = useState(0);
  const [todayOrders, setTodayOrders] = useState<BulkOrder[]>([]);
  const [weekOrders, setWeekOrders] = useState<BulkOrder[]>([]);
  const [monthOrders, setMonthOrders] = useState<BulkOrder[]>([]);
  const [revExpanded, setRevExpanded] = useState(false);
  const [revView, setRevView] = useState<"week" | "month">("week");

  async function loadRevenue() {
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
    const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - 6); weekStart.setHours(0,0,0,0);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const { data } = await (adminClient.from("bulk_orders") as any)
      .select("*").eq("payment_status", "paid").gte("created_at", monthStart.toISOString());
    const all = (data as BulkOrder[]) ?? [];
    const todays = all.filter(o => new Date(o.created_at) >= todayStart);
    const weeks = all.filter(o => new Date(o.created_at) >= weekStart);
    setTodayOrders(todays); setWeekOrders(weeks); setMonthOrders(all);
    setTodayRev(todays.reduce((s, o) => s + Number(o.quoted_amount ?? 0), 0));
    setWeekRev(weeks.reduce((s, o) => s + Number(o.quoted_amount ?? 0), 0));
    setMonthRev(all.reduce((s, o) => s + Number(o.quoted_amount ?? 0), 0));
  }

  // unlock AudioContext on first user interaction
  useEffect(() => {
    const unlock = () => { soundUnlocked.current = true; };
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  // initial load
  useEffect(() => {
    fetchAllOrders().then((data) => {
      setOrders(data);
      prevIdsRef.current = new Set(data.map((o) => o.id));
      initialLoadDone.current = true;
      setLoading(false);
    });
    loadRevenue();
  }, []);

  // realtime — anon key client created inside effect + polling fallback
  useEffect(() => {
    // Anon key client — service role does NOT receive realtime postgres_changes events
    const rt = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const ch = rt
      .channel("bulk-orders-admin")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bulk_orders" },
        ({ new: row }) => {
          const r = row as BulkOrder;
          setOrders((prev) => {
            if (prev.some((o) => o.id === r.id)) return prev;
            if (soundUnlocked.current) playAlert();
            prevIdsRef.current.add(r.id);
            return [r, ...prev];
          });
        }
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "bulk_orders" },
        ({ new: row }) => {
          setOrders((prev) => prev.map((o) => o.id === (row as BulkOrder).id ? (row as BulkOrder) : o));
        }
      )
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "bulk_orders" },
        ({ old: row }) => {
          const id = (row as any).id;
          if (id) setOrders((prev) => prev.filter((o) => o.id !== id));
        }
      )
      .subscribe();

    // Polling fallback every 4s — guarantees updates even if realtime misses an event
    const poll = setInterval(async () => {
      if (!initialLoadDone.current) return;
      const data = await fetchAllOrders();
      setOrders((prev) => {
        const hasNew = data.some((o) => !prevIdsRef.current.has(o.id));
        const hasChange = data.some((o) => {
          const p = prev.find((x) => x.id === o.id);
          return p && (p.status !== o.status || p.payment_status !== o.payment_status);
        });
        if (!hasNew && !hasChange) return prev;
        if (hasNew && soundUnlocked.current) playAlert();
        data.forEach((o) => prevIdsRef.current.add(o.id));
        return data;
      });
    }, 4000);

    return () => {
      rt.removeChannel(ch);
      clearInterval(poll);
    };
  }, []);

  const viewingOrder = viewingId ? orders.find((o) => o.id === viewingId) ?? null : null;

  async function acceptOrder(id: string, amount: number) {
    await (adminClient.from("bulk_orders") as any)
      .update({ status: "Accepted", quoted_amount: amount }).eq("id", id);
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: "Accepted", quoted_amount: amount } : o));
  }

  async function denyOrder(id: string) {
    await (adminClient.from("bulk_orders") as any)
      .update({ status: "Denied" }).eq("id", id);
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: "Denied" } : o));
    setViewingId(null);
  }

  async function clearHistory() {
    const toClear = ["Denied", "Confirmed", "Cancelled"];
    await (adminClient.from("bulk_orders") as any).delete().in("status", toClear);
    setOrders((prev) => prev.filter((o) => !toClear.includes(o.status)));
  }

  const pending = orders.filter((o) => o.status === "Pending");
  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);
  const FILTERS = ["all", "Pending", "Accepted", "Confirmed"] as const;

  return (
    <AdminShell activeTab="bulk-orders" onNavigate={onNavigate}>
      <section className="mx-auto max-w-5xl px-4 py-10 md:px-6">

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-primary">Admin</div>
            <h1 className="font-[Fraunces] text-4xl font-black md:text-5xl">Bulk Orders</h1>
            <p className="mt-1 text-muted-foreground">
              {orders.length} total ·{" "}
              <span className={pending.length > 0 ? "text-amber-600 font-semibold" : ""}>
                {pending.length} pending
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            {pending.length > 0 && (
              <motion.span initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-4 py-2 text-sm font-bold text-amber-600">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
                </span>
                {pending.length} new request{pending.length !== 1 ? "s" : ""}
              </motion.span>
            )}
            <button onClick={clearHistory}
              className="rounded-full border border-border px-4 py-1.5 text-xs font-semibold hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive transition">
              Clear History
            </button>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600/10 px-3 py-1.5 text-xs font-semibold text-emerald-600">
              <span className="relative grid h-2 w-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-500/70" />
                <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Live
            </span>
          </div>
        </div>

        {/* Revenue panel */}
        <button
          type="button"
          className="mt-5 w-full text-left cursor-pointer rounded-2xl border border-border bg-card p-4 shadow-sm hover:border-primary/40 transition"
          onClick={() => setRevExpanded(v => !v)}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Today's Bulk Revenue</div>
              <div className="text-2xl font-bold">₹{todayRev.toLocaleString()}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-600/10 px-2 py-0.5 text-xs font-semibold text-emerald-600">Live</span>
              {revExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </div>
        </button>

        <AnimatePresence>
          {revExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-3xl border border-border bg-card p-5 mt-3">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex rounded-full border border-border bg-background p-1">
                    {(["week", "month"] as const).map((v) => (
                      <button key={v} onClick={(e) => { e.stopPropagation(); setRevView(v); }}
                        className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                          revView === v ? "gradient-primary text-primary-foreground" : "text-muted-foreground"
                        }`}>
                        {v === "week" ? "This Week" : "This Month"}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-xl font-bold">₹{(revView === "week" ? weekRev : monthRev).toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{revView === "week" ? "Last 7 days" : "This month"}</div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const list = revView === "week" ? weekOrders : monthOrders;
                        exportToExcel(
                          list.map(o => ({
                            Date: new Date(o.created_at).toLocaleDateString("en-IN"),
                            Name: o.name, Phone: o.phone, Event: o.event,
                            Guests: o.people, Location: o.location,
                            Amount: o.quoted_amount ?? "",
                            Status: o.status, Payment: o.payment_status,
                          })),
                          `bulk-revenue-${revView}-${new Date().toISOString().slice(0,10)}`
                        );
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-accent transition"
                    >
                      <Download className="h-3.5 w-3.5" /> Export
                    </button>
                  </div>
                </div>

                {/* Today's row */}
                <div className="mb-3 flex items-center justify-between rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                  <div>
                    <div className="text-xs text-muted-foreground">Today's Bulk Revenue</div>
                    <div className="text-lg font-bold">₹{todayRev.toLocaleString()}</div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      exportToExcel(
                        todayOrders.map(o => ({
                          Date: new Date(o.created_at).toLocaleDateString("en-IN"),
                          Name: o.name, Phone: o.phone, Event: o.event,
                          Guests: o.people, Location: o.location,
                          Amount: o.quoted_amount ?? "",
                          Status: o.status, Payment: o.payment_status,
                        })),
                        `bulk-revenue-today-${new Date().toISOString().slice(0,10)}`
                      );
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-accent transition"
                  >
                    <Download className="h-3.5 w-3.5" /> Today
                  </button>
                </div>

                <div className="max-h-[280px] overflow-y-auto space-y-1.5 pr-1">
                  {(revView === "week" ? weekOrders : monthOrders).map((o) => (
                    <div key={o.id} className="flex items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-xs">
                      <div className="min-w-0">
                        <span className="font-semibold">{o.name}</span>
                        <span className="ml-2 text-muted-foreground">{o.event} · {o.people} guests</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-bold">₹{o.quoted_amount?.toLocaleString()}</span>
                        <span className="text-muted-foreground">{new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-6 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition capitalize ${
                filter === f ? "gradient-primary text-primary-foreground shadow-sm" : "border border-border bg-background hover:bg-accent"
              }`}>
              {f === "all" ? `All (${orders.length})` : `${f} (${orders.filter((o) => o.status === f).length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="mt-16 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border p-16 text-center text-sm text-muted-foreground">
            No bulk orders here yet.
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <AnimatePresence initial={false}>
              {filtered.map((o) => (
                <motion.div key={o.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }} layout
                  className={`rounded-3xl border p-5 shadow-sm transition hover:shadow-elegant cursor-pointer ${
                    o.status === "Pending" ? "border-amber-400/40 bg-card" :
                    o.status === "Confirmed" ? "border-emerald-500/40 bg-emerald-500/10" :
                    o.status === "Denied" || o.status === "Cancelled" ? "border-destructive/40 bg-destructive/10" :
                    "border-border bg-card"
                  }`}
                  onClick={() => setViewingId(o.id)}>
                  {o.status === "Pending" && (
                    <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-600">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                      </span>
                      New Request
                    </span>
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-[Fraunces] text-lg font-bold">{o.name}</div>
                      <div className="text-xs text-muted-foreground">{o.event} · {o.people} guests</div>
                    </div>
                    <StatusBadge status={o.status} payment_status={o.payment_status} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{o.date}</span>
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{o.phone}</span>
                    <span className="flex items-center gap-1 col-span-2 truncate">
                      <MapPin className="h-3 w-3 shrink-0" />{o.location}
                    </span>
                  </div>
                  {o.quoted_amount && (
                    <div className="mt-3 flex items-center gap-1.5 text-sm font-bold">
                      <IndianRupee className="h-4 w-4 text-primary" />
                      ₹{o.quoted_amount.toLocaleString()} quoted
                      {o.payment_status === "paid" && (
                        <span className="ml-1 rounded-full bg-emerald-600/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">Paid ✓</span>
                      )}
                    </div>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold hover:border-primary hover:text-primary transition">
                      <FileText className="h-3 w-3" /> View Details
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        <AnimatePresence>
          {viewingOrder && (
            <OrderDetailModal
              key={viewingOrder.id}
              order={viewingOrder}
              onClose={() => setViewingId(null)}
              onAccept={acceptOrder}
              onDeny={denyOrder}
            />
          )}
        </AnimatePresence>
      </section>
    </AdminShell>
  );
}
