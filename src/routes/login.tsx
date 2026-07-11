import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, Mail, Lock, User, Phone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  validateSearch: (s: Record<string, unknown>) => ({ redirect: (s.redirect as string) || "/" }),
  head: () => ({ meta: [{ title: "Sign in — SAM Foods" }] }),
});

type Tab = "signin" | "signup";

function LoginPage() {
  const { login, register, user, loading } = useAuth();
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();

  useEffect(() => {
    if (!loading && user) {
      if (user.role === "admin") navigate({ to: "/admin" });
      else if (user.role === "delivery") navigate({ to: "/delivery" });
      else navigate({ to: redirect as any || "/" });
    }
  }, [user, loading, navigate, redirect]);

  const [tab, setTab] = useState<Tab>("signin");

  // Sign-in state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);

  // Sign-up state
  const [name, setName] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password2, setPassword2] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agree, setAgree] = useState(false);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const reset = () => {
    setErr(null);
    setEmail(""); setPassword("");
    setName(""); setSuEmail(""); setPhoneNumber(""); setPassword2(""); setConfirm("");
    setAgree(false);
  };

  // Sign-in: email + password
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!email.trim()) return setErr("Enter your email.");
    if (password.length < 6) return setErr("Password must be at least 6 characters.");
    setBusy(true);
    try {
      const u = await login(email.trim(), password);
      navigate({ to: u.role === "admin" ? "/admin" : u.role === "delivery" ? "/delivery" : (redirect as any || "/") });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Sign in failed.";
      setErr(msg.includes("Invalid login") ? "Invalid email or password." : msg);
    } finally { setBusy(false); }
  };

  // Sign-up: direct register, no OTP
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (name.trim().length < 2) return setErr("Enter your full name.");
    if (!/^\S+@\S+\.\S+$/.test(suEmail)) return setErr("Enter a valid email.");
    if (phoneNumber.trim().length < 10) return setErr("Enter a valid 10-digit mobile number.");
    if (password2.length < 6) return setErr("Password must be at least 6 characters.");
    if (password2 !== confirm) return setErr("Passwords don't match.");
    if (!agree) return setErr("Please accept terms & conditions.");
    setBusy(true);
    try {
      // Check for duplicate phone number
      const normalised = "+91" + phoneNumber.trim();
      const { data: existing } = await (supabase.from("profiles") as any)
        .select("id")
        .eq("phone", normalised)
        .limit(1)
        .maybeSingle();
      if (existing) { setErr("This phone number is already registered. Try signing in."); setBusy(false); return; }

      await register({ name, email: suEmail.trim(), phone: normalised, password: password2, role: "customer" });
      navigate({ to: redirect as any || "/" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Registration failed. Please try again.");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex h-16 items-center justify-between border-b border-border px-6">
        <Link to="/login" search={{ redirect: "/" } as any} className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white overflow-hidden shadow-glow">
            <img src="/logo.png.jpeg" alt="SAM Foods" className="h-9 w-9 rounded-full object-cover" />
          </span>
          <span className="font-[Fraunces] text-xl font-bold">SAM <span className="text-gradient">Foods</span></span>
        </Link>
        <div />
      </div>

      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="mb-6 text-center">
            <h1 className="font-[Fraunces] text-3xl font-black md:text-4xl">Welcome to SAM</h1>
            <p className="mt-1 text-muted-foreground">Order food, track deliveries, book catering.</p>
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 shadow-elegant md:p-8">
            {/* Tabs */}
            <div className="mb-6 grid grid-cols-2 gap-1 rounded-full border border-border bg-background p-1 text-sm font-semibold">
              {(["signin", "signup"] as Tab[]).map((t) => (
                <button key={t} onClick={() => { setTab(t); reset(); }}
                  className={`rounded-full py-2.5 transition ${tab === t ? "gradient-primary text-primary-foreground shadow-elegant" : "text-muted-foreground hover:text-foreground"}`}>
                  {t === "signin" ? "Sign In" : "Sign Up"}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {/* ── SIGN IN ── */}
              {tab === "signin" && (
                <motion.div key="signin" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-3">
                  <form onSubmit={handleSignIn} className="space-y-3">
                    <Field icon={<Mail className="h-4 w-4" />} type="email" placeholder="your@email.com" value={email} onChange={setEmail} autoComplete="email" />
                    <div className="relative">
                      <Field icon={<Lock className="h-4 w-4" />} type={show ? "text" : "password"} placeholder="Password" value={password} onChange={setPassword} autoComplete="current-password" />
                      <button type="button" onClick={() => setShow(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="text-right">
                      <Link to="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
                    </div>
                    {err && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{err}</p>}
                    <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full gradient-primary py-3 font-semibold text-primary-foreground shadow-elegant disabled:opacity-60">
                      {busy && <Loader2 className="h-4 w-4 animate-spin" />} Sign In
                    </button>
                  </form>
                  <p className="text-center text-xs text-muted-foreground">
                    No account? <button onClick={() => { setTab("signup"); reset(); }} className="font-semibold text-primary hover:underline">Sign up free</button>
                  </p>
                </motion.div>
              )}

              {/* ── SIGN UP ── */}
              {tab === "signup" && (
                <motion.div key="signup" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                  <form onSubmit={handleSignUp} className="space-y-3">
                    <Field icon={<User className="h-4 w-4" />} placeholder="Full name" value={name} onChange={setName} />
                    <Field icon={<Mail className="h-4 w-4" />} type="email" placeholder="Email" value={suEmail} onChange={setSuEmail} />
                    <div className="flex items-center rounded-2xl border border-border bg-background transition focus-within:border-primary focus-within:shadow-glow overflow-hidden">
                      <span className="flex items-center gap-1 px-3 py-3 text-sm font-semibold text-foreground border-r border-border bg-muted select-none whitespace-nowrap">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        +91
                      </span>
                      <input
                        type="tel"
                        placeholder="Enter mobile number"
                        value={phoneNumber}
                        onChange={e => setPhoneNumber(e.target.value)}
                        className="w-full bg-transparent px-3 py-3 text-sm outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <PasswordField placeholder="Password" value={password2} onChange={setPassword2} />
                      <PasswordField placeholder="Confirm" value={confirm} onChange={setConfirm} />
                    </div>
                    <label className="flex items-start gap-2 text-xs text-muted-foreground">
                      <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} className="mt-0.5 accent-primary" />
                      I agree to the <Link to="/terms" className="text-primary hover:underline">Terms</Link> & <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
                    </label>
                    {err && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{err}</p>}
                    <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full gradient-primary py-3 font-semibold text-primary-foreground shadow-elegant disabled:opacity-60">
                      {busy && <Loader2 className="h-4 w-4 animate-spin" />} Create Account
                    </button>
                  </form>
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    Already have an account? <button onClick={() => { setTab("signin"); reset(); }} className="font-semibold text-primary hover:underline">Sign in</button>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

type FieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  icon?: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
};
export function Field({ icon, onChange, value, ...rest }: FieldProps) {
  return (
    <label className="flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 transition focus-within:border-primary focus-within:shadow-glow">
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <input {...rest} value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
    </label>
  );
}

function PasswordField({ placeholder, value, onChange }: { placeholder: string; value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false);
  return (
    <label className="flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 transition focus-within:border-primary focus-within:shadow-glow">
      <span className="text-muted-foreground"><Lock className="h-4 w-4" /></span>
      <input
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
      <button type="button" onClick={() => setShow(v => !v)} className="shrink-0 text-muted-foreground">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </label>
  );
}
