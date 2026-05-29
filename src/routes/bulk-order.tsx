import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarDays, CheckCircle2, Loader2, MapPin, PartyPopper, Phone, User, Users, Wallet } from "lucide-react";
import { motion } from "framer-motion";
import { SiteShell } from "@/components/site/SiteShell";
import { Field } from "./login";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/bulk-order")({
  component: BulkOrderPage,
  head: () => ({ meta: [{ title: "Bulk Catering — SAM Foods" }] }),
});

function BulkOrderPage() {
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [f, setF] = useState({
    name: "", phone: "", event: "Wedding", people: "50", date: "", location: "",
    menu: "", budget: "₹25,000 - ₹50,000",
  });

  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const { error } = await supabase.from("bulk_orders").insert({
        name: f.name,
        phone: f.phone,
        event: f.event,
        people: parseInt(f.people, 10),
        date: f.date,
        location: f.location,
        menu_request: f.menu || null,
        budget: f.budget,
        status: "Pending",
      });
      if (error) throw new Error(error.message);
      setDone(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setDone(false);
    setF({ name: "", phone: "", event: "Wedding", people: "50", date: "", location: "", menu: "", budget: "₹25,000 - ₹50,000" });
  };

  return (
    <SiteShell>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-16 md:px-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium backdrop-blur">
            <PartyPopper className="h-3.5 w-3.5 text-primary" /> Catering & Bulk Booking
          </div>
          <h1 className="mt-4 max-w-2xl font-[Fraunces] text-5xl font-black md:text-6xl">Make your event <span className="text-gradient">unforgettable</span>.</h1>
          <p className="mt-3 max-w-xl text-lg text-muted-foreground">From intimate gatherings to grand weddings — SAM's catering team builds custom menus, on-site setup, and unforgettable food.</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-16 md:grid-cols-[1fr_360px] md:px-6">
        <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onSubmit={submit} className="rounded-3xl border border-border bg-card p-6 shadow-elegant md:p-8">
          {done ? (
            <div className="grid place-items-center py-10 text-center">
              <CheckCircle2 className="h-16 w-16 text-emerald-600" />
              <h2 className="mt-4 font-[Fraunces] text-3xl font-bold">Booking received!</h2>
              <p className="mt-2 max-w-md text-muted-foreground">Our catering manager will call you on <b className="text-foreground">{f.phone || "your number"}</b> within 30 minutes to confirm the menu.</p>
              <button type="button" onClick={reset} className="mt-6 rounded-full gradient-primary px-5 py-2.5 font-semibold text-primary-foreground">New booking</button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field icon={<User className="h-4 w-4" />} placeholder="Your name" value={f.name} onChange={set("name")} required />
              <Field icon={<Phone className="h-4 w-4" />} placeholder="Phone number" value={f.phone} onChange={set("phone")} required />
              <SelectBox label="Event type" icon={<PartyPopper className="h-4 w-4" />} value={f.event} onChange={set("event")} options={["Wedding", "Birthday", "Corporate", "Festival", "House Party", "Other"]} />
              <Field icon={<Users className="h-4 w-4" />} type="number" placeholder="Number of people" value={f.people} onChange={set("people")} min={10} required />
              <Field icon={<CalendarDays className="h-4 w-4" />} type="date" value={f.date} onChange={set("date")} required />
              <Field icon={<MapPin className="h-4 w-4" />} placeholder="Event location" value={f.location} onChange={set("location")} required />
              <SelectBox className="sm:col-span-2" label="Budget range" icon={<Wallet className="h-4 w-4" />} value={f.budget} onChange={set("budget")}
                options={["₹10,000 - ₹25,000", "₹25,000 - ₹50,000", "₹50,000 - ₹1,00,000", "₹1,00,000+"]} />
              <label className="sm:col-span-2">
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Special menu request</span>
                <textarea value={f.menu} onChange={(e) => set("menu")(e.target.value)} rows={4}
                  placeholder="e.g. Mostly veg, Jain options, paneer biryani must-have…"
                  className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:shadow-glow" />
              </label>
              {err && <p className="sm:col-span-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
              <button disabled={loading} className="flex items-center justify-center gap-2 rounded-full gradient-primary py-3 font-semibold text-primary-foreground shadow-elegant transition hover:scale-[1.02] disabled:opacity-60 sm:col-span-2">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : "Submit booking request"}
              </button>
            </div>
          )}
        </motion.form>

        <aside className="space-y-4">
          {[
            { t: "Custom menus", d: "Crafted by our chef for your guest count and palate." },
            { t: "Live counters", d: "Biryani, dosa, chaat, grills — set up at your venue." },
            { t: "End-to-end service", d: "Stewards, plating, packing, and clean-up included." },
          ].map((x) => (
            <div key={x.t} className="rounded-2xl border border-border bg-card p-5">
              <div className="font-[Fraunces] text-lg font-bold">{x.t}</div>
              <p className="mt-1 text-sm text-muted-foreground">{x.d}</p>
            </div>
          ))}
          <div className="rounded-2xl gradient-primary p-5 text-primary-foreground shadow-elegant">
            <div className="text-xs uppercase tracking-wider opacity-80">Need it faster?</div>
            <div className="font-[Fraunces] text-2xl font-bold">Call +91 98765 43210</div>
            <p className="mt-1 text-sm opacity-90">Our event desk answers 24/7.</p>
          </div>
        </aside>
      </section>
    </SiteShell>
  );
}

function SelectBox({ label, icon, value, onChange, options, className = "" }: { label: string; icon?: React.ReactNode; value: string; onChange: (v: string) => void; options: string[]; className?: string }) {
  return (
    <label className={className}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-4 py-3 focus-within:border-primary focus-within:shadow-glow">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-transparent text-sm outline-none">
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    </label>
  );
}
