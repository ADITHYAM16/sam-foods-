import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Loader2, Mail, Lock, ShieldCheck, Bike } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

type OwnerRole = "admin" | "delivery";

export function Login({ forPage }: { forPage: "admin" | "delivery" }) {
  const { login } = useAuth();
  const [role, setRole] = useState<OwnerRole>(forPage === "delivery" ? "delivery" : "admin");
  const [email, setEmail] = useState(forPage === "admin" ? "sam@gmail.com" : "");
  const [password, setPassword] = useState(forPage === "admin" ? "admin@123" : "");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!email.trim()) return setErr("Enter your email.");
    if (password.length < 6) return setErr("Password must be at least 6 characters.");
    setBusy(true);
    try {
      const u = await login(email.trim(), password);
      if (u.role !== role) {
        setErr(`This account is not a ${role === "admin" ? "Admin" : "Delivery Agent"} account.`);
        setBusy(false);
        return;
      }
      // Navigate to the correct page for this role
      window.location.href = u.role === "delivery" ? "/delivery" : "/";
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Sign in failed.";
      setErr(msg.includes("Invalid login") ? "Invalid email or password." : msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="grid min-h-screen md:grid-cols-2">

        {/* Left panel — image, desktop only */}
        <div className="relative hidden overflow-hidden md:block">
          <motion.img
            src="/food/kesari.jpeg"
            alt=""
            initial={{ scale: 1.18, x: -60, opacity: 0 }}
            animate={{ scale: 1, x: 0, opacity: 1 }}
            transition={{ duration: 1.1, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-amber-900/40"
          />
          <motion.div
            animate={{ y: [0, -14, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-12 left-12 right-12 text-white"
          >
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.7 }}
              className="inline-flex items-center gap-2"
            >
              <span className="grid h-10 w-10 place-items-center rounded-full overflow-hidden shadow-lg bg-white">
                <img src="/logo.png.jpeg" alt="SAM Foods" className="h-10 w-10 rounded-full object-cover" />
              </span>
              <span className="font-[Fraunces] text-2xl font-bold">SAM Foods</span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.9 }}
              className="mt-6 max-w-md font-[Fraunces] text-4xl font-black leading-tight"
            >
              Owner Portal — Command the kitchen.
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.1 }}
              className="mt-3 max-w-md text-white/80"
            >
              Manage orders, menu, bulk bookings, delivery agents and revenue — all from one dashboard.
            </motion.p>
          </motion.div>
        </div>

        {/* Right panel — form */}
        <div className="flex min-h-screen items-center justify-center px-5 py-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm">

            {/* Header (Logo + Title) */}
            <div className="mb-8 flex flex-col items-center text-center">
              <div className="mb-5 grid h-20 w-20 shrink-0 place-items-center rounded-full overflow-hidden shadow-lg border-4 border-background bg-white">
                <img src="/logo.png.jpeg" alt="SAM Foods" className="h-full w-full rounded-full object-cover" />
              </div>
              <h1 className="font-[Fraunces] text-3xl font-black md:text-4xl">Owner Portal</h1>
              <p className="mt-2 text-sm text-muted-foreground">Select your role and sign in</p>
            </div>

            <div className="mt-6 space-y-4">
              {/* Role tabs */}
              <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-muted/40 p-1.5">
                {(["admin", "delivery"] as OwnerRole[]).map((r) => (
                  <button key={r}
                    onClick={() => {
                      if (r === "admin") { setEmail("sam@gmail.com"); setPassword("admin@123"); }
                      else { setEmail(""); setPassword(""); }
                      setRole(r); setErr(null);
                    }}
                    className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition ${
                      role === r ? "bg-amber-500 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                    }`}>
                    {r === "admin" ? <ShieldCheck className="h-4 w-4" /> : <Bike className="h-4 w-4" />}
                    {r === "admin" ? "Admin" : "Delivery Agent"}
                  </button>
                ))}
              </div>

              {/* Role hint */}
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 text-xs text-muted-foreground">
                {role === "admin"
                  ? "Full access: manage orders, menu, bulk bookings & revenue."
                  : "Delivery access: view assigned orders and update delivery status."}
              </div>

              <AnimatePresence mode="wait">
                <motion.form key={role}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  onSubmit={handleSignIn} className="space-y-3">

                  <label className="flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 transition focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20">
                    <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <input type="email"
                      placeholder={role === "admin" ? "sam@gmail.com" : "agent@gmail.com"}
                      value={email} onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
                  </label>

                  <div className="relative">
                    <label className="flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 transition focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20">
                      <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <input type={show ? "text" : "password"} placeholder="Password"
                        value={password} onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
                    </label>
                    <button type="button" onClick={() => setShow(v => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition">
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  <AnimatePresence>
                    {err && (
                      <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                        className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
                        {err}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <button disabled={busy}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-amber-500 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 active:scale-[0.98] disabled:opacity-60">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : role === "admin" ? <ShieldCheck className="h-4 w-4" /> : <Bike className="h-4 w-4" />}
                    {busy ? "Signing in…" : `Sign in as ${role === "admin" ? "Admin" : "Delivery Agent"}`}
                  </button>
                </motion.form>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
