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

  const handleGoogle = async () => {
    setErr(null); setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
      if (error) throw new Error(error.message);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Google sign-in failed.");
      setBusy(false);
    }
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
      await register({ name, email: suEmail.trim(), phone: "+91" + phoneNumber.trim(), password: password2, role: "customer" });
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
                  <button onClick={handleGoogle} disabled={busy}
                    className="flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-background py-3 text-sm font-semibold transition hover:bg-accent disabled:opacity-60">
                    <GoogleIcon /> Continue with Google
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs text-muted-foreground">or</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
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
                      <Field icon={<Lock className="h-4 w-4" />} type="password" placeholder="Password" value={password2} onChange={setPassword2} />
                      <Field icon={<Lock className="h-4 w-4" />} type="password" placeholder="Confirm" value={confirm} onChange={setConfirm} />
                    </div>
                    <label className="flex items-start gap-2 text-xs text-muted-foreground">
                      <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} className="mt-0.5 accent-primary" />
                      I agree to the <a href="#" className="text-primary hover:underline">Terms</a> & <a href="#" className="text-primary hover:underline">Privacy Policy</a>
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

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16.1 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 7.1 29.3 5 24 5 16.3 5 9.7 9.5 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35 26.7 36 24 36c-5.3 0-9.6-3.4-11.3-8l-6.5 5C9.6 39.5 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.1 5.6l6.2 5.2C40 35.7 44 30.4 44 24c0-1.3-.1-2.3-.4-3.5z"/>
    </svg>
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
