import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { Login } from "@/pages/Login";
import { Dashboard } from "@/pages/Dashboard";
import { DeliveryDashboard } from "@/pages/DeliveryDashboard";
import { AgentsPage } from "@/pages/AgentsPage";
import { BulkOrdersPage } from "@/pages/BulkOrdersPage";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  return createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
const adminClient = getAdminClient();

type ActiveRole = "admin" | "delivery" | null;
type AdminTab = "dashboard" | "agents" | "bulk-orders";

function LoadingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-border border-t-primary" />
      <p className="text-sm text-muted-foreground">Loading SAM Portal…</p>
    </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const [activeRole, setActiveRole] = useState<ActiveRole>(null);
  const [adminTab, setAdminTab] = useState<AdminTab>("dashboard");
  const [pendingBulk, setPendingBulk] = useState(0);

  useEffect(() => {
    if (!loading) {
      if (user?.role === "admin") setActiveRole("admin");
      else if (user?.role === "delivery") setActiveRole("delivery");
      else setActiveRole(null);
    }
  }, [user, loading]);

  // Poll pending bulk orders count for badge
  useEffect(() => {
    if (activeRole !== "admin") return;
    const fetchPending = async () => {
      const { data } = await (adminClient.from("bulk_orders") as any)
        .select("id").eq("status", "Pending");
      setPendingBulk((data as any[])?.length ?? 0);
    };
    fetchPending();
    const ch = adminClient.channel("bulk-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "bulk_orders" }, fetchPending)
      .subscribe();
    return () => { adminClient.removeChannel(ch); };
  }, [activeRole]);

  if (loading) return <LoadingScreen />;

  return (
    <AnimatePresence mode="wait">
      {activeRole === "admin" ? (
        <motion.div key={`admin-${adminTab}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          {adminTab === "dashboard" && <Dashboard onNavigate={setAdminTab} pendingBulk={pendingBulk} />}
          {adminTab === "agents" && <AgentsPage onNavigate={setAdminTab} />}
          {adminTab === "bulk-orders" && <BulkOrdersPage onNavigate={setAdminTab} />}
        </motion.div>
      ) : activeRole === "delivery" ? (
        <motion.div key="delivery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <DeliveryDashboard />
        </motion.div>
      ) : (
        <motion.div key="login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <Login onSuccess={(role) => setActiveRole(role)} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function App() {
  return <AppContent />;
}
