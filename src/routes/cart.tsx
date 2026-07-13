import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Minus, Plus, Trash2, ShoppingBag, Leaf, Loader2, Banknote, Smartphone, LogIn, MapPin, Navigation, Clock, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SiteShell } from "@/components/site/SiteShell";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { useLocation, isWithinDeliveryRadius, type FetchGPSResult } from "@/lib/location-context";
import { submitOrderRequest } from "@/lib/orders-store";
import { refetchMenu } from "@/lib/menu-hook";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/lib/lang-context";
import { GPayQRModal } from "@/components/site/GPayQRModal";
import { createPaymentRecord } from "@/lib/payment-store";

export const Route = createFileRoute("/cart")({
  component: CartPage,
  head: () => ({ meta: [{ title: "Your Cart — SAM Foods" }] }),
});

declare global {
  interface Window { Razorpay: new (opts: object) => { open(): void }; }
}

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
  const { items, setQty, remove, subtotal, delivery, total, clear } = useCart();
  const { user } = useAuth();
  const { saved, active, gpsLoading, fetchGPS, saveAddress } = useLocation();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Validate Razorpay key on mount
  const razorpayKeyMissing = !import.meta.env.VITE_RAZORPAY_KEY_ID;

  const [selectedAddress, setSelectedAddress] = useState(active?.address ?? "");
  const [manualLocation, setManualLocation] = useState("");
  const [payMethod, setPayMethod] = useState<"cod" | "gpay">("cod");
  const [orderErr, setOrderErr] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [requestStatus, setRequestStatus] = useState<"waiting" | "denied" | null>(null);
  const [locationError, setLocationError] = useState<"out_of_range" | "unverified" | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [qrOrderReqId, setQrOrderReqId] = useState<string | null>(null);
  const [gpayAcceptedOrderId, setGpayAcceptedOrderId] = useState<string | null>(null);

  // Use a ref to hold the active poll/channel cleanup so it survives re-renders
  // without being listed as a useEffect dependency
  const cleanupRef = useRef<(() => void) | null>(null);
  const navigateRef = useRef(navigate);
  const clearRef = useRef(clear);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);
  useEffect(() => { clearRef.current = clear; }, [clear]);

  // Cancel any in-flight order watch — safe to call multiple times
  const cancelWatch = () => {
    if (cleanupRef.current) { cleanupRef.current(); cleanupRef.current = null; }
  };

  // Hard-reset everything: cancel watch, clear all order state
  const resetOrderState = () => {
    cancelWatch();
    setPlacing(false);
    setRequestStatus(null);
    setOrderErr(null);
  };

  // Reset when cart becomes empty (order completed or cleared)
  useEffect(() => {
    if (items.length === 0) resetOrderState();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  // Start watching a request ID for accept/deny — self-contained, no deps on state
  const watchRequest = (reqId: string, isGpay = false) => {
    cancelWatch();

    let done = false;

    const finish = (status: "accepted" | "denied", orderId?: string) => {
      if (done) return;
      done = true;
      cancelWatch();
      if (status === "accepted" && orderId) {
        setPlacing(false);
        setRequestStatus(null);
        if (isGpay) {
          // GPay: show QR code now that kitchen accepted
          setQrOrderReqId(reqId);
          setGpayAcceptedOrderId(orderId);
          setShowQR(true);
        } else {
          // COD: navigate to track
          clearRef.current();
          refetchMenu();
          navigateRef.current({ to: "/track", search: { orderId } });
        }
      } else {
        setPlacing(false);
        setRequestStatus("denied");
      }
    };

    const channel = supabase
      .channel(`req-watch-${reqId}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "order_requests", filter: `id=eq.${reqId}` },
        (payload) => {
          const s = (payload.new as any).status;
          if (s === "accepted") finish("accepted", (payload.new as any).order_id);
          else if (s === "denied") finish("denied");
        }
      ).subscribe();

    const poll = setInterval(async () => {
      if (done) { clearInterval(poll); return; }
      try {
        const { data } = await (supabase.from("order_requests") as any)
          .select("status,order_id").eq("id", reqId).single();
        if (!data || done) return;
        if (data.status === "accepted") finish("accepted", data.order_id);
        else if (data.status === "denied") finish("denied");
      } catch {}
    }, 3000);

    cleanupRef.current = () => {
      done = true;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  };

  // Cleanup on unmount
  useEffect(() => () => { cancelWatch(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [gpsAddress, setGpsAddress] = useState("");
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsErr, setGpsErr] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [showGpsPrompt, setShowGpsPrompt] = useState(false); // nudge when manual entered

  // Pick the active (default) address once on mount
  useEffect(() => {
    if (active && !selectedAddress) setSelectedAddress(active.address);
    const cur = saved.find(a => a.label === "Current Location");
    if (cur) {
      setGpsAddress(cur.address);
      if (selectedAddress === gpsAddress || !selectedAddress) setSelectedAddress(cur.address);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);

  const handleGPSResult = (result: FetchGPSResult, opts?: { setAddress?: boolean }) => {
    if (result === "denied") {
      setGpsErr("Location access is blocked. Go to your browser/phone Settings → Site permissions → Location and allow this site, then try again.");
    } else if (result) {
      setGpsCoords({ lat: result.lat, lng: result.lng });
      if (opts?.setAddress || !gpsAddress) {
        setGpsAddress(result.address);
        if (!selectedAddress) setSelectedAddress(result.address);
      }
      setShowGpsPrompt(false);
      setGpsErr(null);
    } else {
      setGpsErr("Could not get location. Make sure GPS / Location is turned ON in your phone settings, then try again.");
    }
  };

  const triggerGPS = async () => {
    setGpsErr(null);
    const result = await fetchGPS();
    handleGPSResult(result);
  };


  const deliveryLocation = selectedAddress;

  const finalTotal = total;

  const checkout = async (overrideCoords?: { lat: number; lng: number }, overrideAddress?: string) => {
    if (!user) { setShowAuthPrompt(true); return; }
    const deliveryAddr = overrideAddress ?? deliveryLocation;
    if (!deliveryAddr) { setOrderErr("Please enter your delivery location."); return; }

    // Validate delivery radius
    // Resolve coords: GPS session > saved address coords
    let coords = overrideCoords ?? gpsCoords;
    if (!coords) {
      const addrEntry = saved.find((a) => a.address.trim() === deliveryAddr.trim());
      if (addrEntry?.lat != null && addrEntry?.lng != null) coords = { lat: addrEntry.lat, lng: addrEntry.lng };
    }

    if (!coords) { setLocationError("unverified"); return; }
    if (!isWithinDeliveryRadius(coords.lat, coords.lng)) { setLocationError("out_of_range"); return; }

    // Cancel any previous watch and start fresh
    resetOrderState();
    setPlacing(true);

    const orderPayload = {
      user_id: user.id,
      customer: user.name,
      email: user.email ?? null,
      room: deliveryAddr,
      delivery_lat: gpsCoords?.lat ?? null,
      delivery_lng: gpsCoords?.lng ?? null,
      deliveryTime: new Date().toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: true }),
      items, subtotal, delivery_fee: delivery,
      total: finalTotal, discount: 0,
      payment_method: payMethod as "cod" | "gpay",
    };

    try {
      if (payMethod === "gpay") {
        // Step 1: Submit order request to admin first
        const req = await submitOrderRequest(orderPayload);
        refetchMenu();

        // Step 2: Create pending payment record
        await createPaymentRecord({
          order_request_id: req.id,
          user_id: user.id,
          customer_name: user.name,
          customer_email: user.email ?? undefined,
          customer_phone: user.phone ?? undefined,
          amount: finalTotal,
          payment_method: "gpay",
          payment_status: "pending",
          notes: `GPay order request sent to kitchen at ${new Date().toLocaleString("en-IN")}`,
        });

        // Step 3: Show "waiting for kitchen" modal — QR shown only after admin accepts
        setRequestStatus("waiting");
        watchRequest(req.id, true); // true = gpay flow
      } else {
        const req = await submitOrderRequest(orderPayload);
        refetchMenu();
        
        // Create COD payment record
        await createPaymentRecord({
          order_request_id: req.id,
          user_id: user.id,
          customer_name: user.name,
          customer_email: user.email ?? undefined,
          customer_phone: user.phone ?? undefined,
          amount: finalTotal,
          payment_method: "cod",
          payment_status: "pending",
          notes: `Cash on delivery order placed at ${new Date().toLocaleString("en-IN")}`,
        });
        
        setRequestStatus("waiting");
        watchRequest(req.id, false);
      }
    } catch (e) {
      setPlacing(false);
      setOrderErr(e instanceof Error ? e.message : "Failed to place order.");
    }
  };

  return (
    <SiteShell>
      <section className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <h1 className="font-[Fraunces] text-3xl font-black md:text-5xl">{t("Your cart")}</h1>
        <p className="mt-1 text-muted-foreground">{t("Review your dishes before we fire the kitchen.")}</p>

        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          <span className="grid h-4 w-4 place-items-center rounded-sm border-2 border-emerald-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /></span>
          <Leaf className="h-3.5 w-3.5" /> {t("100% Pure Veg checkout")}
        </div>

        {items.length === 0 ? (
          <div className="mt-12 grid place-items-center rounded-3xl border border-dashed border-border bg-card p-16 text-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-lg font-semibold">{t("Your cart is empty.")}</p>
            <p className="text-muted-foreground">{t("Hungry? Add a few dishes to get started.")}</p>
            <Link to="/" className="mt-6 inline-flex rounded-full gradient-primary px-6 py-3 font-semibold text-primary-foreground shadow-elegant">{t("Browse menu")}</Link>
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
              <button onClick={clear} className="text-sm text-muted-foreground hover:text-destructive transition">{t("Clear cart")}</button>
            </div>

            {/* ── Order summary sidebar ── */}
            <aside className="h-fit rounded-3xl border border-border bg-card p-5 shadow-elegant space-y-4">

              {/* Guest — prompt to sign in */}
              {!user && (
                <button
                  type="button"
                  onClick={() => setShowAuthPrompt(true)}
                  className="flex w-full items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5 text-left transition hover:bg-primary/10"
                >
                  <LogIn className="h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <div className="text-xs font-semibold text-primary">{t("Sign in to place your order")}</div>
                    <div className="text-[10px] text-muted-foreground">{t("Quick sign up — takes 30 seconds")}</div>
                  </div>
                </button>
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



              {/* Price breakdown */}
              <div>
                <Row k={t("Subtotal")} v={`₹${subtotal}`} />
                <Row k={`${t("Delivery")}${subtotal > 499 ? ` (${t("free above ₹499")})` : ""}`} v={delivery === 0 ? t("FREE") : `₹${delivery}`} />

                <hr className="my-3 border-border" />
                <div className="flex items-center justify-between text-lg font-bold">
                  <span>{t("Total")}</span><span>₹{finalTotal}</span>
                </div>
              </div>

              {/* Payment method */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("Payment method")}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setPayMethod("cod")}
                    className={`flex items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-semibold transition ${payMethod === "cod" ? "gradient-primary border-transparent text-primary-foreground shadow-elegant" : "border-border bg-background hover:bg-accent"}`}>
                    <Banknote className="h-4 w-4" /> {t("Cash")}
                  </button>
                  <button type="button" onClick={() => setPayMethod("gpay")}
                    className={`flex items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-semibold transition ${payMethod === "gpay" ? "gradient-primary border-transparent text-primary-foreground shadow-elegant" : "border-border bg-background hover:bg-accent"}`}>
                    <Smartphone className="h-4 w-4" /> {t("GPay / UPI")}
                  </button>
                </div>
              </div>

              {/* Delivery Location */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("Delivery location")}</label>

                <div className="space-y-1.5">
                  {/* Once GPS address is fetched and selected, show only the address */}
                  {gpsAddress && selectedAddress === gpsAddress ? (
                    <div className="flex items-start gap-2 rounded-xl border border-primary bg-primary/5 px-3 py-2.5">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <p className="flex-1 text-xs font-semibold text-primary break-words">{gpsAddress}</p>
                      <button type="button" onClick={() => { setGpsAddress(""); setGpsCoords(null); setSelectedAddress(""); }} className="shrink-0">
                        <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  ) : (
                    <button type="button"
                      disabled={gpsLoading}
                      onClick={async () => {
                        setGpsErr(null);
                        const result = await fetchGPS();
                        if (result === "denied") {
                          setGpsErr("Location access is blocked. Go to Settings → Site permissions → Location and allow this site.");
                        } else if (result) {
                          setGpsAddress(result.address);
                          setGpsCoords({ lat: result.lat, lng: result.lng });
                          setSelectedAddress(result.address);
                          setShowManual(false);
                          setGpsErr(null);
                        } else {
                          setGpsErr("Could not get your location. Make sure GPS is ON and try again.");
                        }
                      }}
                      className="flex w-full items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2.5 text-xs font-semibold text-primary hover:bg-accent transition disabled:opacity-60">
                      <Navigation className="h-3.5 w-3.5 shrink-0" />
                      <span className="flex-1 text-left">
                        {gpsLoading ? t("Fetching location…") : t("Use my current location")}
                      </span>
                    </button>
                  )}
                  {gpsErr && <p className="px-1 text-xs text-destructive">{gpsErr}</p>}

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
                    <span className="flex-1 text-left">{t("Saved addresses / Type address")}</span>
                    {showManual && <X className="h-3.5 w-3.5 shrink-0" />}
                  </button>

                  {/* Saved addresses list + manual input */}
                  <AnimatePresence>
                    {showManual && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden space-y-1.5 pl-1"
                      >
                        {/* Manual type + verify */}
                        <div className="flex gap-2">
                          <input
                            value={manualLocation}
                            onChange={e => { setManualLocation(e.target.value); setSelectedAddress(""); setShowGpsPrompt(!!e.target.value.trim()); }}
                            placeholder={t("Type your address…")}
                            className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
                          />
                          <button
                            type="button"
                            disabled={!manualLocation.trim()}
                            onClick={async () => {
                              setSelectedAddress(manualLocation);
                              // Save to DB for future use
                              if (user && !saved.find(a => a.address.trim() === manualLocation.trim())) {
                                await saveAddress("Home", manualLocation);
                              }
                              setShowGpsPrompt(true);
                            }}
                            className="shrink-0 rounded-xl gradient-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
                          >
                            {t("Use")}
                          </button>
                        </div>

                        {/* GPS nudge — shown when manual address is entered without GPS */}
                        {showGpsPrompt && !gpsCoords && (
                          <div className="rounded-xl border border-amber-400/40 bg-amber-50 dark:bg-amber-950/30 px-3 py-2.5 space-y-2">
                            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                              📍 Please tap <span className="font-bold">"Use my location"</span> once so we can confirm you're within our delivery zone.
                            </p>
                            <button
                              type="button"
                              disabled={gpsLoading}
                              onClick={triggerGPS}
                              className="flex w-full items-center justify-center gap-2 rounded-lg gradient-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-60"
                            >
                              <Navigation className="h-3.5 w-3.5" />
                              {gpsLoading ? "Fetching…" : "Use my location (GPS)"}
                            </button>
                            {gpsErr && <p className="text-[10px] text-destructive">{gpsErr}</p>}
                          </div>
                        )}
                        {gpsCoords && selectedAddress && (
                          <p className="px-1 text-[10px] text-emerald-600 font-semibold">{t("✓ GPS confirmed — your address is saved")}</p>
                        )}

                        {saved.filter(a => a.label !== "Current Location").length > 0 && (
                          <>
                            <p className="px-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Saved</p>
                            {saved.filter(a => a.label !== "Current Location").map((a) => (
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
                                  {a.lat == null && <div className="text-[10px] text-amber-500">⚠ No coords — use GPS for accurate delivery</div>}
                                </div>
                              </button>
                            ))}
                          </>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Razorpay key missing warning */}
              {razorpayKeyMissing && payMethod === "gpay" && (
                <div className="rounded-xl border border-amber-400/40 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs font-semibold text-amber-700 dark:text-amber-400">
                  {t("⚠️ GPay/UPI is not configured. Please use Cash on Delivery or contact support.")}
                </div>
              )}

              {orderErr && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{orderErr}</p>}

              <button
                onClick={checkout}
                disabled={placing || (payMethod === "gpay" && razorpayKeyMissing)}
                className="hidden lg:flex w-full items-center justify-center gap-2 rounded-full gradient-primary py-3 font-semibold text-primary-foreground shadow-elegant transition hover:scale-[1.02] disabled:opacity-60"
              >
                {placing
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> {payMethod === "gpay" ? t("Opening payment…") : t("Placing order…")}</>
                  : <><LogIn className="h-4 w-4" /> {payMethod === "gpay" ? t("Pay with GPay / UPI") : `${t("Place order")} · ₹${finalTotal}`}</>
                }
              </button>
              <p className="text-center text-[11px] text-muted-foreground">{t("Secure · UPI / Cash on delivery")}</p>
            </aside>
          </div>
        )}
      </section>

      {/* ── Mobile sticky checkout bar (hidden on lg) ── */}
      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 px-4 py-3 backdrop-blur-sm lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-muted-foreground">{t("Total")}</div>
              <div className="text-lg font-black">₹{finalTotal}</div>
            </div>
            <button
              onClick={() => checkout()}
              disabled={placing || (payMethod === "gpay" && razorpayKeyMissing)}
              className="flex flex-1 items-center justify-center gap-2 rounded-full gradient-primary py-3 font-semibold text-primary-foreground shadow-elegant transition disabled:opacity-60"
            >
              {placing
                ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("Placing order…")}</>
                : <>{payMethod === "gpay" ? t("Pay with GPay / UPI") : `${t("Place order")} · ₹${finalTotal}`}</>
              }
            </button>
          </div>
        </div>
      )}

      {/* ── Sign-in required modal ── */}
      <AnimatePresence>
        {showAuthPrompt && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setShowAuthPrompt(false)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 text-center shadow-elegant">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full gradient-primary">
                <LogIn className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="font-[Fraunces] text-2xl font-black">{t("Sign in to order")}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("You need an account to place an order. It only takes 30 seconds to sign up!")}
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <Link
                  to="/login"
                  search={{ redirect: "/cart" } as any}
                  className="flex items-center justify-center gap-2 rounded-full gradient-primary py-3 font-semibold text-primary-foreground shadow-elegant"
                >
                  <LogIn className="h-4 w-4" /> {t("Sign in / Sign up")}
                </Link>
                <button
                  onClick={() => setShowAuthPrompt(false)}
                  className="rounded-full border border-border py-3 text-sm font-semibold hover:bg-accent transition">
                  {t("Back to cart")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              <h3 className="font-[Fraunces] text-2xl font-black">{t("Waiting for kitchen")}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t("Your order request has been sent to SAM kitchen. Hang tight — the chef will confirm shortly!")}</p>
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

      {/* ── Out of delivery radius modal ── */}
      <AnimatePresence>
        {locationError === "out_of_range" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-sm rounded-3xl border border-destructive/30 bg-card p-8 text-center shadow-elegant">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-destructive/10">
                <MapPin className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="font-[Fraunces] text-2xl font-black">{t("Out of Delivery Radius")}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("Sorry! SAM Foods only delivers within")} <span className="font-bold text-foreground">10 km</span> {t("of the restaurant. Your location is outside our delivery zone.")}
              </p>
              <button onClick={() => setLocationError(null)}
                className="mt-6 w-full rounded-full gradient-primary py-3 font-semibold text-primary-foreground">
                {t("Change Address")}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Location unverified modal ── */}
      <AnimatePresence>
        {locationError === "unverified" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-sm rounded-3xl border border-amber-400/30 bg-card p-8 text-center shadow-elegant">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-amber-500/10">
                <Navigation className={`h-8 w-8 text-amber-500 ${gpsLoading ? "animate-pulse" : ""}`} />
              </div>
              <h3 className="font-[Fraunces] text-2xl font-black">{t("Location Not Recognised")}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("We couldn't verify your delivery address. Please use")} <span className="font-bold text-foreground">{t('"Use my current location"')}</span> {t("(GPS) so we can confirm you're within our delivery zone.")}
              </p>
              {gpsErr && <p className="mt-2 text-xs text-destructive">{gpsErr}</p>}
              <button
                disabled={gpsLoading}
                onClick={async () => {
                  setGpsErr(null);
                  const result = await fetchGPS();
                  if (result === "denied") {
                    setGpsErr("Location access is blocked. Go to Settings → Site permissions → Location and allow this site.");
                  } else if (result) {
                    setGpsAddress(result.address);
                    setGpsCoords({ lat: result.lat, lng: result.lng });
                    setSelectedAddress(result.address);
                    setShowManual(false);
                    setLocationError(null);
                    setGpsErr(null);
                    checkout({ lat: result.lat, lng: result.lng }, result.address);
                  } else {
                    setGpsErr("Could not get location. Please enable GPS in your phone settings and try again.");
                  }
                }}
                className="mt-6 w-full rounded-full gradient-primary py-3 font-semibold text-primary-foreground disabled:opacity-60 flex items-center justify-center gap-2">
                {gpsLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> {t("Fetching location…")}</> : <><Navigation className="h-4 w-4" /> {t("OK, Got it")}</>}
              </button>
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
              <h3 className="font-[Fraunces] text-2xl font-black">{t("Food sold out 😔")}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t("Sorry, the kitchen is unable to fulfil your order right now. Please come back tomorrow for fresh dishes!")}</p>
              <button onClick={() => resetOrderState()}
                className="mt-6 w-full rounded-full gradient-primary py-3 font-semibold text-primary-foreground">
                {t("Back to cart")}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── GPay QR Modal ── */}
      <AnimatePresence>
        {showQR && gpayAcceptedOrderId && (
          <GPayQRModal
            acceptedOrderId={gpayAcceptedOrderId}
            total={finalTotal}
            onCancelOrder={async (reason) => {
              const note = reason === "timeout"
                ? "Payment timeout — user did not pay within 5 minutes"
                : "Cancelled by user — user refused to pay";
              await (supabase.from("orders") as any)
                .update({
                  status: "Cancelled",
                  cancelled_at: new Date().toISOString(),
                  delivery_time: `⚠️ ${note}`,
                  payment_status: "failed",
                })
                .eq("id", gpayAcceptedOrderId);
            }}
            onExpire={() => {
              setShowQR(false);
              setQrOrderReqId(null);
              setGpayAcceptedOrderId(null);
              setOrderErr("Payment time expired. Order has been cancelled.");
            }}
            onCancel={async () => {
              const cancelledId = gpayAcceptedOrderId;
              setShowQR(false);
              setQrOrderReqId(null);
              setGpayAcceptedOrderId(null);
              clearRef.current();
              refetchMenu();
              navigateRef.current({ to: "/orders", search: { cancelled: cancelledId } as any });
            }}
            onPaid={() => {
              clearRef.current();
              refetchMenu();
            }}
          />
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
