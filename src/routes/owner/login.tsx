import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, Mail, Lock, Bike, ShieldCheck, ChefHat } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { Field } from "@/routes/login";

export const Route = createFileRoute("/owner/login")({
  component: OwnerLoginPage,
  head: () => ({ meta: [{ title: "Owner Portal — SAM Foods" }] }),
});

type OwnerRole = "admin" | "delivery";

function OwnerLoginPage() {
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      if (user.role === "admin") navigate({ to: "/admin" });
      else if (user.role === "delivery") navigate({ to: "/delivery" });
      else navigate({ to: "/" });
    }
  }, [user, loading, navigate]);

  const [role, setRole] = useState<OwnerRole>("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!email.trim()) return setErr("Enter your email.");
    if (password.length < 6) return setErr("Password must be at least 6 characters.");
    setBusy(true);
    try {
      const u = await login(email.trim(), password);
      if (u.role !== role) {
        setErr(`This account is not a ${role === "admin" ? "Admin" : "Delivery Agent"} account.`);
        return;
      }
      navigate({ to: role === "admin" ? "/admin" : "/delivery" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Sign in failed.";
      setErr(msg.includes("Invalid login") ? "Invalid email or password." : msg);
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <div className="flex h-16 items-center justify-between border-b border-border px-6">
        <Link to="/login" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white overflow-hidden shadow-glow">
            <img src="/logo.png.jpeg" alt="SAM Foods" className="h-9 w-9 rounded-full object-cover" />
          </span>
          <span className="font-[Fraunces] text-xl font-bold">SAM <span className="text-gradient">Foods</span></span>
        </Link>
        <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
          ← Customer login
        </Link>
      </div>

      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">

          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-amber-500/10">
              <ShieldCheck className="h-7 w-7 text-amber-500" />
            </div>
            <h1 className="font-[Fraunces] text-4xl font-black">Owner Portal</h1>
            <p className="mt-1 text-muted-foreground">Manage your restaurant operations.</p>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-elegant md:p-8">
            {/* Role tabs */}
            <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border border-border bg-background p-1.5">
              {(["admin", "delivery"] as OwnerRole[]).map((r) => (
                <button key={r}
                  onClick={() => { setRole(r); setErr(null); setEmail(""); setPassword(""); }}
                  className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition ${
                    role === r ? "bg-amber-500 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}>
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

            {/* Form */}
            <AnimatePresence mode="wait">
              <motion.form key={role} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                onSubmit={handleSubmit} className="space-y-3">
                <Field
                  icon={<Mail className="h-4 w-4" />}
                  type="email"
                  placeholder={role === "admin" ? "sam@gmail.com" : "agent@gmail.com"}
                  value={email}
                  onChange={setEmail}
                  autoComplete="email"
                />
                <div className="relative">
                  <Field
                    icon={<Lock className="h-4 w-4" />}
                    type={show ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={setPassword}
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShow(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {err && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{err}</p>}
                <button disabled={busy}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-amber-500 py-3 font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-60">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Sign in as {role === "admin" ? "Admin" : "Delivery Agent"}
                </button>
              </motion.form>
            </AnimatePresence>


          </div>
        </motion.div>
      </div>
    </div>
  );
}
