import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Lock, Mail, Phone, User } from "lucide-react";
import { AuthShell } from "@/components/site/AuthShell";
import { useAuth } from "@/lib/auth-context";
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
          <Field icon={<Lock className="h-4 w-4" />} type="password" placeholder="Password" value={pw} onChange={setPw} />
          <Field icon={<Lock className="h-4 w-4" />} type="password" placeholder="Confirm password" value={cpw} onChange={setCpw} />
        </div>
        <label className="flex items-start gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 accent-primary" />
          <span>I agree to the <a className="text-primary hover:underline" href="#">Terms</a> & <a className="text-primary hover:underline" href="#">Privacy Policy</a>.</span>
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
