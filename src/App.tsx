import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Login } from "@/pages/Login";
import { Dashboard } from "@/pages/Dashboard";
import { DeliveryDashboard } from "@/pages/DeliveryDashboard";
import { AgentsPage } from "@/pages/AgentsPage";
import { BulkOrdersPage } from "@/pages/BulkOrdersPage";
import { supabase } from "@/integrations/supabase/client";

type AdminTab = "dashboard" | "agents" | "bulk-orders";

function AppContent() {
  const { user, loading } = useAuth();
  const [adminTab, setAdminTab] = useState<AdminTab>("dashboard");
  const [pendingBulk, setPendingBulk] = useState(0);

  const titleSet = useRef(false);
  const roleRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user || titleSet.current) return;
    titleSet.current = true;
    roleRef.current = user.role;
    document.title = user.role === "delivery"
      ? "Delivery Agent — SAM Foods"
      : "Admin Dashboard — SAM Foods";
  }, [user]);

  useEffect(() => {
    if (roleRef.current !== "admin") return;
    const titles: Record<AdminTab, string> = {
      "dashboard": "Admin Dashboard — SAM Foods",
      "agents": "Delivery Agents — SAM Foods",
      "bulk-orders": "Bulk Orders — SAM Foods",
    };
    document.title = titles[adminTab];
  }, [adminTab]);

  useEffect(() => {
    if (user?.role !== "admin") return;
    const fetchPending = async () => {
      const { data } = await (supabase.from("bulk_orders") as any)
        .select("id").eq("status", "Pending");
      setPendingBulk((data as any[])?.length ?? 0);
    };
    fetchPending();
    const ch = supabase.channel("bulk-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "bulk_orders" }, fetchPending)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.role]);

  // Still resolving — show nothing (avoids flash to Login then Dashboard)
  if (loading) return null;

  if (!user) return <Login />;

  if (user.role === "delivery") return <DeliveryDashboard />;

  return (
    <>
      <div style={{ display: adminTab === "dashboard" ? undefined : "none" }}>
        <Dashboard onNavigate={setAdminTab} pendingBulk={pendingBulk} />
      </div>
      <div style={{ display: adminTab === "agents" ? undefined : "none" }}>
        <AgentsPage onNavigate={setAdminTab} />
      </div>
      <div style={{ display: adminTab === "bulk-orders" ? undefined : "none" }}>
        <BulkOrdersPage onNavigate={setAdminTab} />
      </div>
    </>
  );
}

export default function App() {
  return <AppContent />;
}
