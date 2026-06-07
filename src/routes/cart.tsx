import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Minus, Plus, Tag, Trash2, ShoppingBag, Leaf, Loader2, Banknote, Smartphone, User, LogIn } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SiteShell } from "@/components/site/SiteShell";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { placeOrder } from "@/lib/orders-store";

export const Route = createFileRoute("/cart")({
  component: CartPage,
  head: () => ({ meta: [{ title: "Your Cart — SAM Foods" }] }),
});

declare global {
  interface Window { Razorpay: new (opts: object) => { open(): void }; }
}

// Valid coupons — easy to extend
const COUPONS: Record<string, number> = {
  SAM50: 50,
  SAM100: 100,
  WELCOME: 30,
};

function loadRazorpay(): Promise<boolean> {
  return new Promise(resolve => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function CartPage() {
  const { items, setQty, remove, subtotal, delivery, gst, total, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [discount, setDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);

  const [guestName, setGuestName] = useState("");
  const [room, setRoom] = useState("");
  const [whenMode, setWhenMode] = useState<"asap" | "schedule">("asap");
  const [time, setTime] = useState("");
  const [payMethod, setPayMethod] = useState<"cod" | "gpay">("cod");
  const [orderErr, setOrderErr] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);

  const applyCoupon = () => {
    const code = coupon.trim().toUpperCase();
    if (COUPONS[code]) {
      setDiscount(COUPONS[code]);
      setAppliedCoupon(code);
      setCouponMsg(`✓ "${code}" applied — ₹${COUPONS[code]} off!`);
    } else {
      setDiscount(0);
      setAppliedCoupon(null);
      setCouponMsg("Invalid coupon code.");
    }
  };

  const removeCoupon = () => {
    setDiscount(0);
    setAppliedCoupon(null);
    setCoupon("");
    setCouponMsg(null);
  };

  const finalTotal = Math.max(0, total - discount);

  const customerName = user?.name || guestName.trim() || "Guest";
  const customerEmail = user?.email ?? null;

  const checkout = async () => {
    setOrderErr(null);
    if (!user && !guestName.trim()) return setOrderErr("Please enter your name.");
    if (!room.trim()) return setOrderErr("Please enter your room number.");
    if (whenMode === "schedule" && !time) return setOrderErr("Pick a delivery time.");
    setPlacing(true);

    try {
      if (payMethod === "gpay") {
        const ok = await loadRazorpay();
        if (!ok) { setOrderErr("Failed to load payment gateway. Try again."); setPlacing(false); return; }

        await new Promise<void>((resolve, reject) => {
          const rzp = new window.Razorpay({
            key: import.meta.env.VITE_RAZORPAY_KEY_ID,
            amount: finalTotal * 100,
            currency: "INR",
            name: "SAM Foods",
            description: "Food order payment",
            method: { upi: true, card: false, netbanking: false, wallet: false },
            config: {
              display: {
                blocks: { upi: { name: "Pay via GPay / UPI", instruments: [{ method: "upi" }] } },
                sequence: ["block.upi"],
                preferences: { show_default_blocks: false },
              },
            },
            prefill: { name: customerName, email: customerEmail ?? "", contact: "" },
            theme: { color: "#c2440f" },
            handler: async (response: { razorpay_payment_id: string; razorpay_order_id?: string }) => {
              try {
                const order = await placeOrder({
                  user_id: user?.id ?? null,
                  customer: customerName,
                  email: customerEmail,
                  room: room.trim(),
                  deliveryTime: whenMode === "asap" ? "ASAP" : time,
                  items, subtotal, delivery_fee: delivery, gst,
                  total: finalTotal, discount,
                  payment_method: "gpay",
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id ?? null,
                });
                clear();
                navigate({ to: "/track", search: { orderId: order.id } });
                resolve();
              } catch (e) { reject(e); }
            },
            modal: { ondismiss: () => reject(new Error("Payment cancelled.")) },
          });
          rzp.open();
        });
      } else {
        const order = await placeOrder({
          user_id: user?.id ?? null,
          customer: customerName,
          email: customerEmail,
          room: room.trim(),
          deliveryTime: whenMode === "asap" ? "ASAP" : time,
          items, subtotal, delivery_fee: delivery, gst,
          total: finalTotal, discount,
          payment_method: "cod",
        });
        clear();
        navigate({ to: "/track", search: { orderId: order.id } });
      }
    } catch (e) {
      setOrderErr(e instanceof Error ? e.message : "Failed to place order. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <SiteShell>
      <section className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <h1 className="font-[Fraunces] text-3xl font-black md:text-5xl">Your cart</h1>
        <p className="mt-1 text-muted-foreground">Review your dishes before we fire the kitchen.</p>

        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          <span className="grid h-4 w-4 place-items-center rounded-sm border-2 border-emerald-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /></span>
          <Leaf className="h-3.5 w-3.5" /> 100% Pure Veg checkout
        </div>

        {items.length === 0 ? (
          <div className="mt-12 grid place-items-center rounded-3xl border border-dashed border-border bg-card p-16 text-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-lg font-semibold">Your cart is empty.</p>
            <p className="text-muted-foreground">Hungry? Add a few dishes to get started.</p>
            <Link to="/" className="mt-6 inline-flex rounded-full gradient-primary px-6 py-3 font-semibold text-primary-foreground shadow-elegant">Browse menu</Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">

            {/* ── Cart items ── */}
            <div className="space-y-3">
              <AnimatePresence>
                {items.map((it) => (
                  <motion.div key={it.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                    className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3">
                    <img
                      src={it.image}
                      alt={it.name}
                      className="h-14 w-14 shrink-0 rounded-xl object-cover md:h-20 md:w-20"
                      onError={e => { (e.target as HTMLImageElement).src = "https://placehold.co/80x80?text=IMG"; }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold md:text-base">{it.name}</div>
                      <div className="text-xs text-muted-foreground">₹{it.price} each</div>
                    </div>
                    <div className="flex items-center gap-1 rounded-full border border-border bg-background p-1">
                      <button onClick={() => setQty(it.id, it.qty - 1)} className="grid h-6 w-6 place-items-center rounded-full hover:bg-accent md:h-7 md:w-7"><Minus className="h-3 w-3" /></button>
                      <span className="w-5 text-center text-xs font-bold md:w-6 md:text-sm">{it.qty}</span>
                      <button onClick={() => setQty(it.id, it.qty + 1)} className="grid h-6 w-6 place-items-center rounded-full gradient-primary text-primary-foreground md:h-7 md:w-7"><Plus className="h-3 w-3" /></button>
                    </div>
                    <div className="w-14 shrink-0 text-right text-sm font-bold md:w-20">₹{it.price * it.qty}</div>
                    <button onClick={() => remove(it.id)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></button>
                  </motion.div>
                ))}
              </AnimatePresence>
              <button onClick={clear} className="text-sm text-muted-foreground hover:text-destructive transition">Clear cart</button>
            </div>

            {/* ── Order summary sidebar ── */}
            <aside className="h-fit rounded-3xl border border-border bg-card p-5 shadow-elegant space-y-4">

              {/* Guest name — only when not logged in */}
              {!user && (
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your name</label>
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5">
                    <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <input
                      value={guestName}
                      onChange={e => setGuestName(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full bg-transparent text-sm outline-none"
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    <Link to="/login" className="font-semibold text-primary underline">Sign in</Link> to save your order history.
                  </p>
                </div>
              )}

              {/* Logged-in user greeting */}
              {user && (
                <div className="flex items-center gap-2 rounded-xl bg-accent px-3 py-2">
                  <span className="grid h-7 w-7 place-items-center rounded-full gradient-primary text-xs font-bold text-primary-foreground">
                    {user.name[0]?.toUpperCase()}
                  </span>
                  <div>
                    <div className="text-xs font-semibold">{user.name}</div>
                    <div className="text-[10px] text-muted-foreground">{user.email}</div>
                  </div>
                </div>
              )}

              {/* Coupon */}
              {!appliedCoupon ? (
                <div>
                  <div className="flex items-center gap-2 rounded-2xl border border-dashed border-border p-2">
                    <Tag className="ml-2 h-4 w-4 shrink-0 text-primary" />
                    <input
                      value={coupon}
                      onChange={e => setCoupon(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && applyCoupon()}
                      placeholder="Enter coupon code"
                      className="w-full bg-transparent px-1 text-sm outline-none uppercase"
                    />
                    <button onClick={applyCoupon} className="shrink-0 rounded-full gradient-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">Apply</button>
                  </div>
                  {couponMsg && <p className="mt-1.5 text-xs text-destructive">{couponMsg}</p>}
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5">
                  <div>
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{couponMsg}</span>
                  </div>
                  <button onClick={removeCoupon} className="text-xs text-muted-foreground underline hover:text-destructive">Remove</button>
                </div>
              )}

              {/* Price breakdown */}
              <div>
                <Row k="Subtotal" v={`₹${subtotal}`} />
                <Row k={`Delivery${subtotal > 499 ? " (free above ₹499)" : ""}`} v={delivery === 0 ? "FREE" : `₹${delivery}`} />
                <Row k="GST (5%)" v={`₹${gst}`} />
                {discount > 0 && <Row k={`Coupon (${appliedCoupon})`} v={`- ₹${discount}`} accent />}
                <hr className="my-3 border-border" />
                <div className="flex items-center justify-between text-lg font-bold">
                  <span>Total</span><span>₹{finalTotal}</span>
                </div>
              </div>

              {/* Payment method */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payment method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setPayMethod("cod")}
                    className={`flex items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-semibold transition ${payMethod === "cod" ? "gradient-primary border-transparent text-primary-foreground shadow-elegant" : "border-border bg-background hover:bg-accent"}`}>
                    <Banknote className="h-4 w-4" /> Cash
                  </button>
                  <button type="button" onClick={() => setPayMethod("gpay")}
                    className={`flex items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-semibold transition ${payMethod === "gpay" ? "gradient-primary border-transparent text-primary-foreground shadow-elegant" : "border-border bg-background hover:bg-accent"}`}>
                    <Smartphone className="h-4 w-4" /> GPay / UPI
                  </button>
                </div>
              </div>

              {/* Room number */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Room number</label>
                <input
                  value={room}
                  onChange={e => setRoom(e.target.value)}
                  placeholder="e.g. 305"
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                />
              </div>

              {/* Delivery time */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Delivery time</label>
                <div className="grid grid-cols-2 gap-1 rounded-full border border-border bg-background p-1 text-xs font-semibold">
                  <button type="button" onClick={() => setWhenMode("asap")}
                    className={`rounded-full py-1.5 transition ${whenMode === "asap" ? "gradient-primary text-primary-foreground" : "text-muted-foreground"}`}>ASAP</button>
                  <button type="button" onClick={() => setWhenMode("schedule")}
                    className={`rounded-full py-1.5 transition ${whenMode === "schedule" ? "gradient-primary text-primary-foreground" : "text-muted-foreground"}`}>Schedule</button>
                </div>
                {whenMode === "schedule" && (
                  <input type="time" value={time} onChange={e => setTime(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary" />
                )}
              </div>

              {orderErr && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{orderErr}</p>}

              <button
                onClick={checkout}
                disabled={placing}
                className="flex w-full items-center justify-center gap-2 rounded-full gradient-primary py-3 font-semibold text-primary-foreground shadow-elegant transition hover:scale-[1.02] disabled:opacity-60"
              >
                {placing
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> {payMethod === "gpay" ? "Opening payment…" : "Placing order…"}</>
                  : <><LogIn className="h-4 w-4" /> {payMethod === "gpay" ? "Pay with GPay / UPI" : `Place order · ₹${finalTotal}`}</>
                }
              </button>
              <p className="text-center text-[11px] text-muted-foreground">Secure · UPI / Cash on delivery</p>
            </aside>
          </div>
        )}
      </section>
    </SiteShell>
  );
}

function Row({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1 text-sm ${accent ? "text-emerald-600" : "text-muted-foreground"}`}>
      <span>{k}</span>
      <span className="font-semibold text-foreground">{v}</span>
    </div>
  );
}
