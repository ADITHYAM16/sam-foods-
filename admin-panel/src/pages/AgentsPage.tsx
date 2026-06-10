import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bike, CheckCircle2, ChevronRight, IndianRupee, Loader2, Mail, Phone,
  Plus, Trash2, User, X, TrendingUp, Lock, Eye, Calendar,
  Package, Star,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { AdminShell } from "@/components/AdminShell";

function getAdminClient() {
  return createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

const adminClient = getAdminClient();

interface Agent {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  active: boolean;
  created_at: string;
}

interface AgentStats {
  total: number;
  today: number;
  todayEarnings: number;
  totalEarnings: number;
  allOrders: { id: string; customer: string; room: string; total: number; items: any[]; created_at: string }[];
}

const EMPTY_FORM = { name: "", email: "", phone: "", password: "" };

function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await adminClient
      .from("delivery_agents")
      .select("id,name,email,phone,active,created_at")
      .eq("active", true)
      .order("created_at", { ascending: false });
    if (error) console.error("[Agents] fetch error:", error.message);
    setAgents((data as Agent[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const channel = adminClient
      .channel("delivery-agents-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_agents" }, load)
      .subscribe();
    return () => { adminClient.removeChannel(channel); };
  }, [load]);

  return { agents, loading, reload: load };
}

async function fetchAgentStats(agentId: string): Promise<AgentStats> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data } = await (adminClient.from("orders") as any)
    .select("id,customer,room,total,items,created_at")
    .eq("delivery_agent_id", agentId)
    .eq("status", "Delivered")
    .order("created_at", { ascending: false });

  const all = (data as any[]) ?? [];
  const todayDelivered = all.filter((o) => new Date(o.created_at) >= todayStart);

  return {
    total: all.length,
    today: todayDelivered.length,
    todayEarnings: todayDelivered.reduce((s, o) => s + Math.round(o.total * 0.08), 0),
    totalEarnings: all.reduce((s, o) => s + Math.round(o.total * 0.08), 0),
    allOrders: all,
  };
}

// ── Agent detail modal ────────────────────────────────────────
function AgentModal({ agent, onClose, onDelete }: {
  agent: Agent;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    fetchAgentStats(agent.id).then(setStats);
  }, [agent.id]);

  // Group orders by date label
  const grouped = stats ? stats.allOrders.reduce((acc, o) => {
    const label = new Date(o.created_at).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
    if (!acc[label]) acc[label] = [];
    acc[label].push(o);
    return acc;
  }, {} as Record<string, typeof stats.allOrders>) : {};

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ y: 24, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 24, opacity: 0, scale: 0.97 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl border border-border bg-card shadow-elegant overflow-hidden"
      >
        {/* Modal header */}
        <div className="relative gradient-primary p-6 text-primary-foreground">
          <button onClick={onClose}
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-white/20 hover:bg-white/30 transition">
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-white/20 text-3xl font-black">
              {agent.name[0]?.toUpperCase()}
            </span>
            <div>
              <div className="text-xl font-bold">{agent.name}</div>
              <div className="flex items-center gap-1.5 text-sm opacity-80">
                <Mail className="h-3.5 w-3.5" /> {agent.email}
              </div>
              {agent.phone && (
                <div className="flex items-center gap-1.5 text-sm opacity-80">
                  <Phone className="h-3.5 w-3.5" /> {agent.phone}
                </div>
              )}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">🚴 Delivery Agent</span>
            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Joined {new Date(agent.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {!stats ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : showHistory ? (
            /* ── Delivery history view ── */
            <>
              <div className="flex items-center justify-between">
                <button onClick={() => setShowHistory(false)}
                  className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:opacity-80 transition">
                  ← Back
                </button>
                <span className="text-sm font-semibold">{stats.total} total deliveries</span>
              </div>
              {stats.total === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No deliveries yet.</p>
              ) : (
                <div className="max-h-[420px] overflow-y-auto space-y-4 pr-1">
                  {Object.entries(grouped).map(([date, orders]) => (
                    <div key={date}>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{date}</span>
                        <span className="text-xs text-muted-foreground">{orders.length} drop{orders.length !== 1 ? "s" : ""} · ₹{orders.reduce((s, o) => s + Math.round(o.total * 0.08), 0)} earned</span>
                      </div>
                      <div className="space-y-1.5">
                        {orders.map((o) => (
                          <div key={o.id} className="rounded-xl border border-border bg-background px-3 py-2.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold">{o.customer}</span>
                                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">Room {o.room}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="font-bold">₹{o.total}</span>
                                <span className="text-muted-foreground">{new Date(o.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                              </div>
                            </div>
                            {o.items?.length > 0 && (
                              <div className="mt-1 text-xs text-muted-foreground truncate">
                                {o.items.map((i: any) => `${i.name} ×${i.qty}`).join(", ")}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* ── Stats view ── */
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                  <div className="flex items-center gap-1.5 text-xs text-black/60">
                    <IndianRupee className="h-3.5 w-3.5" /> Today's Earnings
                  </div>
                  <div className="mt-1.5 text-2xl font-bold text-black">₹{stats.todayEarnings}</div>
                </div>
                <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                  <div className="flex items-center gap-1.5 text-xs text-black/60">
                    <Package className="h-3.5 w-3.5" /> Today's Drops
                  </div>
                  <div className="mt-1.5 text-2xl font-bold text-black">{stats.today}</div>
                </div>
                {/* Clickable Total Deliveries */}
                <button
                  onClick={() => setShowHistory(true)}
                  className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-left transition hover:bg-orange-100 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-black/60">
                      <TrendingUp className="h-3.5 w-3.5" /> Total Deliveries
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-orange-400 opacity-0 group-hover:opacity-100 transition" />
                  </div>
                  <div className="mt-1.5 text-2xl font-bold text-black">{stats.total}</div>
                  <div className="mt-0.5 text-[10px] text-orange-500">Click to view history →</div>
                </button>
                <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                  <div className="flex items-center gap-1.5 text-xs text-black/60">
                    <Star className="h-3.5 w-3.5" /> Total Earned
                  </div>
                  <div className="mt-1.5 text-2xl font-bold text-black">₹{stats.totalEarnings}</div>
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          {!showHistory && (
            <div className="flex gap-3 pt-1">
              <button onClick={onClose}
                className="flex-1 rounded-full border border-border py-2.5 text-sm font-semibold hover:bg-accent transition">
                Close
              </button>
              {!confirming ? (
                <button onClick={() => setConfirming(true)}
                  className="flex items-center gap-2 rounded-full border border-destructive/40 bg-destructive/5 px-5 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10 transition">
                  <Trash2 className="h-4 w-4" /> Remove
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Confirm remove?</span>
                  <button onClick={() => { onDelete(agent.id); onClose(); }}
                    className="rounded-full bg-destructive px-3 py-2 text-xs font-semibold text-white">Yes</button>
                  <button onClick={() => setConfirming(false)}
                    className="rounded-full border border-border px-3 py-2 text-xs font-semibold">No</button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── Agent card ────────────────────────────────────────────────
function AgentCard({ agent, onView }: { agent: Agent; onView: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="group relative flex items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4 shadow-sm transition hover:border-primary/30 hover:shadow-elegant"
    >
      {/* Avatar */}
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full gradient-primary text-xl font-black text-primary-foreground shadow-glow">
        {agent.name[0]?.toUpperCase()}
      </span>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold truncate">{agent.name}</span>
          <span className="shrink-0 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-600">Agent</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
          <Mail className="h-3 w-3 shrink-0" /> {agent.email}
        </div>
        {agent.phone && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Phone className="h-3 w-3 shrink-0" /> {agent.phone}
          </div>
        )}
        <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
          <Calendar className="h-3 w-3" />
          Joined {new Date(agent.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </div>
      </div>

      {/* View button */}
      <button
        onClick={onView}
        className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-2 text-xs font-semibold hover:border-primary hover:text-primary transition"
      >
        <Eye className="h-3.5 w-3.5" /> View
      </button>
    </motion.div>
  );
}

// ── Main page ─────────────────────────────────────────────────
type AdminTab = "dashboard" | "agents" | "bulk-orders";

export function AgentsPage({ onNavigate }: { onNavigate?: (tab: AdminTab) => void }) {
  const { agents, loading, reload } = useAgents();
  const [showForm, setShowForm] = useState(false);
  const [viewing, setViewing] = useState<Agent | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function createAgent(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!form.name.trim() || !form.email.trim() || form.password.length < 6)
      return setErr("Name, email and password (min 6 chars) are required.");

    setSaving(true);
    try {
      const { data: signUpData, error: signUpError } = await adminClient.auth.admin.createUser({
        email: form.email.trim(),
        password: form.password,
        email_confirm: true,
        user_metadata: { full_name: form.name.trim() },
      });
      if (signUpError) throw new Error(signUpError.message);
      if (!signUpData.user) throw new Error("User creation failed.");

      const uid = signUpData.user.id;

      const { error: agentError } = await adminClient.from("delivery_agents").insert({
        id: uid,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        active: true,
      });
      if (agentError) throw new Error(agentError.message);

      await adminClient.from("profiles").upsert({
        id: uid,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        role: "delivery",
      }, { onConflict: "id" });

      setForm(EMPTY_FORM);
      setShowForm(false);
      reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create agent.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAgent(id: string) {
    await adminClient.from("delivery_agents").update({ active: false }).eq("id", id);
    await adminClient.from("profiles").update({ role: "customer" }).eq("id", id);
    reload();
  }

  return (
    <AdminShell activeTab="agents" onNavigate={onNavigate}>
      <section className="mx-auto max-w-4xl px-4 py-10 md:px-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-primary">Admin</div>
            <h1 className="font-[Fraunces] text-4xl font-black md:text-5xl">Delivery Agents</h1>
            <p className="mt-1 text-muted-foreground">
              {agents.length} active agent{agents.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => { setShowForm(true); setErr(null); }}
            className="inline-flex items-center gap-2 rounded-full gradient-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-elegant"
          >
            <Plus className="h-4 w-4" /> Add Agent
          </button>
        </div>

        {/* Agent list */}
        {loading ? (
          <div className="mt-10 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : agents.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border p-16 text-center text-sm text-muted-foreground">
            No delivery agents yet. Add one to get started.
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-3">
            <AnimatePresence>
              {agents.map((a) => (
                <AgentCard key={a.id} agent={a} onView={() => setViewing(a)} />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* View modal */}
        <AnimatePresence>
          {viewing && (
            <AgentModal
              agent={viewing}
              onClose={() => setViewing(null)}
              onDelete={(id) => { deleteAgent(id); setViewing(null); }}
            />
          )}
        </AnimatePresence>

        {/* Create agent modal */}
        <AnimatePresence>
          {showForm && (
            <div onClick={() => setShowForm(false)}
              className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
              <motion.div
                initial={{ y: 20, opacity: 0, scale: 0.97 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 20, opacity: 0, scale: 0.97 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-elegant"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-blue-500/10">
                      <Bike className="h-5 w-5 text-blue-600" />
                    </span>
                    <h3 className="font-[Fraunces] text-2xl font-bold">New Agent</h3>
                  </div>
                  <button onClick={() => setShowForm(false)}
                    className="grid h-8 w-8 place-items-center rounded-full hover:bg-accent transition">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={createAgent} className="space-y-3">
                  {[
                    { icon: User, placeholder: "Full name", field: "name", type: "text" },
                    { icon: Mail, placeholder: "Email address", field: "email", type: "email" },
                    { icon: Phone, placeholder: "Phone (optional)", field: "phone", type: "text" },
                    { icon: Lock, placeholder: "Temporary password (min 6 chars)", field: "password", type: "password" },
                  ].map(({ icon: Icon, placeholder, field, type }) => (
                    <label key={field} className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 focus-within:border-primary transition">
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <input
                        className="w-full bg-transparent text-sm outline-none"
                        type={type}
                        placeholder={placeholder}
                        value={(form as any)[field]}
                        onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                      />
                    </label>
                  ))}

                  <AnimatePresence>
                    {err && (
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
                        {err}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => setShowForm(false)}
                      className="flex-1 rounded-full border border-border py-2.5 text-sm font-semibold hover:bg-accent transition">
                      Cancel
                    </button>
                    <button type="submit" disabled={saving}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-full gradient-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      {saving ? "Creating…" : "Create Agent"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </section>
    </AdminShell>
  );
}
