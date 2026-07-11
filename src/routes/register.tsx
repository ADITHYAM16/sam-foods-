import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, Loader2, Lock, Mail, Phone, User } from "lucide-react";
import { AuthShell } from "@/components/site/AuthShell";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Field } from "./login";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
  head: () => ({ meta: [{ title: "Create account — SAM Foods" }] }),
});

function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+91");
  const [pw, setPw] = useState("");
  const [cpw, setCpw] = useState("");
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (name.trim().length < 2) return setErr("Please enter your full name.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr("Enter a valid email.");
    if (!/^\+?[0-9\s-]{8,15}$/.test(phone)) return setErr("Enter a valid phone number.");
    if (pw.length < 6) return setErr("Password must be at least 6 characters.");
    if (pw !== cpw) return setErr("Passwords don't match.");
    if (!agree) return setErr("Please accept terms & conditions.");
    setLoading(true);
    try {
      // Check for duplicate phone number
      const { data: existing } = await (supabase.from("profiles") as any)
        .select("id")
        .eq("phone", phone.trim())
        .limit(1)
        .maybeSingle();
      if (existing) { setErr("This phone number is already registered. Try signing in."); setLoading(false); return; }

      await register({ name, email, phone, password: pw, role: "customer" });
      navigate({ to: "/" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Create your SAM account" subtitle="Order, track, and unlock catering — in under a minute.">
      <form onSubmit={submit} className="space-y-4">
        <Field icon={<User className="h-4 w-4" />} placeholder="Full name" value={name} onChange={setName} />
        <Field icon={<Mail className="h-4 w-4" />} type="email" placeholder="Email" value={email} onChange={setEmail} />
        <Field icon={<Phone className="h-4 w-4" />} placeholder="Phone number" value={phone} onChange={setPhone} />
        <div className="grid gap-4 sm:grid-cols-2">
          <PasswordField placeholder="Password" value={pw} onChange={setPw} />
          <PasswordField placeholder="Confirm password" value={cpw} onChange={setCpw} />
        </div>
        <label className="flex items-start gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 accent-primary" />
          <span>I agree to the <Link to="/terms" className="text-primary hover:underline">Terms</Link> & <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.</span>
        </label>
        {err && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
        <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-full gradient-primary py-3 font-semibold text-primary-foreground shadow-elegant transition hover:opacity-95 disabled:opacity-60">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create account
        </button>
        <p className="text-center text-sm text-muted-foreground">Already with us? <Link to="/login" search={{ redirect: "/" } as any} className="font-semibold text-primary hover:underline">Sign in</Link></p>
      </form>
    </AuthShell>
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
