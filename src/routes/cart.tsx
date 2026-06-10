import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Minus, Plus, Tag, Trash2, ShoppingBag, Leaf, Loader2, Banknote, Smartphone, User, LogIn, MapPin, Navigation, Clock, X } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SiteShell } from "@/components/site/SiteShell";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "@/lib/location-context";
import { submitOrderRequest } from "@/lib/orders-store";
import { supabase } from "@/integrations/supabase/client";

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
  const { saved, active, gpsLoading, fetchGPS } = useLocation();
  const navigate = useNavigate();

  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [discount, setDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);

  const [guestName, setGuestName] = useState("");
  const [selectedAddress, setSelectedAddress] = useState(active?.address ?? "");
  const [manualLocation, setManualLocation] = useState("");
  const [payMethod, setPayMethod] = useState<"cod" | "gpay">("cod");
  const [orderErr, setOrderErr] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [requestStatus, setRequestStatus] = useState<"waiting" | "denied" | null>(null);

  const [gpsAddress, setGpsAddress] = useState("");
  const [showManual, setShowManual] = useState(false);

  // pick the active (default) address once on mount
  useEffect(() => {
    if (active && !selectedAddress) setSelectedAddress(active.address);
    const cur = saved.find(a => a.label === "Current Location");
    if (cur) {
      setGpsAddress(cur.address);
      if (selectedAddress === gpsAddress || !selectedAddress) setSelectedAddress(cur.address);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);

  // Listen for admin accept/deny on the request
  useEffect(() => {
    if (!requestId) return;
    const channel = supabase
      .channel(`request-${requestId}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "order_requests", filter: `id=eq.${requestId}` },
        (payload) => {
          const s = (payload.new as any).status;
          if (s === "accepted") {
            const orderId = (payload.new as any).order_id;
            clear();
            supabase.removeChannel(channel);
            navigate({ to: "/track", search: { orderId } });
          } else if (s === "denied") {
            setRequestStatus("denied");
            supabase.removeChannel(channel);
          }
        }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [requestId, clear, navigate]);

  const deliveryLocation = selectedAddress;

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
    if (!deliveryLocation) return setOrderErr("Please enter your delivery location.");
    setPlacing(true);

    const orderPayload = {
      user_id: user?.id ?? null,
      customer: customerName,
      email: customerEmail,
      room: deliveryLocation,
      deliveryTime: "ASAP",
      items, subtotal, delivery_fee: delivery, gst,
      total: finalTotal, discount,
      payment_method: payMethod as "cod" | "gpay",
    };

    try {
      if (payMethod === "gpay") {
        const ok = await loadRazorpay();
        if (!ok) { setOrderErr("Failed to load payment gateway."); setPlacing(false); return; }
        await new Promise<void>((resolve, reject) => {
          const rzp = new window.Razorpay({
            key: import.meta.env.VITE_RAZORPAY_KEY_ID,
            amount: finalTotal * 100,
            currency: "INR",
            name: "SAM Foods",
            description: "Food order payment",
            method: { upi: true, card: false, netbanking: false, wallet: false },
            config: { display: { blocks: { upi: { name: "Pay via GPay / UPI", instruments: [{ method: "upi" }] } }, sequence: ["block.upi"], preferences: { show_default_blocks: false } } },
            prefill: { name: customerName, email: customerEmail ?? "", contact: "" },
            theme: { color: "#c2440f" },
            handler: async (response: { razorpay_payment_id: string; razorpay_order_id?: string }) => {
              try {
                const req = await submitOrderRequest({
                  ...orderPayload,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id ?? null,
                });
                setRequestId(req.id);
                setRequestStatus("waiting");
                resolve();
              } catch (e) { reject(e); }
            },
            modal: { ondismiss: () => reject(new Error("Payment cancelled.")) },
          });
          rzp.open();
        });
      } else {
        const req = await submitOrderRequest(orderPayload);
        setRequestId(req.id);
        setRequestStatus("waiting");
      }
    } catch (e) {
      setOrderErr(e instanceof Error ? e.message : "Failed to place order.");
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

              {/* Delivery Location */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Delivery location</label>

                <div className="space-y-1.5">
                  {/* Once GPS address is fetched and selected, show only the address */}
                  {gpsAddress && selectedAddress === gpsAddress ? (
                    <div className="flex items-start gap-2 rounded-xl border border-primary bg-primary/5 px-3 py-2.5">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <p className="flex-1 text-xs font-semibold text-primary break-words">{gpsAddress}</p>
                      <button type="button" onClick={() => { setGpsAddress(""); setSelectedAddress(""); }} className="shrink-0">
                        <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  ) : (
                    <button type="button"
                      disabled={gpsLoading}
                      onClick={async () => {
                        await fetchGPS();
                        const cur = saved.find(a => a.label === "Current Location");
                        const addr = cur?.address ?? "";
                        setGpsAddress(addr);
                        setSelectedAddress(addr);
                        setShowManual(false);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2.5 text-xs font-semibold text-primary hover:bg-accent transition disabled:opacity-60">
                      <Navigation className="h-3.5 w-3.5 shrink-0" />
                      <span className="flex-1 text-left">
                        {gpsLoading ? "Fetching location…" : "Use my current location"}
                      </span>
                    </button>
                  )}

                  {/* Saved addresses toggle */}
                  <button type="button"
                    onClick={() => {
                      const next = !showManual;
                      setShowManual(next);
                      if (next) { setSelectedAddress(""); setManualLocation(""); }
                    }}
                    className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                      showManual
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border bg-background text-muted-foreground hover:bg-accent"
                    }`}>
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1 text-left">Saved addresses</span>
                    {showManual && <X className="h-3.5 w-3.5 shrink-0" />}
                  </button>

                  {/* Saved addresses list — expands when toggled */}
                  <AnimatePresence>
                    {showManual && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden space-y-1.5 pl-1"
                      >
                        {saved.filter(a => a.label !== "Current Location").length === 0 ? (
                          <p className="px-3 py-2 text-xs text-muted-foreground">No saved addresses found.</p>
                        ) : (
                          saved.filter(a => a.label !== "Current Location").map((a) => (
                            <button key={a.id} type="button"
                              onClick={() => { setSelectedAddress(a.address); setManualLocation(""); }}
                              className={`flex w-full items-start gap-2 rounded-xl border px-3 py-2.5 text-left transition ${
                                selectedAddress === a.address
                                  ? "border-primary bg-primary/5"
                                  : "border-border bg-background hover:bg-accent"
                              }`}>
                              <MapPin className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${selectedAddress === a.address ? "text-primary" : "text-muted-foreground"}`} />
                              <div className="min-w-0">
                                <div className="text-xs font-semibold">{a.label}</div>
                                <div className="truncate text-xs text-muted-foreground">{a.address}</div>
                              </div>
                            </button>
                          ))
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
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

      {/* ── Waiting for admin modal ── */}
      <AnimatePresence>
        {requestStatus === "waiting" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 text-center shadow-elegant">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-amber-500/10">
                <Clock className="h-8 w-8 text-amber-500 animate-pulse" />
              </div>
              <h3 className="font-[Fraunces] text-2xl font-black">Waiting for kitchen</h3>
              <p className="mt-2 text-sm text-muted-foreground">Your order request has been sent to SAM kitchen. Hang tight — the chef will confirm shortly!</p>
              <div className="mt-4 flex items-center justify-center gap-1.5">
                {[0,1,2].map(i => (
                  <motion.span key={i} className="h-2 w-2 rounded-full bg-amber-500"
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }} />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Denied modal ── */}
      <AnimatePresence>
        {requestStatus === "denied" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm rounded-3xl border border-destructive/30 bg-card p-8 text-center shadow-elegant">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-destructive/10">
                <X className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="font-[Fraunces] text-2xl font-black">Food sold out 😔</h3>
              <p className="mt-2 text-sm text-muted-foreground">Sorry, the kitchen is unable to fulfil your order right now. Please come back tomorrow for fresh dishes!</p>
              <button onClick={() => { setRequestStatus(null); setRequestId(null); }}
                className="mt-6 w-full rounded-full gradient-primary py-3 font-semibold text-primary-foreground">
                Back to cart
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
