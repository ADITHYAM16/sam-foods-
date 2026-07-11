import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  image?: string;
  veg?: boolean;
}

export type OrderStatus = "Placed" | "Preparing" | "Ready" | "Out for delivery" | "Delivered" | "Cancelled";

export interface Order {
  id: string;
  user_id?: string | null;
  customer: string;
  email?: string | null;
  room: string;
  delivery_lat?: number | null;
  delivery_lng?: number | null;
  delivery_time: string;
  items: CartItem[];
  subtotal: number;
  delivery_fee: number;
  gst: number;
  total: number;
  discount: number;
  status: OrderStatus;
  payment_method: "cod" | "gpay";
  payment_status: "pending" | "paid" | "failed";
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
  cancelled_at?: string | null;
  delivery_agent_id?: string | null;
  created_at: string;
}

export const STATUS_FLOW: OrderStatus[] = [
  "Placed",
  "Preparing",
  "Ready",
  "Out for delivery",
  "Delivered",
];

export interface OrderRequest {
  id: string;
  user_id?: string | null;
  customer: string;
  email?: string | null;
  room: string;
  delivery_lat?: number | null;
  delivery_lng?: number | null;
  delivery_time: string;
  items: CartItem[];
  subtotal: number;
  delivery_fee: number;
  gst: number;
  total: number;
  discount: number;
  payment_method: "cod" | "gpay";
  payment_status: "pending" | "paid" | "failed";
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
  status: "pending" | "accepted" | "denied";
  created_at: string;
}

export async function assignNearestAgent(orderId: string) {
  const { data: agents } = await (supabase.from("delivery_agents") as any)
    .select("id").eq("active", true);

  if (!agents || agents.length === 0) return;

  await (supabase.from("delivery_requests") as any)
    .update({ status: "denied" })
    .eq("order_id", orderId)
    .eq("status", "pending");

  const rows = (agents as { id: string }[]).map(a => ({
    order_id: orderId,
    agent_id: a.id,
    status: "pending",
  }));

  await (supabase.from("delivery_requests") as any).insert(rows);
}

export async function sendDeliveryRequestToNext(orderId: string, excludeAgentIds: string[]) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: agents } = await (supabase.from("delivery_agents") as any)
    .select("id").eq("active", true);

  const eligible = ((agents ?? []) as { id: string }[]).filter(a => !excludeAgentIds.includes(a.id));

  if (eligible.length === 0) {
    await (supabase.from("orders") as any)
      .update({ delivery_time: "⚠️ No agents available — manual assign needed" })
      .eq("id", orderId);
    return;
  }

  const counts: { id: string; count: number }[] = await Promise.all(
    eligible.map(async (a) => {
      const { count } = await (supabase.from("orders") as any)
        .select("id", { count: "exact", head: true })
        .eq("delivery_agent_id", a.id)
        .in("status", ["Ready", "Out for delivery"])
        .gte("created_at", todayStart.toISOString());
      return { id: a.id, count: count ?? 0 };
    })
  );

  const least = counts.sort((a, b) => a.count - b.count)[0];

  await (supabase.from("delivery_requests") as any)
    .update({ status: "denied" })
    .eq("order_id", orderId)
    .eq("status", "pending");

  await (supabase.from("delivery_requests") as any).insert({
    order_id: orderId,
    agent_id: least.id,
    status: "pending",
  });
}

export interface DeliveryRequest {
  id: string;
  order_id: string;
  agent_id: string;
  status: "pending" | "accepted" | "denied";
  created_at: string;
  order?: Order;
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  const { error } = await (supabase.from("orders") as any).update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function cancelOrder(id: string) {
  const { error } = await (supabase.from("orders") as any)
    .update({ status: "Cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export function useOrders(): Order[] {
  const [list, setList] = useState<Order[]>([]);

  useEffect(() => {
    const toOrder = (o: any): Order => ({ ...o, items: o.items as unknown as CartItem[] });

    const fetchOrders = async () => {
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false });
        if (!error && data) setList((data as any[]).map(toOrder));
      } catch { /* table may not exist */ }
    };

    const fetchById = async (id: string): Promise<Order | null> => {
      try {
        const { data } = await (supabase.from("orders") as any)
          .select("*").eq("id", id).single();
        return data ? toOrder(data) : null;
      } catch { return null; }
    };

    fetchOrders();

    const channel = supabase
      .channel("orders-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" },
        async ({ new: row }) => {
          const full = await fetchById((row as any).id);
          if (full) setList(prev => [full, ...prev.filter(o => o.id !== full.id)]);
        }
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" },
        async ({ new: row }) => {
          const full = await fetchById((row as any).id);
          if (full) setList(prev => prev.map(o => o.id === full.id ? full : o));
        }
      )
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "orders" },
        ({ old: row }) => setList(prev => prev.filter(o => o.id !== (row as any).id))
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return list;
}

export function useDeliveryOrders(agentId?: string | null): { orders: Order[]; loading: boolean; newAlert: Order | null; clearAlert: () => void } {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAlert, setNewAlert] = useState<Order | null>(null);
  const prevIds = useRef<Set<string>>(new Set());

  const toOrder = (o: any): Order => ({ ...o, items: o.items as unknown as CartItem[] });

  const fetchOrders = useCallback(async () => {
    if (!agentId) { setLoading(false); return; }
    try {
      const { data: accepted } = await (supabase.from("delivery_requests") as any)
        .select("order_id")
        .eq("agent_id", agentId)
        .eq("status", "accepted");

      if (!accepted || accepted.length === 0) { setOrders([]); return; }

      const orderIds = (accepted as { order_id: string }[]).map(r => r.order_id);

      const { data, error } = await (supabase.from("orders") as any)
        .select("*")
        .in("id", orderIds)
        .order("created_at", { ascending: false });

      if (!error && data) {
        const mapped = (data as any[]).map(toOrder);
        mapped.forEach((o: Order) => {
          if (o.status === "Ready" && !prevIds.current.has(o.id)) {
            setNewAlert(o);
          }
        });
        prevIds.current = new Set(mapped.map((o: Order) => o.id));
        setOrders(mapped);
      }
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    if (!agentId) { setLoading(false); return; }
    fetchOrders();

    const drChannel = supabase
      .channel(`dr-watch-${agentId}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "delivery_requests", filter: `agent_id=eq.${agentId}` },
        async ({ new: row }) => {
          const r = row as any;
          if (r.status === "denied") {
            setOrders(prev => prev.filter(x => x.id !== r.order_id));
          } else if (r.status === "accepted") {
            const { data: ord } = await (supabase.from("orders") as any)
              .select("*").eq("id", r.order_id).single();
            if (ord) {
              const o = toOrder(ord);
              setOrders(prev => prev.some(x => x.id === o.id) ? prev : [o, ...prev]);
              if (o.status === "Ready" && !prevIds.current.has(o.id)) {
                setNewAlert(o);
                prevIds.current = new Set([...prevIds.current, o.id]);
              }
            }
          }
        }
      )
      .subscribe();

    const ordersChannel = supabase
      .channel(`orders-watch-${agentId}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `delivery_agent_id=eq.${agentId}` },
        ({ new: row }) => {
          const o = toOrder(row);
          setOrders(prev => {
            if (!prev.some(x => x.id === o.id)) return prev;
            if (!(["Ready", "Out for delivery", "Delivered"] as string[]).includes(o.status)) {
              return prev.filter(x => x.id !== o.id);
            }
            return prev.map(x => x.id === o.id ? o : x);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(drChannel);
      supabase.removeChannel(ordersChannel);
    };
  }, [fetchOrders, agentId]);

  return { orders, loading, newAlert, clearAlert: () => setNewAlert(null) };
}
