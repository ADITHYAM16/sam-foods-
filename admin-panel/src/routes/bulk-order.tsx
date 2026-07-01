import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  CalendarDays, CheckCircle2, Loader2, MapPin, Navigation,
  PartyPopper, Phone, User, Users, UtensilsCrossed,
  IndianRupee, Clock, Printer, X, Star, ChevronRight, History,
} from "lucide-react";
import { useMenu } from "@/lib/menu-hook";
import { CATEGORIES } from "@/lib/menu-data";
import { motion, AnimatePresence } from "framer-motion";
import { SiteShell } from "@/components/site/SiteShell";
import { Field } from "./login";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/bulk-order")({
  component: BulkOrderPage,
  head: () => ({ meta: [{ title: "Bulk Catering — SAM Foods" }] }),
});

const MENU_TYPES = ["Breakfast", "Lunch", "Dinner", "Full Day"] as const;
type MenuType = typeof MENU_TYPES[number];
type Stage = "form" | "submitted" | "payment" | "receipt" | "denied";

interface BulkOrderRow {
  id: string;
  name: string;
  status: string;
  quoted_amount: number | null;
  payment_status: string;
  payment_ref: string | null;
  paid_at: string | null;
  event: string;
  people: number;
  date: string;
  location: string;
  phone: string;
  menu_request: string | null;
  budget?: string;
  created_at: string;
}

/* ── History Modal ───────────────────────────────────────── */
const STATUS_STYLE: Record<string, string> = {
  Pending: "bg-amber-500/10 text-amber-600",
  Accepted: "bg-blue-500/10 text-blue-600",
  Confirmed: "bg-emerald-600/10 text-emerald-600",
  Denied: "bg-destructive/10 text-destructive",
  Cancelled: "bg-muted text-muted-foreground",
};

function HistoryModal({ onClose }: { onClose: () => void }) {
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState<BulkOrderRow[] | null>(null);
  const [fetching, setFetching] = useState(false);
  const [receipt, setReceipt] = useState<BulkOrderRow | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    setFetching(true);
    const { data } = await (supabase.from("bulk_orders") as any)
      .select("*")
      .eq("phone", phone.trim())
      .order("created_at", { ascending: false });
    setOrders((data as BulkOrderRow[]) ?? []);
    setFetching(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-4 md:px-8">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <div className="font-[Fraunces] text-2xl font-black">My Booking History</div>
        </div>
        <button onClick={onClose}
          className="grid h-9 w-9 place-items-center rounded-full border border-border hover:bg-accent transition">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
        {/* Phone lookup */}
        <form onSubmit={search} className="flex gap-2 max-w-sm mb-6">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 focus-within:border-primary transition">
            <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              className="w-full bg-transparent text-sm outline-none"
              placeholder="Enter your phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <button type="submit" disabled={fetching}
            className="rounded-xl gradient-primary px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60">
            {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
          </button>
        </form>

        {orders === null && (
          <p className="text-sm text-muted-foreground">Enter your phone number to view all past bulk order requests.</p>
        )}

        {orders !== null && orders.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            No bookings found for this number.
          </div>
        )}

        {orders && orders.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {orders.map((o) => (
              <motion.div key={o.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl border border-border bg-card p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="font-[Fraunces] text-lg font-bold">{o.name}</div>
                    <div className="text-xs text-muted-foreground">{o.event} · {o.people} guests</div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[o.status] ?? "bg-muted text-foreground"}`}>
                    {o.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{o.date}</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" />{o.people} people</span>
                  <span className="flex items-center gap-1 col-span-2 truncate"><MapPin className="h-3 w-3 shrink-0" />{o.location}</span>
                  {o.menu_request && (
                    <span className="col-span-2 text-muted-foreground line-clamp-1">📋 {o.menu_request}</span>
                  )}
                </div>

                {o.quoted_amount && (
                  <div className="flex items-center gap-1.5 text-sm font-bold mb-3">
                    <IndianRupee className="h-4 w-4 text-primary" />
                    ₹{o.quoted_amount.toLocaleString()}
                    {o.payment_status === "paid" && (
                      <span className="ml-1 rounded-full bg-emerald-600/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">Paid ✓</span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  {o.payment_status === "paid" && (
                    <button onClick={() => setReceipt(o)}
                      className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-semibold hover:border-primary hover:text-primary transition">
                      <Printer className="h-3 w-3" /> Receipt
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {receipt && <Receipt order={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}

/* ── Menu Viewer Modal ───────────────────────────────────── */
function MenuViewerModal({ onClose }: { onClose: () => void }) {
  const { menu, loading } = useMenu();
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const categories = ["All", ...CATEGORIES];
  const filtered = activeCategory === "All" ? menu : menu.filter((i) => i.category === activeCategory);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-4 md:px-8">
        <div>
          <div className="font-[Fraunces] text-2xl font-black">Our Menu</div>
          <div className="text-xs text-muted-foreground">{menu.length} items available for catering</div>
        </div>
        <button onClick={onClose}
          className="grid h-9 w-9 place-items-center rounded-full border border-border hover:bg-accent transition">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto border-b border-border px-4 py-3 md:px-8 scrollbar-none">
        {categories.map((c) => (
          <button key={c} onClick={() => setActiveCategory(c)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
              activeCategory === c
                ? "gradient-primary text-primary-foreground shadow-sm"
                : "border border-border bg-background hover:bg-accent"
            }`}>
            {c}
          </button>
        ))}
      </div>

      {/* Items grid */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
              >
                {/* Image */}
                <div className="relative w-full" style={{ paddingBottom: "66%" }}>
                  <img
                    src={item.image}
                    alt={item.name}
                    loading="lazy"
                    className={`absolute inset-0 h-full w-full object-cover ${
                      item.sold_out ? "grayscale brightness-50" : ""
                    }`}
                  />
                  {/* veg dot */}
                  <span className={`absolute left-2 top-2 flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold backdrop-blur ${
                    item.veg
                      ? "border-emerald-600/50 bg-emerald-50/80 text-emerald-700"
                      : "border-rose-600/50 bg-rose-50/80 text-rose-700"
                  }`}>
                    <span className={`h-2 w-2 rounded-full ${item.veg ? "bg-emerald-600" : "bg-rose-600"}`} />
                    {item.veg ? "VEG" : "NON-VEG"}
                  </span>
                  {item.badge && !item.sold_out && (
                    <span className="absolute bottom-2 left-2 rounded-full gradient-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
                      {item.badge}
                    </span>
                  )}
                  {item.sold_out && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="rotate-[-25deg] border-2 border-red-500 px-3 py-1 text-sm font-black uppercase tracking-widest text-red-500">
                        Sold Out
                      </span>
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="p-3">
                  <div className="flex items-start justify-between gap-1">
                    <span className="font-semibold text-sm leading-tight">{item.name}</span>
                    <span className="flex shrink-0 items-center gap-0.5 text-[10px] font-semibold text-emerald-600">
                      <Star className="h-3 w-3 fill-current" />{item.rating}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground line-clamp-1">{item.description}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-base font-black">₹{item.price}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {item.category}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Receipt ────────────────────────────────────────────── */
function Receipt({ order, onClose }: { order: BulkOrderRow; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  function printReceipt() {
    const el = ref.current;
    if (!el) return;
    const win = window.open("", "_blank", "width=700,height=900");
    if (!win) return;
    win.document.write(`
      <html><head><title>SAM Foods — Bulk Order Receipt</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', sans-serif; background: #fff; color: #111; padding: 40px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #e63c1e; padding-bottom: 20px; margin-bottom: 24px; }
        .brand { font-size: 28px; font-weight: 900; color: #e63c1e; }
        .brand-sub { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #888; }
        .receipt-title { font-size: 13px; text-align: right; color: #888; text-transform: uppercase; letter-spacing: 1px; }
        .receipt-no { font-size: 22px; font-weight: 800; color: #111; text-align: right; }
        .paid-stamp { border: 4px solid #16a34a; color: #16a34a; font-size: 32px; font-weight: 900; letter-spacing: 6px; padding: 6px 18px; border-radius: 8px; display: inline-block; transform: rotate(-12deg); margin: 10px 0 24px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        td { padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
        td:first-child { color: #888; width: 40%; }
        td:last-child { font-weight: 600; text-align: right; }
        .total-row td { font-size: 18px; font-weight: 900; border-top: 2px solid #111; border-bottom: none; padding-top: 14px; }
        .footer { margin-top: 32px; font-size: 11px; color: #aaa; text-align: center; border-top: 1px solid #eee; padding-top: 16px; }
        .watermark { text-align: center; margin: 20px 0; }
      </style></head><body>
      <div class="header">
        <div>
          <div class="brand">SAM Foods</div>
          <div class="brand-sub">Catering &amp; Bulk Orders</div>
        </div>
        <div>
          <div class="receipt-title">Payment Receipt</div>
          <div class="receipt-no">#${order.id.slice(0, 8).toUpperCase()}</div>
        </div>
      </div>
      <div class="watermark">
        <span class="paid-stamp">PAID</span>
      </div>
      <table>
        <tr><td>Customer Name</td><td>${order.name}</td></tr>
        <tr><td>Phone</td><td>${order.phone}</td></tr>
        <tr><td>Event Type</td><td>${order.event}</td></tr>
        <tr><td>Event Date</td><td>${order.date}</td></tr>
        <tr><td>Guests</td><td>${order.people}</td></tr>
        <tr><td>Location</td><td>${order.location}</td></tr>
        ${order.menu_request ? `<tr><td>Menu Request</td><td>${order.menu_request}</td></tr>` : ""}
        ${order.budget ? `<tr><td>Budget Range</td><td>${order.budget}</td></tr>` : ""}
        <tr><td>Payment Reference</td><td>${order.payment_ref}</td></tr>
        <tr><td>Paid On</td><td>${order.paid_at ? new Date(order.paid_at).toLocaleString("en-IN") : "-"}</td></tr>
        <tr class="total-row"><td>Amount Paid</td><td>₹${order.quoted_amount?.toLocaleString()}</td></tr>
      </table>
      <div class="footer">
        Thank you for choosing SAM Foods Catering! · +91 98765 43210<br/>
        This is a computer-generated receipt. No signature required.
      </div>
      </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md rounded-3xl border border-border bg-card shadow-elegant overflow-hidden"
      >
        {/* Receipt header */}
        <div className="gradient-primary p-6 text-primary-foreground">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-[Fraunces] text-2xl font-black">SAM Foods</div>
              <div className="text-xs opacity-75 uppercase tracking-widest">Catering & Bulk Orders</div>
            </div>
            <div className="text-right">
              <div className="text-xs opacity-75 uppercase">Receipt</div>
              <div className="font-mono text-lg font-bold">#{order.id.slice(0, 8).toUpperCase()}</div>
            </div>
          </div>
          {/* PAID stamp */}
          <div className="mt-4 flex justify-center">
            <span className="inline-block rotate-[-12deg] rounded-lg border-4 border-white/80 px-5 py-1.5 text-2xl font-black uppercase tracking-[6px] text-white/90 shadow-sm">
              PAID
            </span>
          </div>
        </div>

        <div ref={ref} className="p-6 space-y-2">
          {[
            ["Customer", order.name],
            ["Phone", order.phone],
            ["Event", order.event],
            ["Date", order.date],
            ["Guests", String(order.people)],
            ["Location", order.location],
            ["Payment Ref", order.payment_ref ?? "-"],
            ["Paid On", order.paid_at ? new Date(order.paid_at).toLocaleString("en-IN") : "-"],
          ].map(([k, v]) => (
            <div key={k} className="flex items-start justify-between gap-4 border-b border-border pb-2 last:border-0">
              <span className="text-xs text-muted-foreground">{k}</span>
              <span className="text-xs font-semibold text-right max-w-[60%]">{v}</span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2 mt-2 border-t-2 border-foreground">
            <span className="font-bold">Amount Paid</span>
            <span className="text-xl font-black text-emerald-600">₹{order.quoted_amount?.toLocaleString()}</span>
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button onClick={printReceipt}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-full gradient-primary py-2.5 text-sm font-bold text-primary-foreground">
            <Printer className="h-4 w-4" /> Print / Save PDF
          </button>
          <button onClick={onClose}
            className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold hover:bg-accent transition">
            Close
          </button>
        </div>

        <div className="px-6 pb-5 text-center text-[10px] text-muted-foreground">
          Thank you for choosing SAM Foods! · This is a computer-generated receipt.
        </div>
      </motion.div>
    </div>
  );
}

/* ── Payment Page ─────────────────────────────────────────── */
const OWNER_UPI = import.meta.env.VITE_OWNER_UPI_ID || "samfoods@upi";

function PaymentPage({ order, onPaid, onCancel }: { order: BulkOrderRow; onPaid: (updated: BulkOrderRow) => void; onCancel: () => void }) {
  const [step, setStep] = useState<"pay" | "confirm">("pay");
  const [txnId, setTxnId] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const amount = order.quoted_amount ?? 0;
  const note = encodeURIComponent(`SAM Foods Catering - ${order.event} - ${order.name}`);
  const payeeName = encodeURIComponent("SAM Foods");

  // GPay / any UPI app deep link
  const gpayLink = `tez://upi/pay?pa=${OWNER_UPI}&pn=${payeeName}&am=${amount}&cu=INR&tn=${note}`;
  // Fallback intent URI that works on all UPI apps including GPay on Android
  const upiIntent = `upi://pay?pa=${OWNER_UPI}&pn=${payeeName}&am=${amount}&cu=INR&tn=${note}`;

  function openGPay() {
    // Try tez:// (GPay) first; fall back to upi:// which Android handles generically
    const a = document.createElement("a");
    a.href = gpayLink;
    a.click();
    // After ~800ms if nothing opened, try generic upi://
    setTimeout(() => {
      const b = document.createElement("a");
      b.href = upiIntent;
      b.click();
    }, 800);
    // Move to confirm step so user can enter txn ID after paying
    setTimeout(() => setStep("confirm"), 1200);
  }

  async function confirmPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!txnId.trim()) return setErr("Please enter the UPI transaction ID shown in GPay after payment.");
    setSaving(true);
    setErr(null);
    const paidAt = new Date().toISOString();
    const { error } = await (supabase.from("bulk_orders") as any)
      .update({ payment_status: "paid", payment_ref: txnId.trim(), paid_at: paidAt, status: "Confirmed" })
      .eq("id", order.id);
    if (error) { setErr("Failed to record payment. Please try again."); setSaving(false); return; }
    onPaid({ ...order, payment_status: "paid", payment_ref: txnId.trim(), paid_at: paidAt, status: "Confirmed" });
  }

  return (
    <section className="mx-auto max-w-md px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-border bg-card p-8 shadow-elegant"
      >
        {/* Order summary */}
        <div className="text-center mb-6">
          <span className="inline-grid h-16 w-16 place-items-center rounded-full gradient-primary text-primary-foreground shadow-glow mb-3">
            <IndianRupee className="h-8 w-8" />
          </span>
          <h2 className="font-[Fraunces] text-3xl font-black">Complete Payment</h2>
          <p className="mt-1 text-sm text-muted-foreground">Your bulk order has been accepted!</p>
        </div>

        <div className="rounded-2xl bg-muted/50 p-4 mb-6 space-y-2">
          {[
            ["Customer", order.name],
            ["Event", `${order.event} · ${order.people} guests`],
            ["Date", order.date],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{k}</span>
              <span className="font-semibold">{v}</span>
            </div>
          ))}
          <div className="flex justify-between items-center pt-2 border-t border-border">
            <span className="font-bold">Total Amount</span>
            <span className="text-2xl font-black text-primary">₹{amount.toLocaleString()}</span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === "pay" ? (
            <motion.div key="pay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              {/* GPay button */}
              <button
                onClick={openGPay}
                className="w-full flex items-center justify-center gap-3 rounded-2xl bg-[#1a73e8] hover:bg-[#1557b0] transition py-4 text-white font-bold text-base shadow-elegant"
              >
                <svg width="24" height="24" viewBox="0 0 48 48" fill="none">
                  <path d="M43.6 20.5H42V20H24v8h11.3C33.7 32.3 29.3 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.2 2.7l5.7-5.7C33.5 7.1 29 5 24 5 12.9 5 4 13.9 4 25s8.9 20 20 20 20-8.9 20-20c0-1.5-.2-2.7-.4-4.5z" fill="#FFC107"/>
                  <path d="M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c2.8 0 5.3 1 7.2 2.7l5.7-5.7C33.5 7.1 29 5 24 5c-7.7 0-14.3 4.4-17.7 9.7z" fill="#FF3D00"/>
                  <path d="M24 45c4.9 0 9.3-1.9 12.7-4.9l-5.9-5c-1.7 1.2-3.9 2-6.8 2-5.3 0-9.7-2.7-11.3-7l-6.5 5c3.3 5.4 9.8 9.9 17.8 9.9z" fill="#4CAF50"/>
                  <path d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.3 5.5l5.9 5C36.8 36.1 44 30 44 25c0-1.5-.2-2.7-.4-4.5z" fill="#1976D2"/>
                </svg>
                Pay ₹{amount.toLocaleString()} via Google Pay
              </button>

              <button
                onClick={() => setStep("confirm")}
                className="w-full rounded-2xl border border-border py-3 text-sm font-semibold text-muted-foreground hover:bg-accent transition"
              >
                Already paid? Enter transaction ID →
              </button>
            </motion.div>
          ) : (
            <motion.div key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/30 p-3 mb-4 text-sm text-emerald-700 dark:text-emerald-400">
                ✓ After paying ₹{amount.toLocaleString()} on Google Pay, enter the <b>Transaction ID</b> (UPI Ref No.) shown in your GPay receipt.
              </div>
              <form onSubmit={confirmPayment} className="space-y-3">
                <input
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary transition"
                  placeholder="e.g. 408212345678"
                  value={txnId}
                  onChange={(e) => setTxnId(e.target.value)}
                />
                {err && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{err}</p>}
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-elegant disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {saving ? "Confirming…" : "Confirm Payment & Get Receipt"}
                </button>
                <button type="button" onClick={() => setStep("pay")}
                  className="w-full text-xs text-muted-foreground hover:text-foreground transition">
                  ← Back
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cancel Payment */}
        <button
          type="button"
          onClick={onCancel}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-destructive/40 bg-destructive/5 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10 transition"
        >
          <X className="h-4 w-4" /> Cancel Payment
        </button>
      </motion.div>
    </section>
  );
}

/* ── Waiting banner (pure realtime, no polling) ─────────── */
function WaitingBanner({
  orderId,
  onAccepted,
  onDenied,
}: {
  orderId: string;
  onAccepted: (o: BulkOrderRow) => void;
  onDenied: () => void;
}) {
  // Use refs so the effect never re-runs due to callback identity changes
  const onAcceptedRef = useRef(onAccepted);
  const onDeniedRef = useRef(onDenied);
  useEffect(() => { onAcceptedRef.current = onAccepted; }, [onAccepted]);
  useEffect(() => { onDeniedRef.current = onDenied; }, [onDenied]);

  useEffect(() => {
    let cancelled = false;

    // One-time check in case admin acted before we subscribed
    (async () => {
      const { data } = await (supabase.from("bulk_orders") as any)
        .select("*").eq("id", orderId).single();
      if (cancelled) return;
      if (!data) { onDeniedRef.current(); return; } // row deleted = denied
      if (data.status === "Accepted" && data.payment_status !== "paid") onAcceptedRef.current(data as BulkOrderRow);
      else if (data.status === "Denied" || data.status === "Cancelled") onDeniedRef.current();
    })();

    // No filter — filter-based realtime requires Supabase Pro; filter in callback instead
    const channel = supabase
      .channel(`bulk-wait-${orderId}-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bulk_orders" },
        ({ new: row }) => {
          const r = row as BulkOrderRow;
          if (r.id !== orderId) return;
          if (r.status === "Accepted" && r.payment_status !== "paid") onAcceptedRef.current(r);
          else if (r.status === "Denied" || r.status === "Cancelled") onDeniedRef.current();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  return (
    <div className="grid place-items-center py-16 text-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-sm"
      >
        <span className="inline-grid h-20 w-20 place-items-center rounded-full gradient-primary text-primary-foreground shadow-glow mb-4">
          <Clock className="h-10 w-10" />
        </span>
        <h2 className="font-[Fraunces] text-3xl font-bold">Request Submitted!</h2>
        <p className="mt-2 text-muted-foreground">
          Our team is reviewing your request. You'll be redirected to the payment page once it's accepted.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-primary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Waiting for admin confirmation…
        </div>
      </motion.div>
    </div>
  );
}

const STORAGE_KEY = "sam_bulk_order";

function saveProgress(id: string, stage: Stage) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ id, stage }));
}
function clearProgress() {
  localStorage.removeItem(STORAGE_KEY);
}
function loadProgress(): { id: string; stage: Stage } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/* ── Main Page ────────────────────────────────────────────── */
function BulkOrderPage() {
  const [stage, setStage] = useState<Stage>("form");
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [menuTypes, setMenuTypes] = useState<MenuType[]>([]);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [acceptedOrder, setAcceptedOrder] = useState<BulkOrderRow | null>(null);
  const [paidOrder, setPaidOrder] = useState<BulkOrderRow | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showMenuViewer, setShowMenuViewer] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [f, setF] = useState({
    name: "", phone: "", event: "Wedding", people: "50", date: "", location: "",
    menu: "",
  });

  // On mount: restore progress from localStorage, re-fetch live order from DB
  useEffect(() => {
    const saved = loadProgress();
    if (!saved) { setRestoring(false); return; }

    (async () => {
      const { data } = await (supabase.from("bulk_orders") as any)
        .select("*").eq("id", saved.id).single();

      if (!data) { clearProgress(); setRestoring(false); return; }

      const order = data as BulkOrderRow;

      // Map DB status → correct stage
      if (order.status === "Pending") {
        setSubmittedId(order.id);
        setStage("submitted");
      } else if (order.status === "Accepted" && order.payment_status !== "paid") {
        setAcceptedOrder(order);
        setStage("payment");
      } else if (order.payment_status === "paid" || order.status === "Confirmed") {
        setPaidOrder(order);
        setStage("receipt");
      } else if (order.status === "Denied" || order.status === "Cancelled") {
        clearProgress();
        setStage("denied");
      } else {
        clearProgress();
        setStage("form");
      }
      setRestoring(false);
    })();
  }, []);

  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  const toggleMenuType = (t: MenuType) =>
    setMenuTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const fetchGPS = () => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lng } }) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
          const json = await res.json();
          set("location")(json.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        } catch { } finally { setGpsLoading(false); }
      },
      () => setGpsLoading(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (f.name.trim().length < 2) return setErr("Please enter your full name.");
    if (!/^\+?[0-9\s-]{8,15}$/.test(f.phone)) return setErr("Enter a valid phone number.");
    if (!f.date) return setErr("Please select an event date.");
    if (new Date(f.date) < new Date(new Date().toDateString())) return setErr("Event date cannot be in the past.");
    if (parseInt(f.people, 10) < 10) return setErr("Minimum 10 people required.");
    if (!f.location.trim()) return setErr("Please enter the event location.");

    setLoading(true);
    try {
      const menuRequest = [menuTypes.length ? `Menu type: ${menuTypes.join(", ")}` : "", f.menu].filter(Boolean).join(" | ");
      const { data, error } = await (supabase.from("bulk_orders") as any)
        .insert({
          name: f.name.trim(), phone: f.phone.trim(), event: f.event,
          people: parseInt(f.people, 10), date: f.date, location: f.location.trim(),
          menu_request: menuRequest || null, budget: "-", status: "Pending",
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      const id = (data as any).id;
      setSubmittedId(id);
      setStage("submitted");
      saveProgress(id, "submitted");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  function handleAccepted(order: BulkOrderRow) {
    setAcceptedOrder(order);
    setStage("payment");
    saveProgress(order.id, "payment");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleDenied() {
    clearProgress();
    setSubmittedId(null);
    setStage("denied");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handlePaid(updated: BulkOrderRow) {
    setPaidOrder(updated);
    setStage("receipt");
    saveProgress(updated.id, "receipt");
    setShowReceipt(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Show spinner while restoring
  if (restoring) {
    return (
      <SiteShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      {showMenuViewer && (
        <AnimatePresence>
          <motion.div key="menu-viewer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50">
            <MenuViewerModal onClose={() => setShowMenuViewer(false)} />
          </motion.div>
        </AnimatePresence>
      )}
      {showHistory && (
        <AnimatePresence>
          <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50">
            <HistoryModal onClose={() => setShowHistory(false)} />
          </motion.div>
        </AnimatePresence>
      )}
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-16 md:px-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium backdrop-blur">
            <PartyPopper className="h-3.5 w-3.5 text-primary" /> Catering & Bulk Booking
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="mt-4 max-w-2xl font-[Fraunces] text-3xl font-black md:text-6xl">
                Make your event <span className="text-gradient">unforgettable</span>.
              </h1>
              <p className="mt-3 max-w-xl text-lg text-muted-foreground">
                From intimate gatherings to grand weddings — SAM's catering team builds custom menus, on-site setup, and unforgettable food.
              </p>
            </div>
            <button
              onClick={() => setShowHistory(true)}
              className="mt-4 shrink-0 inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-4 py-2 text-sm font-semibold backdrop-blur hover:bg-accent transition"
            >
              <History className="h-4 w-4 text-primary" /> My Orders
            </button>
          </div>
        </div>
      </section>

      <AnimatePresence mode="wait">
        {/* Denied by owner */}
        {stage === "denied" && (
          <motion.div key="denied" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="grid place-items-center py-16 text-center px-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 18, stiffness: 200 }}
                className="max-w-sm"
              >
                <span className="inline-grid h-20 w-20 place-items-center rounded-full bg-destructive/10 text-destructive mb-4">
                  <X className="h-10 w-10" />
                </span>
                <h2 className="font-[Fraunces] text-3xl font-bold text-destructive">Order Denied</h2>
                <p className="mt-3 text-muted-foreground">
                  Your bulk order request was denied by the owner.
                  <br />
                  <span className="font-semibold text-foreground">Please contact us for more details.</span>
                </p>
                <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-5 py-3 text-sm font-semibold">
                  <Phone className="h-4 w-4 text-primary" />
                  +91 98765 43210
                </div>
                <button
                  onClick={() => { setStage("form"); }}
                  className="mt-6 inline-flex items-center gap-2 rounded-full gradient-primary px-8 py-3 font-bold text-primary-foreground shadow-elegant"
                >
                  Try Again
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* Waiting for admin */}
        {stage === "submitted" && submittedId && (
          <motion.div key="submitted" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <WaitingBanner orderId={submittedId} onAccepted={handleAccepted} onDenied={handleDenied} />
          </motion.div>
        )}

        {/* Payment */}
        {stage === "payment" && acceptedOrder && (
          <motion.div key="payment" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <PaymentPage order={acceptedOrder} onPaid={handlePaid} onCancel={async () => {
              await (supabase.from("bulk_orders") as any)
                .update({ status: "Cancelled" }).eq("id", acceptedOrder.id);
              clearProgress();
              setAcceptedOrder(null);
              setStage("denied");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }} />
          </motion.div>
        )}

        {/* Receipt confirmed screen */}
        {stage === "receipt" && paidOrder && (
          <motion.div key="receipt" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="grid place-items-center py-16 text-center px-4">
              <CheckCircle2 className="h-20 w-20 text-emerald-600" />
              <h2 className="mt-4 font-[Fraunces] text-3xl font-bold">Booking Confirmed!</h2>
              <p className="mt-2 text-muted-foreground max-w-sm">
                Your payment of <b>₹{paidOrder.quoted_amount?.toLocaleString()}</b> has been recorded. Your catering manager will contact you soon.
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setShowReceipt(true)}
                  className="inline-flex items-center gap-2 rounded-full gradient-primary px-6 py-3 font-bold text-primary-foreground shadow-elegant"
                >
                  <Printer className="h-4 w-4" /> View & Print Receipt
                </button>
                <button
                  onClick={() => { clearProgress(); setStage("form"); setPaidOrder(null); }}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 font-semibold hover:bg-accent transition"
                >
                  New Booking
                </button>
              </div>
            </div>
            {showReceipt && <Receipt order={paidOrder} onClose={() => setShowReceipt(false)} />}
          </motion.div>
        )}

        {/* Form */}
        {stage === "form" && (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-16 md:grid-cols-[1fr_360px] md:px-6">
              <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onSubmit={submit}
                className="rounded-3xl border border-border bg-card p-6 shadow-elegant md:p-8">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field icon={<User className="h-4 w-4" />} placeholder="Your name" value={f.name} onChange={set("name")} required />
                  <Field icon={<Phone className="h-4 w-4" />} placeholder="Phone number" value={f.phone} onChange={set("phone")} required />
                  <SelectBox label="Event type" icon={<PartyPopper className="h-4 w-4" />} value={f.event} onChange={set("event")} options={["Wedding", "Birthday", "Corporate", "Festival", "House Party", "Other"]} />
                  <Field icon={<Users className="h-4 w-4" />} type="number" placeholder="Number of people" value={f.people} onChange={set("people")} min={10} required />
                  <Field icon={<CalendarDays className="h-4 w-4" />} type="date" value={f.date} onChange={set("date")} required />
                  <div className="flex flex-col gap-1.5">
                    <button type="button" onClick={fetchGPS} disabled={gpsLoading}
                      className="flex items-center gap-2 self-start rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition disabled:opacity-60">
                      <Navigation className="h-3.5 w-3.5" />
                      {gpsLoading ? "Fetching…" : "Use my current location"}
                    </button>
                    <Field icon={<MapPin className="h-4 w-4" />} placeholder="Event location" value={f.location} onChange={set("location")} required />
                  </div>
                  <div className="sm:col-span-2">
                    <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <UtensilsCrossed className="h-3.5 w-3.5 text-primary" /> Menu Type
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {MENU_TYPES.map(t => (
                        <button key={t} type="button" onClick={() => toggleMenuType(t)}
                          className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${menuTypes.includes(t) ? "gradient-primary border-transparent text-primary-foreground shadow-elegant" : "border-border bg-background hover:bg-accent"}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* View Menu Banner */}
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={() => setShowMenuViewer(true)}
                      className="w-full flex items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-primary/5 px-5 py-4 text-left hover:bg-primary/10 transition group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl gradient-primary text-primary-foreground">
                          <UtensilsCrossed className="h-5 w-5" />
                        </span>
                        <div>
                          <div className="font-semibold text-sm">View our menu</div>
                          <div className="text-xs text-muted-foreground">Browse all available dishes with prices</div>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-primary shrink-0 transition group-hover:translate-x-0.5" />
                    </button>
                  </div>

                  <label className="sm:col-span-2">
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Special menu request</span>
                    <textarea value={f.menu} onChange={(e) => set("menu")(e.target.value)} rows={4}
                      placeholder="e.g. Mostly veg, Jain options, paneer biryani must-have…"
                      className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:shadow-glow" />
                  </label>
                  {err && <p className="sm:col-span-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
                  <button disabled={loading}
                    className="flex items-center justify-center gap-2 rounded-full gradient-primary py-3 font-semibold text-primary-foreground shadow-elegant transition hover:scale-[1.02] disabled:opacity-60 sm:col-span-2">
                    {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : "Submit booking request"}
                  </button>
                </div>
              </motion.form>

              <aside className="space-y-4">
                {[
                  { t: "Custom menus", d: "Crafted by our chef for your guest count and palate." },
                  { t: "Live counters", d: "Biryani, dosa, chaat, grills — set up at your venue." },
                  { t: "End-to-end service", d: "Stewards, plating, packing, and clean-up included." },
                ].map((x) => (
                  <div key={x.t} className="rounded-2xl border border-border bg-card p-5">
                    <div className="font-[Fraunces] text-lg font-bold">{x.t}</div>
                    <p className="mt-1 text-sm text-muted-foreground">{x.d}</p>
                  </div>
                ))}
                <div className="rounded-2xl gradient-primary p-5 text-primary-foreground shadow-elegant">
                  <div className="text-xs uppercase tracking-wider opacity-80">Need it faster?</div>
                  <div className="font-[Fraunces] text-2xl font-bold">Call +91 98765 43210</div>
                  <p className="mt-1 text-sm opacity-90">Our event desk answers 24/7.</p>
                </div>
              </aside>
            </section>
          </motion.div>
        )}
      </AnimatePresence>
    </SiteShell>
  );
}

function SelectBox({ label, icon, value, onChange, options, className = "" }: {
  label: string; icon?: React.ReactNode; value: string;
  onChange: (v: string) => void; options: string[]; className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 focus-within:border-primary">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <select value={value} onChange={(e) => onChange(e.target.value)}
          className="w-full bg-background text-foreground text-sm outline-none cursor-pointer">
          {options.map((o) => <option key={o} value={o} className="bg-card text-foreground">{o}</option>)}
        </select>
      </div>
    </label>
  );
}
