import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, X, MapPin, Clock, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import QRCode from "qrcode";

// ── Your UPI ID ───────────────────────────────────────────────────────────────
const SAM_UPI_ID = "6379807060@okbizaxis";
const SAM_NAME   = "SAM Foods";
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  acceptedOrderId: string;
  total: number;
  onExpire: () => void;
  onCancel: () => void;
  onPaid: () => void;
  onCancelOrder: (reason: "user_cancelled" | "timeout") => Promise<void>;
}

export function GPayQRModal({ acceptedOrderId, total, onExpire, onCancel, onPaid, onCancelOrder }: Props) {
  const [secondsLeft, setSecondsLeft] = useState(300);
  const [phase, setPhase] = useState<"qr" | "success">("qr");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const doneRef = useRef(false);

  // ── Generate UPI QR with amount locked inside the QR itself ──────────────
  // Amount is embedded in the QR string — cannot be changed by the user
  useEffect(() => {
    const upiString = `upi://pay?pa=${SAM_UPI_ID}&pn=${encodeURIComponent(SAM_NAME)}&am=${total.toFixed(2)}&cu=INR&tn=${encodeURIComponent("SAM Foods Order")}`;
    QRCode.toDataURL(upiString, {
      width: 400,
      margin: 2,
      errorCorrectionLevel: "H",
      color: { dark: "#000000", light: "#ffffff" },
    }).then(url => setQrDataUrl(url)).catch(() => setQrDataUrl(""));
  }, [total]);

  // ── Countdown timer ───────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "qr") return;
    const id = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          if (!doneRef.current) {
            doneRef.current = true;
            onCancelOrder("timeout").finally(() => onExpire());
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, onExpire, onCancelOrder]);

  // ── Watch orders.payment_status = "paid" ONLY ─────────────────────────────
  useEffect(() => {
    if (phase !== "qr") return;

    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      onPaid();
      setPhase("success");
    };

    const channel = supabase
      .channel(`gpay-paid-${acceptedOrderId}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${acceptedOrderId}` },
        (payload) => {
          if ((payload.new as any).payment_status === "paid") finish();
        }
      ).subscribe();

    const poll = setInterval(async () => {
      if (doneRef.current) { clearInterval(poll); return; }
      try {
        const { data } = await (supabase.from("orders") as any)
          .select("payment_status").eq("id", acceptedOrderId).single();
        if (data?.payment_status === "paid") finish();
      } catch {}
    }, 5000);

    return () => { clearInterval(poll); supabase.removeChannel(channel); };
  }, [acceptedOrderId, phase, onPaid]);

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const secs = String(secondsLeft % 60).padStart(2, "0");
  const timerPct = (secondsLeft / 300) * 100;
  const timerColor = secondsLeft > 120 ? "#22c55e" : secondsLeft > 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4">
      <AnimatePresence mode="wait">

        {/* ── QR Phase ──────────────────────────────────────────────────── */}
        {phase === "qr" && (
          <motion.div
            key="qr"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl bg-card border border-border shadow-elegant overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-primary">GPay / UPI</p>
                <h2 className="font-[Fraunces] text-xl font-black">Scan & Pay</h2>
              </div>
              <button onClick={onCancel} className="grid h-8 w-8 place-items-center rounded-full hover:bg-accent text-muted-foreground transition">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Kitchen accepted badge */}
            <div className="mx-5 mb-3 flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-xs font-semibold text-emerald-700">Kitchen accepted — complete your payment</span>
            </div>

            {/* Amount */}
            <div className="mx-5 mb-3 rounded-2xl bg-primary/5 border border-primary/20 px-4 py-2.5 text-center">
              <p className="text-xs text-muted-foreground">Amount to Pay</p>
              <p className="text-3xl font-black text-primary">₹{total}</p>
            </div>

            {/* Dynamic QR — amount is locked inside the QR string */}
            <div className="mx-5 overflow-hidden rounded-2xl border-2 border-border bg-white flex items-center justify-center" style={{ minHeight: 220 }}>
              {qrDataUrl === null ? (
                <div className="flex flex-col items-center gap-2 py-14">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground">Generating QR…</p>
                </div>
              ) : (
                <img src={qrDataUrl} alt="UPI QR Code" className="w-full object-contain" />
              )}
            </div>

            <p className="mt-1 px-5 text-center text-[10px] text-muted-foreground">
              Amount <span className="font-bold text-primary">₹{total}</span> is locked inside the QR — cannot be changed
            </p>

            {/* Timer */}
            <div className="mx-5 mt-3 mb-2">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs font-semibold text-muted-foreground">Time remaining</p>
                </div>
                <p className="text-sm font-black tabular-nums" style={{ color: timerColor }}>
                  {mins}:{secs}
                </p>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${timerPct}%`, backgroundColor: timerColor }}
                />
              </div>
            </div>

            {/* Cancel Payment button */}
            <div className="mx-5 mb-5 mt-3">
              <button
                disabled={cancelling}
                onClick={async () => {
                  setCancelling(true);
                  await onCancelOrder("user_cancelled");
                  setCancelling(false);
                  onCancel();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-destructive/40 bg-destructive/5 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10 transition disabled:opacity-60"
              >
                {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                {cancelling ? "Cancelling…" : "Cancel Payment"}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Success Phase ──────────────────────────────────────────────── */}
        {phase === "success" && (
          <motion.div
            key="success"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl overflow-hidden"
          >
            <div className="bg-emerald-600 px-6 pt-10 pb-8 text-center text-white">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 300, damping: 20 }}
                className="mx-auto mb-5 grid h-24 w-24 place-items-center rounded-full bg-white/20"
              >
                <CheckCircle2 className="h-14 w-14 text-white" strokeWidth={1.5} />
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-80">Payment Confirmed</p>
                <h2 className="mt-1 font-[Fraunces] text-3xl font-black">Order Placed!</h2>
                <p className="mt-2 text-sm opacity-90">
                  SAM kitchen confirmed your payment of <span className="font-black">₹{total}</span>. Your food is being prepared!
                </p>
              </motion.div>
            </div>
            <div className="bg-card px-6 py-6 text-center space-y-3">
              <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-70" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
                <span className="text-xs font-semibold text-emerald-700">GPay / Paid — Notified to Kitchen</span>
              </div>
              <Link
                to="/track"
                search={{ orderId: acceptedOrderId } as any}
                className="flex w-full items-center justify-center gap-2 rounded-full gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-elegant"
              >
                <MapPin className="h-4 w-4" />
                Track My Order
              </Link>
              <Link to="/" className="block w-full rounded-full border border-border py-3 text-sm font-semibold text-muted-foreground hover:bg-accent transition">
                Back to Menu
              </Link>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
