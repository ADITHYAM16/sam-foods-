import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import { Login } from "@/pages/Login";
import { Dashboard } from "@/pages/Dashboard";
import { DeliveryDashboard } from "@/pages/DeliveryDashboard";
import { AgentsPage } from "@/pages/AgentsPage";

type ActiveRole = "admin" | "delivery" | null;
type AdminTab = "dashboard" | "agents";

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

  useEffect(() => {
    if (!loading) {
      if (user?.role === "admin") setActiveRole("admin");
      else if (user?.role === "delivery") setActiveRole("delivery");
      else setActiveRole(null);
    }
  }, [user, loading]);

  if (loading) return <LoadingScreen />;

  return (
    <AnimatePresence mode="wait">
      {activeRole === "admin" ? (
        <motion.div key={`admin-${adminTab}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          {adminTab === "dashboard" && <Dashboard onNavigate={setAdminTab} />}
          {adminTab === "agents" && <AgentsPage onNavigate={setAdminTab} />}
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
