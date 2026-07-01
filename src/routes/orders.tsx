import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Package, ChefHat, Bike, CheckCircle2, PackageCheck, Ban, Loader2, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";
import { SiteShell } from "@/components/site/SiteShell";
import { useAuth } from "@/lib/auth-context";
import { useMyOrders } from "@/lib/orders-store";
import type { OrderStatus } from "@/lib/orders-store";
import { useLanguage } from "@/lib/lang-context";

export const Route = createFileRoute("/orders")({
  component: OrdersPage,
  head: () => ({ meta: [{ title: "My Orders — SAM Foods" }] }),
});

const STATUS_COLOR: Record<string, string> = {
  Placed: "bg-violet-500/10 text-violet-600",
  Preparing: "bg-amber-500/10 text-amber-600",
  Ready: "bg-blue-500/10 text-blue-600",
  "Out for delivery": "bg-blue-600/10 text-blue-700",
  Delivered: "bg-emerald-600/10 text-emerald-600",
  Cancelled: "bg-destructive/10 text-destructive",
};

const STATUS_ICON: Record<string, React.ElementType> = {
  Placed: Package,
  Preparing: ChefHat,
  Ready: PackageCheck,
  "Out for delivery": Bike,
  Delivered: CheckCircle2,
  Cancelled: Ban,
};

function OrdersPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { cancelled?: string };
  const rawOrders = useMyOrders(user?.id);
  const { t } = useLanguage();
  const [filter, setFilter] = useState<OrderStatus | "All">("All");

  // Optimistically mark a just-cancelled GPay order as Cancelled
  // so it shows red immediately without waiting for DB round-trip
  const orders = useMemo(() => {
    if (!search.cancelled) return rawOrders;
    return rawOrders.map(o =>
      o.id === search.cancelled ? { ...o, status: "Cancelled" as OrderStatus } : o
    );
  }, [rawOrders, search.cancelled]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login", search: { redirect: "/orders" } as any });
  }, [user, loading, navigate]);

  const filtered = filter === "All" ? orders : orders.filter(o => o.status === filter);
  const activeOrders = orders.filter(o => !["Delivered", "Cancelled"].includes(o.status));

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SiteShell>
      <section className="mx-auto max-w-4xl px-4 py-12 md:px-6">
        <div className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-primary">{t("Account")}</div>
        <h1 className="font-[Fraunces] text-3xl font-black md:text-5xl">{t("My Orders")}</h1>
        <p className="mt-1 text-muted-foreground">{orders.length} {orders.length !== 1 ? t("orders total") : t("order total")}</p>

        {/* Active orders banner */}
        {activeOrders.length > 0 && (
          <div className="mt-6 flex items-center justify-between rounded-2xl border border-amber-400/40 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
              </span>
              <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                {activeOrders.length} {activeOrders.length !== 1 ? t("active orders in progress") : t("active order in progress")}
              </span>
            </div>
            <Link
              to="/track"
              search={{ orderId: activeOrders[0].id } as any}
              className="rounded-full gradient-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
            >
              {t("Track →")}
            </Link>
          </div>
        )}

        {/* Filter tabs */}
        <div className="mt-6 flex flex-wrap gap-2">
          {(["All", "Placed", "Preparing", "Delivered", "Cancelled"] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                filter === s
                  ? "gradient-primary text-primary-foreground shadow-sm"
                  : "border border-border bg-background hover:bg-accent"
              }`}
            >
              {t(s)} {s === "All" ? `(${orders.length})` : `(${orders.filter(o => o.status === s).length})`}
            </button>
          ))}
        </div>

        {/* Order list */}
        <div className="mt-6 space-y-3">
          {filtered.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-border p-16 text-center">
              <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-lg font-semibold">{t("No orders here yet.")}</p>
              <Link to="/" className="mt-4 inline-flex rounded-full gradient-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground">
                {t("Browse menu")}
              </Link>
            </div>
          ) : (
            filtered.map((o, i) => {
              const Icon = STATUS_ICON[o.status] ?? Package;
              const isActive = !["Delivered", "Cancelled"].includes(o.status);
              return (
                <motion.div
                  key={o.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`rounded-2xl border p-4 transition hover:shadow-sm ${
                    o.status === "Cancelled"
                      ? "border-destructive/40 bg-destructive/5"
                      : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${STATUS_COLOR[o.status] ?? "bg-muted"}`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">{o.id.slice(0, 8).toUpperCase()}</span>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLOR[o.status] ?? "bg-muted"}`}>
                            {o.status}
                          </span>
                          {isActive && (
                            <span className="relative flex h-2 w-2">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
                              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {o.items.map(it => `${it.name} ×${it.qty}`).join(", ")}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {t("Deliver to:")} <span className="font-medium text-foreground">{o.room}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="text-base font-bold">₹{o.total}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(o.created_at).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </div>
                      {isActive ? (
                        <Link
                          to="/track"
                          search={{ orderId: o.id } as any}
                          className="rounded-full gradient-primary px-3 py-1.5 text-xs font-bold text-primary-foreground"
                        >
                          {t("Track order →")}
                        </Link>
                      ) : o.status === "Delivered" ? (
                        <Link
                          to="/"
                          className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-accent transition"
                        >
                          {t("Reorder")}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </section>
    </SiteShell>
  );
}
