import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Login } from "@/pages/Login";
import { Dashboard } from "@/pages/Dashboard";
import { DeliveryDashboard } from "@/pages/DeliveryDashboard";
import { AgentsPage } from "@/pages/AgentsPage";
import { BulkOrdersPage } from "@/pages/BulkOrdersPage";
import { adminClient } from "@/lib/admin-client";

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
  const [adminTab, setAdminTab] = useState<AdminTab>("dashboard");
  const [pendingBulk, setPendingBulk] = useState(0);

  const titleSet = useRef(false);
  const roleRef = useRef<string | null>(null);

  // Set title once when this tab's user first resolves — lock it in
  useEffect(() => {
    if (!user || titleSet.current) return;
    titleSet.current = true;
    roleRef.current = user.role;
    document.title = user.role === "delivery"
      ? "Delivery Agent — SAM Foods"
      : "Admin Dashboard — SAM Foods";
  }, [user]);

  // Only update title on admin tab navigation — adminTab is local state,
  // never changed by other tabs, so this is safe
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
      const { data } = await (adminClient.from("bulk_orders") as any)
        .select("id").eq("status", "Pending");
      setPendingBulk((data as any[])?.length ?? 0);
    };
    fetchPending();
    const ch = adminClient.channel("bulk-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "bulk_orders" }, fetchPending)
      .subscribe();
    return () => { adminClient.removeChannel(ch); };
  }, [user?.role]);

  if (loading) return <LoadingScreen />;

  if (!user) return <Login />;

  if (user.role === "delivery") return <DeliveryDashboard />;

  // Admin — keep all tabs mounted, show/hide with CSS so data never reloads on tab switch
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
