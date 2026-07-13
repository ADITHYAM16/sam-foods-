import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Login } from "@/pages/Login";
import { Dashboard } from "@/pages/Dashboard";
import { DeliveryDashboard } from "@/pages/DeliveryDashboard";
import { AgentsPage } from "@/pages/AgentsPage";
import { BulkOrdersPage } from "@/pages/BulkOrdersPage";
import { adminClient as supabase } from "@/lib/admin-client";

type AdminTab = "dashboard" | "agents" | "bulk-orders";

// Derive page from URL path — completely independent of shared localStorage session
function getPage(): "admin" | "delivery" {
  return window.location.pathname.startsWith("/delivery") ? "delivery" : "admin";
}

function AdminApp() {
  const { user, loading } = useAuth();
  const [adminTab, setAdminTab] = useState<AdminTab>("dashboard");
  const [pendingBulk, setPendingBulk] = useState(0);
  const roleRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;
    roleRef.current = user.role;
    const titles: Record<AdminTab, string> = {
      dashboard: "Admin Dashboard — SAM Foods",
      agents: "Delivery Agents — SAM Foods",
      "bulk-orders": "Bulk Orders — SAM Foods",
    };
    document.title = titles[adminTab];
  }, [user, adminTab]);

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

  if (loading) return null;
  if (!user) return <Login forPage="admin" />;
  // If a delivery agent somehow lands on /admin, redirect them
  if (user.role === "delivery") {
    window.location.href = "/delivery";
    return null;
  }

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

function DeliveryApp() {
  const { user, loading } = useAuth();

  useEffect(() => {
    document.title = "Delivery Agent — SAM Foods";
  }, []);

  if (loading) return null;
  if (!user) return <Login forPage="delivery" />;
  // If admin somehow lands on /delivery, redirect them
  if (user.role === "admin") {
    window.location.href = "/";
    return null;
  }

  return <DeliveryDashboard />;
}

export default function App() {
  const page = getPage();
  return page === "delivery" ? <DeliveryApp /> : <AdminApp />;
}
