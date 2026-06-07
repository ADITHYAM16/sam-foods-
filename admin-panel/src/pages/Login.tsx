import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Loader2, Mail, Lock, ShieldCheck, Bike } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

type OwnerRole = "admin" | "delivery";

interface LoginProps {
  onSuccess: (role: OwnerRole) => void;
}

export function Login({ onSuccess }: LoginProps) {
  const { login } = useAuth();
  const [role, setRole] = useState<OwnerRole>("admin");
  const [email, setEmail] = useState("sam@gmail.com");
  const [password, setPassword] = useState("admin@123");
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
      onSuccess(role);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Sign in failed.";
      setErr(msg.includes("Invalid login") ? "Invalid email or password." : msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top bar */}
      <div className="flex h-16 items-center justify-between border-b border-border px-6">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full overflow-hidden shadow-glow">
            <img src="/logo.png.jpeg" alt="SAM Foods" className="h-9 w-9 rounded-full object-cover" />
          </span>
          <span className="font-[Fraunces] text-xl font-bold">
            SAM <span className="text-gradient">Owner Portal</span>
          </span>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Secure Access
        </span>
      </div>

      {/* Login form */}
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-amber-500/10">
              <ShieldCheck className="h-8 w-8 text-amber-500" />
            </div>
            <h1 className="font-[Fraunces] text-4xl font-black">Owner Portal</h1>
            <p className="mt-1 text-muted-foreground">Select your role and sign in</p>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-elegant md:p-8">
            {/* Role tabs */}
            <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border border-border bg-background p-1.5">
              {(["admin", "delivery"] as OwnerRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    if (r === "admin") { setEmail("sam@gmail.com"); setPassword("admin@123"); }
                    else { setEmail(""); setPassword(""); }
                    setRole(r); setErr(null);
                  }}
                  className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition ${
                    role === r ? "bg-amber-500 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r === "admin" ? <ShieldCheck className="h-4 w-4" /> : <Bike className="h-4 w-4" />}
                  {r === "admin" ? "Admin" : "Delivery Agent"}
                </button>
              ))}
            </div>

            {/* Role description */}
            <div className="mb-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-muted-foreground">
              {role === "admin"
                ? "Full access: manage orders, menu, bulk bookings & revenue dashboard."
                : "Delivery access: view assigned orders and update delivery status."}
            </div>

            <AnimatePresence mode="wait">
              <motion.form
                key={role}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                onSubmit={handleSignIn}
                className="space-y-4"
              >
                {/* Email */}
                <label className="flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 transition focus-within:border-primary focus-within:shadow-glow">
                  <span className="text-muted-foreground"><Mail className="h-4 w-4" /></span>
                  <input
                    type="email"
                    placeholder={role === "admin" ? "sam@gmail.com" : "agent@gmail.com"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </label>

                {/* Password */}
                <div className="relative">
                  <label className="flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 transition focus-within:border-primary focus-within:shadow-glow">
                    <span className="text-muted-foreground"><Lock className="h-4 w-4" /></span>
                    <input
                      type={show ? "text" : "password"}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="current-password"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    />
                  </label>
                  <button type="button" onClick={() => setShow((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <AnimatePresence>
                  {err && (
                    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                      className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      {err}
                    </motion.p>
                  )}
                </AnimatePresence>

                <button disabled={busy}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-amber-500 py-3 font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-60">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (role === "admin" ? <ShieldCheck className="h-4 w-4" /> : <Bike className="h-4 w-4" />)}
                  {busy ? "Signing in…" : `Sign in as ${role === "admin" ? "Admin" : "Delivery Agent"}`}
                </button>
              </motion.form>
            </AnimatePresence>


          </div>
        </motion.div>
      </div>
    </div>
  );
}
