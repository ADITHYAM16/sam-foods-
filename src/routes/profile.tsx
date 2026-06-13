import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Mail, Phone, Lock, Save, Loader2, MapPin, Navigation,
  Trash2, Check, Plus, X, Eye, EyeOff, CheckCircle2,
} from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { useAuth } from "@/lib/auth-context";
import { useLocation, isWithinDeliveryRadius } from "@/lib/location-context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "My Profile — SAM Foods" }] }),
});

const LABEL_OPTIONS = ["Home", "Work", "Other"];
const EMPTY_ADDR = { flatNo: "", street: "", area: "", landmark: "", label: "Home" };

function ProfilePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { saved, saveAddress, setDefault, deleteAddress, fetchGPS, gpsLoading } = useLocation();

  // Profile form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Password form state
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Address form state
  const [addrForm, setAddrForm] = useState(EMPTY_ADDR);
  const [addrSaving, setAddrSaving] = useState(false);
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [addrOutOfRange, setAddrOutOfRange] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", search: { redirect: "/profile" } as any });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) { setName(user.name); setPhone(user.phone ?? ""); }
  }, [user]);

  const saveProfile = async () => {
    if (!name.trim()) return setProfileMsg({ type: "err", text: "Name cannot be empty." });
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const { error } = await (supabase.from("profiles") as any)
        .update({ name: name.trim(), phone: phone.trim() || null })
        .eq("id", user!.id);
      if (error) throw new Error(error.message);
      setProfileMsg({ type: "ok", text: "Profile updated!" });
    } catch (e) {
      setProfileMsg({ type: "err", text: e instanceof Error ? e.message : "Failed to update profile." });
    } finally {
      setProfileSaving(false);
    }
  };

  const updatePassword = async () => {
    setPwMsg(null);
    if (newPw.length < 6) return setPwMsg({ type: "err", text: "Password must be at least 6 characters." });
    if (newPw !== confirmPw) return setPwMsg({ type: "err", text: "Passwords don't match." });
    setPwSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw new Error(error.message);
      setCurPw(""); setNewPw(""); setConfirmPw("");
      setPwMsg({ type: "ok", text: "Password updated successfully!" });
    } catch (e) {
      setPwMsg({ type: "err", text: e instanceof Error ? e.message : "Failed to update password." });
    } finally {
      setPwSaving(false);
    }
  };

  const handleSaveAddress = async () => {
    const { flatNo, street, area, landmark, label } = addrForm;
    const parts = [flatNo, street, area, landmark].map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) return;
    setAddrSaving(true);
    const addressStr = parts.join(", ");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressStr + ", Tamil Nadu, India")}`
      );
      const data = await res.json();
      if (data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        console.log("Latitude:", lat);
        console.log("Longitude:", lng);
        if (!isWithinDeliveryRadius(lat, lng)) { setAddrOutOfRange(true); setAddrSaving(false); return; }
        await saveAddress(label || "Home", addressStr, lat, lng);
      } else {
        setAddrOutOfRange(true); setAddrSaving(false); return;
      }
    } catch { setAddrOutOfRange(true); setAddrSaving(false); return; }
    setAddrSaving(false);
    setAddrForm(EMPTY_ADDR);
    setShowAddrForm(false);
  };

  const handleGPS = async () => {
    await fetchGPS();
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SiteShell>
      <section className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <div className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-primary">Account</div>
        <h1 className="font-[Fraunces] text-3xl font-black md:text-5xl">My Profile</h1>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {/* ── Profile Info ── */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </span>
              <h2 className="font-[Fraunces] text-xl font-bold">Personal Info</h2>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full Name</label>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 focus-within:border-primary transition">
                  <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-transparent text-sm outline-none"
                    placeholder="Your name"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</label>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-muted px-4 py-2.5 opacity-60">
                  <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm">{user.email}</span>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">Email cannot be changed.</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Phone Number</label>
                <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 focus-within:border-primary transition">
                  <Phone className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full bg-transparent text-sm outline-none"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              {profileMsg && (
                <p className={`rounded-lg px-3 py-2 text-xs ${profileMsg.type === "ok" ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"}`}>
                  {profileMsg.text}
                </p>
              )}
              <button
                onClick={saveProfile}
                disabled={profileSaving}
                className="flex w-full items-center justify-center gap-2 rounded-full gradient-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {profileSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {profileSaving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>

          {/* ── Change Password ── */}
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10">
                <Lock className="h-5 w-5 text-primary" />
              </span>
              <h2 className="font-[Fraunces] text-xl font-bold">Change Password</h2>
            </div>

            <div className="space-y-3">
              {[
                { label: "New Password", value: newPw, set: setNewPw, placeholder: "Min 6 characters" },
                { label: "Confirm Password", value: confirmPw, set: setConfirmPw, placeholder: "Repeat new password" },
              ].map(({ label, value, set, placeholder }) => (
                <div key={label}>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
                  <div className="relative flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 focus-within:border-primary transition">
                    <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <input
                      type={showPw ? "text" : "password"}
                      value={value}
                      onChange={e => set(e.target.value)}
                      className="w-full bg-transparent text-sm outline-none"
                      placeholder={placeholder}
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
              >
                {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showPw ? "Hide" : "Show"} passwords
              </button>

              {pwMsg && (
                <p className={`rounded-lg px-3 py-2 text-xs ${pwMsg.type === "ok" ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"}`}>
                  {pwMsg.text}
                </p>
              )}
              <button
                onClick={updatePassword}
                disabled={pwSaving}
                className="flex w-full items-center justify-center gap-2 rounded-full gradient-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {pwSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                {pwSaving ? "Updating…" : "Update Password"}
              </button>
              <div className="text-center">
                <Link to="/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot your current password? Reset via email →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ── Saved Addresses ── */}
        <div className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10">
                <MapPin className="h-5 w-5 text-primary" />
              </span>
              <h2 className="font-[Fraunces] text-xl font-bold">Saved Addresses</h2>
            </div>
            <button
              onClick={() => setShowAddrForm(v => !v)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent transition"
            >
              {showAddrForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {showAddrForm ? "Cancel" : "Add Address"}
            </button>
          </div>

          {/* GPS fetch */}
          <button
            onClick={handleGPS}
            disabled={gpsLoading}
            className="mb-4 flex w-full items-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/10 transition disabled:opacity-60"
          >
            <Navigation className="h-4 w-4 shrink-0" />
            {gpsLoading ? "Fetching your location…" : "Save current GPS location"}
          </button>

          {/* Add address form */}
          <AnimatePresence>
            {showAddrForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 overflow-hidden"
              >
                <div className="rounded-2xl border border-border bg-background p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Flat / House No.</label>
                      <input
                        value={addrForm.flatNo}
                        onChange={e => setAddrForm(p => ({ ...p, flatNo: e.target.value }))}
                        placeholder="e.g. 4B"
                        className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Street</label>
                      <input
                        value={addrForm.street}
                        onChange={e => setAddrForm(p => ({ ...p, street: e.target.value }))}
                        placeholder="e.g. MG Road"
                        className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Area / Locality</label>
                      <input
                        value={addrForm.area}
                        onChange={e => setAddrForm(p => ({ ...p, area: e.target.value }))}
                        placeholder="e.g. Anna Nagar"
                        className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Landmark</label>
                      <input
                        value={addrForm.landmark}
                        onChange={e => setAddrForm(p => ({ ...p, landmark: e.target.value }))}
                        placeholder="e.g. Near Hospital"
                        className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">Save as</label>
                    <div className="flex gap-2">
                      {LABEL_OPTIONS.map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setAddrForm(p => ({ ...p, label: opt }))}
                          className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition ${
                            addrForm.label === opt
                              ? "gradient-primary border-transparent text-primary-foreground"
                              : "border-border bg-background hover:bg-accent"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={handleSaveAddress}
                    disabled={addrSaving}
                    className="flex w-full items-center justify-center gap-2 rounded-full gradient-primary py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
                  >
                    {addrSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {addrSaving ? "Saving…" : "Save Address"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Saved list */}
          {saved.filter(a => a.label !== "Current Location").length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No saved addresses yet. Add one above!
            </p>
          ) : (
            <div className="space-y-2">
              {saved.filter(a => a.label !== "Current Location").map(a => (
                <motion.div
                  key={a.id}
                  layout
                  className={`flex items-start gap-3 rounded-2xl border px-4 py-3 transition ${
                    a.is_default ? "border-primary/50 bg-primary/5" : "border-border bg-background hover:border-primary/20"
                  }`}
                >
                  <MapPin className={`mt-0.5 h-4 w-4 shrink-0 ${a.is_default ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{a.label}</span>
                      {a.is_default && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Default</span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{a.address}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {!a.is_default && (
                      <button
                        onClick={() => setDefault(a.id)}
                        title="Set as default"
                        className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary transition"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteAddress(a.id)}
                      title="Delete address"
                      className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/orders" className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-accent transition">
            View Order History →
          </Link>
          <Link to="/track" search={{ orderId: undefined } as any} className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-accent transition">
            Track Active Order →
          </Link>
        </div>
      </section>

      {/* ── Out of delivery radius modal ── */}
      <AnimatePresence>
        {addrOutOfRange && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-sm rounded-3xl border border-destructive/30 bg-card p-8 text-center shadow-elegant">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-destructive/10">
                <MapPin className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="font-[Fraunces] text-2xl font-black">Outside Delivery Radius</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Your current location is outside our <span className="font-bold text-foreground">10 km</span> delivery zone, or location access was denied. SAM Foods only delivers within 10 km of the restaurant. Please enable location access and try from within the delivery area.
              </p>
              <button
                onClick={() => setAddrOutOfRange(false)}
                className="mt-6 w-full rounded-full gradient-primary py-3 font-semibold text-primary-foreground">
                Change Address
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </SiteShell>
  );
}
