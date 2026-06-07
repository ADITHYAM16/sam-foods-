import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { CheckCircle2, Loader2, Lock, Mail, MailCheck } from "lucide-react";
import { motion } from "framer-motion";
import { AuthShell } from "@/components/site/AuthShell";
import { Field } from "./login";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPage,
  head: () => ({ meta: [{ title: "Reset password — SAM Foods" }] }),
});

type Step = "email" | "check-inbox" | "new-password" | "done";

function ForgotPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [cpw, setCpw] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();

  const sendReset = async () => {
    setErr(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) return setErr("Enter a valid email.");
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/forgot-password`,
      });
      if (error) throw new Error(error.message);
      // Show "check your email" screen — don't jump to password form yet
      setStep("check-inbox");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to send reset email.");
    } finally {
      setLoading(false);
    }
  };

  // Listen for Supabase PASSWORD_RECOVERY event — only fired after user
  // clicks the reset link in their email, giving us a valid session to update
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setStep("new-password");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const updatePassword = async () => {
    setErr(null);
    if (pw.length < 6) return setErr("Password must be at least 6 characters.");
    if (pw !== cpw) return setErr("Passwords don't match.");
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw new Error(error.message);
      setStep("done");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Forgot password?" subtitle="No worries — we'll get you back to ordering in a snap.">
      {step === "email" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <Field icon={<Mail className="h-4 w-4" />} type="email" placeholder="Your account email" value={email} onChange={setEmail} />
          {err && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
          <button onClick={sendReset} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-full gradient-primary py-3 font-semibold text-primary-foreground shadow-elegant disabled:opacity-60">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Send reset link
          </button>
          <p className="text-center text-sm text-muted-foreground">Remembered? <Link to="/login" className="font-semibold text-primary hover:underline">Sign in</Link></p>
        </motion.div>
      )}
      {step === "check-inbox" && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5 text-center">
          <MailCheck className="mx-auto h-16 w-16 text-primary" />
          <div>
            <h2 className="font-[Fraunces] text-2xl font-bold">Check your inbox</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              We sent a reset link to <b className="text-foreground">{email}</b>.<br />
              Click the link in the email — this page will update automatically.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Didn't get it?{" "}
            <button onClick={() => setStep("email")} className="font-semibold text-primary hover:underline">Try again</button>
          </p>
        </motion.div>
      )}
      {step === "new-password" && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
          <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">You're verified! Set your new password below.</p>
          <Field icon={<Lock className="h-4 w-4" />} type="password" placeholder="New password" value={pw} onChange={setPw} />
          <Field icon={<Lock className="h-4 w-4" />} type="password" placeholder="Confirm new password" value={cpw} onChange={setCpw} />
          {err && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
          <button onClick={updatePassword} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-full gradient-primary py-3 font-semibold text-primary-foreground shadow-elegant disabled:opacity-60">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Update password
          </button>
        </motion.div>
      )}
      {step === "done" && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-5 text-center">
          <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600" />
          <h2 className="font-[Fraunces] text-2xl font-bold">All set!</h2>
          <p className="text-muted-foreground">Your password has been updated.</p>
          <button onClick={() => navigate({ to: "/login" })} className="w-full rounded-full gradient-primary py-3 font-semibold text-primary-foreground shadow-elegant">Back to sign in</button>
        </motion.div>
      )}
    </AuthShell>
  );
}
