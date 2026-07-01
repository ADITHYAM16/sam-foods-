<<<<<<< HEAD
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { adminClient } from "@/lib/admin-client";
import type { FoodItem } from "./menu-data";

export interface CartItem extends FoodItem {
  qty: number;
}
=======
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CartItem } from "./cart-context";
import { playBeep } from "./beep";
>>>>>>> 00a018a6c6bfc2b51ad8c29883f26fc69c76f74b

export type OrderStatus = "Placed" | "Preparing" | "Ready" | "Out for delivery" | "Delivered" | "Cancelled";

export interface Order {
  id: string;
  user_id?: string | null;
  customer: string;
  email?: string | null;
  room: string;
<<<<<<< HEAD
=======
  delivery_lat?: number | null;
  delivery_lng?: number | null;
>>>>>>> 00a018a6c6bfc2b51ad8c29883f26fc69c76f74b
  delivery_time: string;
  items: CartItem[];
  subtotal: number;
  delivery_fee: number;
  gst: number;
  total: number;
  discount: number;
  status: OrderStatus;
<<<<<<< HEAD
  payment_method?: "cod" | "gpay";
  payment_status?: "pending" | "paid" | "failed";
=======
  payment_method: "cod" | "gpay";
  payment_status: "pending" | "paid" | "failed";
>>>>>>> 00a018a6c6bfc2b51ad8c29883f26fc69c76f74b
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

<<<<<<< HEAD
=======
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

// Submit order request — awaits admin approval
export async function submitOrderRequest(o: Parameters<typeof placeOrder>[0]): Promise<OrderRequest> {
  const payload = {
    user_id: o.user_id ?? null,
    customer: o.customer,
    email: o.email ?? null,
    room: o.room,
    delivery_lat: o.delivery_lat ?? null,
    delivery_lng: o.delivery_lng ?? null,
    delivery_time: o.deliveryTime,
    items: o.items as unknown as any,
    subtotal: o.subtotal,
    delivery_fee: o.delivery_fee,
    gst: o.gst,
    total: o.total,
    discount: o.discount,
    payment_method: o.payment_method,
    payment_status: "pending",
    razorpay_order_id: o.razorpay_order_id ?? null,
    razorpay_payment_id: o.razorpay_payment_id ?? null,
    status: "pending",
  };

  const insertedAt = new Date().toISOString();

  const { data, error } = await (supabase.from("order_requests") as any)
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(error.message);

  // RLS may return null data after insert — fetch the row we just inserted
  // using a tight timestamp window (last 10s) so we never pick up an old request
  if (!data) {
    const since = new Date(Date.now() - 10_000).toISOString();
    const { data: fetched, error: fetchErr } = await (supabase.from("order_requests") as any)
      .select("*")
      .eq("user_id", payload.user_id)
      .eq("status", "pending")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (fetchErr || !fetched) throw new Error("Failed to retrieve your order request. Please try again.");
    return { ...fetched, items: (fetched as any).items as CartItem[] } as OrderRequest;
  }

  return { ...data, items: (data as any).items as CartItem[] } as OrderRequest;
}

// Send delivery request to ALL active agents simultaneously
export async function assignNearestAgent(orderId: string) {
  const { data: agents } = await (supabase.from("delivery_agents") as any)
    .select("id").eq("active", true);

  if (!agents || agents.length === 0) return;

  // Cancel any stale pending requests for this order first
  await (supabase.from("delivery_requests") as any)
    .update({ status: "denied" })
    .eq("order_id", orderId)
    .eq("status", "pending");

  // Insert a pending request for every active agent at once
  const rows = (agents as { id: string }[]).map(a => ({
    order_id: orderId,
    agent_id: a.id,
    status: "pending",
  }));

  await (supabase.from("delivery_requests") as any).insert(rows);
}

// Kept for deny-cascade: when agent denies, send to next eligible agent.
// If NO eligible agents remain, flag the order with a note so admin can act.
export async function sendDeliveryRequestToNext(orderId: string, excludeAgentIds: string[]) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: agents } = await (supabase.from("delivery_agents") as any)
    .select("id").eq("active", true);

  const eligible = ((agents ?? []) as { id: string }[]).filter(a => !excludeAgentIds.includes(a.id));

  // ── No agents left: write a note into delivery_time so admin sees it ──
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

export function useDeliveryRequests(agentId: string | null | undefined): {
  request: DeliveryRequest | null;
  order: Order | null;
} {
  const [request, setRequest] = useState<DeliveryRequest | null>(null);
  const [order, setOrder] = useState<Order | null>(null);

  const clearBoth = () => { setRequest(null); setOrder(null); };

  // Fetch order for a request — retries up to 3 times with 800ms delay
  // (RLS policy for pending orders may take a moment to apply after insert)
  const fetchOrder = useCallback(async (orderId: string, attempt = 0): Promise<Order | null> => {
    const { data: ord } = await (supabase.from("orders") as any)
      .select("*").eq("id", orderId).single();
    if (ord) return { ...ord, items: ord.items as unknown as CartItem[] };
    if (attempt < 3) {
      await new Promise(r => setTimeout(r, 800));
      return fetchOrder(orderId, attempt + 1);
    }
    return null;
  }, []);

  useEffect(() => {
    if (!agentId) return;

    const loadPending = async () => {
      const { data } = await (supabase.from("delivery_requests") as any)
        .select("*")
        .eq("agent_id", agentId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (data) {
        setRequest(data as DeliveryRequest);
        const ord = await fetchOrder((data as any).order_id);
        if (ord) setOrder(ord);
      } else {
        clearBoth();
      }
    };

    loadPending();

    const ch = supabase.channel(`delivery-req-${agentId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "delivery_requests", filter: `agent_id=eq.${agentId}` },
        async ({ new: row }) => {
          const req = row as any;
          if (req.status !== "pending") return;
          setRequest(prev => prev ?? (req as DeliveryRequest));
          const ord = await fetchOrder(req.order_id);
          if (ord) setOrder(prev => prev ?? ord);
        }
      )
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "delivery_requests", filter: `agent_id=eq.${agentId}` },
        ({ new: row }) => {
          if ((row as any).status !== "pending") {
            setRequest(prev => {
              if (prev?.id === (row as any).id) { setOrder(null); return null; }
              return prev;
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [agentId, fetchOrder]);

  return { request, order };
}

export async function respondToDeliveryRequest(
  requestId: string,
  orderId: string,
  agentId: string,
  accept: boolean,
  deniedSoFar: string[]
) {
  if (accept) {
    // Step 1: deny all other pending requests for this order first
    await (supabase.from("delivery_requests") as any)
      .update({ status: "denied" })
      .eq("order_id", orderId)
      .eq("status", "pending")
      .neq("id", requestId);

    // Step 2: mark this request accepted
    const { error } = await (supabase.from("delivery_requests") as any)
      .update({ status: "accepted" }).eq("id", requestId);

    // If already denied (another agent was faster), bail out
    if (error) return;

    // Step 3: assign this agent to the order
    await (supabase.from("orders") as any)
      .update({ delivery_agent_id: agentId }).eq("id", orderId);
  } else {
    await (supabase.from("delivery_requests") as any)
      .update({ status: "denied" }).eq("id", requestId);
    const { data: remaining } = await (supabase.from("delivery_requests") as any)
      .select("id")
      .eq("order_id", orderId)
      .eq("status", "pending");
    if (!remaining || remaining.length === 0) {
      await sendDeliveryRequestToNext(orderId, [...deniedSoFar, agentId]);
    }
  }
}

>>>>>>> 00a018a6c6bfc2b51ad8c29883f26fc69c76f74b
export async function placeOrder(o: {
  user_id?: string | null;
  customer: string;
  email?: string | null;
  room: string;
<<<<<<< HEAD
=======
  delivery_lat?: number | null;
  delivery_lng?: number | null;
>>>>>>> 00a018a6c6bfc2b51ad8c29883f26fc69c76f74b
  deliveryTime: string;
  items: CartItem[];
  subtotal: number;
  delivery_fee: number;
  gst: number;
  total: number;
  discount: number;
<<<<<<< HEAD
}): Promise<Order> {
  const { data, error } = await supabase
    .from("orders")
=======
  payment_method: "cod" | "gpay";
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
}): Promise<Order> {
  const { data, error } = await (supabase.from("orders") as any)
>>>>>>> 00a018a6c6bfc2b51ad8c29883f26fc69c76f74b
    .insert({
      user_id: o.user_id ?? null,
      customer: o.customer,
      email: o.email ?? null,
      room: o.room,
<<<<<<< HEAD
=======
      delivery_lat: o.delivery_lat ?? null,
      delivery_lng: o.delivery_lng ?? null,
>>>>>>> 00a018a6c6bfc2b51ad8c29883f26fc69c76f74b
      delivery_time: o.deliveryTime,
      items: o.items as unknown as import("@/integrations/supabase/types").Json,
      subtotal: o.subtotal,
      delivery_fee: o.delivery_fee,
      gst: o.gst,
      total: o.total,
      discount: o.discount,
      status: "Placed",
<<<<<<< HEAD
=======
      payment_method: o.payment_method,
      payment_status: "pending",
      razorpay_order_id: o.razorpay_order_id ?? null,
      razorpay_payment_id: o.razorpay_payment_id ?? null,
>>>>>>> 00a018a6c6bfc2b51ad8c29883f26fc69c76f74b
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
<<<<<<< HEAD
  return { ...data, items: data.items as unknown as CartItem[], delivery_time: data.delivery_time };
}

// Send delivery request to ALL active agents simultaneously
// Returns error string if something goes wrong, null on success
export async function assignNearestAgent(orderId: string): Promise<string | null> {
  const { data: agents, error: agentsError } = await (adminClient.from("delivery_agents") as any)
    .select("id").eq("active", true);

  if (agentsError) return `Failed to fetch agents: ${agentsError.message}`;
  if (!agents || agents.length === 0) return "No active delivery agents found. Please add agents in the Agents tab.";

  await (adminClient.from("delivery_requests") as any)
    .update({ status: "denied" })
    .eq("order_id", orderId)
    .eq("status", "pending");

  const rows = (agents as { id: string }[]).map(a => ({
    order_id: orderId,
    agent_id: a.id,
    status: "pending",
  }));

  const { error: insertError } = await (adminClient.from("delivery_requests") as any).insert(rows);
  if (insertError) return `Failed to send delivery request: ${insertError.message}`;

  return null;
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  const { error } = await (adminClient.from("orders") as any).update({ status }).eq("id", id);
=======
  return { ...data, items: (data as any).items as unknown as CartItem[], delivery_time: (data as any).delivery_time } as Order;
}

export async function cancelOrder(id: string) {
  const { error } = await (supabase.from("orders") as any)
    .update({ status: "Cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  const { error } = await (supabase.from("orders") as any).update({ status }).eq("id", id);
>>>>>>> 00a018a6c6bfc2b51ad8c29883f26fc69c76f74b
  if (error) throw new Error(error.message);
}

export async function advanceOrder(id: string) {
<<<<<<< HEAD
  const { data } = await (adminClient.from("orders") as any).select("status").eq("id", id).single();
=======
  const { data } = await (supabase.from("orders") as any).select("status").eq("id", id).single();
>>>>>>> 00a018a6c6bfc2b51ad8c29883f26fc69c76f74b
  if (!data) return;
  const i = STATUS_FLOW.indexOf((data as any).status as OrderStatus);
  const next = STATUS_FLOW[Math.min(i + 1, STATUS_FLOW.length - 1)];
  await updateOrderStatus(id, next);
}

export function useOrders(): Order[] {
  const [list, setList] = useState<Order[]>([]);

  useEffect(() => {
    const toOrder = (o: any): Order => ({ ...o, items: o.items as unknown as CartItem[] });

<<<<<<< HEAD
    // Use adminClient to bypass RLS for the initial fetch
    (adminClient.from("orders") as any)
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }: any) => {
        if (data) setList(data.map(toOrder));
      });
=======
    const fetchOrders = async () => {
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false });
        if (!error && data) setList((data as any[]).map(toOrder));
      } catch { /* table may not exist */ }
    };
>>>>>>> 00a018a6c6bfc2b51ad8c29883f26fc69c76f74b

    // Fetch full order by id — realtime payloads truncate large JSONB fields
    const fetchById = async (id: string): Promise<Order | null> => {
      try {
<<<<<<< HEAD
        const { data } = await (adminClient.from("orders") as any)
=======
        const { data } = await (supabase.from("orders") as any)
>>>>>>> 00a018a6c6bfc2b51ad8c29883f26fc69c76f74b
          .select("*").eq("id", id).single();
        return data ? toOrder(data) : null;
      } catch { return null; }
    };

<<<<<<< HEAD
    // Use anon supabase for realtime — service role cannot receive postgres_changes
=======
    fetchOrders();

>>>>>>> 00a018a6c6bfc2b51ad8c29883f26fc69c76f74b
    const channel = supabase
      .channel("orders-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" },
        async ({ new: row }) => {
<<<<<<< HEAD
=======
          // Always re-fetch on INSERT — realtime payload may truncate items JSONB
>>>>>>> 00a018a6c6bfc2b51ad8c29883f26fc69c76f74b
          const full = await fetchById((row as any).id);
          if (full) setList(prev => [full, ...prev.filter(o => o.id !== full.id)]);
        }
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" },
        async ({ new: row }) => {
<<<<<<< HEAD
          const full = await fetchById((row as any).id);
          if (!full) return;
          setList(prev => {
            if (prev.some(o => o.id === full.id)) return prev.map(o => o.id === full.id ? full : o);
            return [full, ...prev];
          });
=======
          // Always re-fetch on UPDATE — ensures delivery_time, items, status all current
          const full = await fetchById((row as any).id);
          if (full) setList(prev => prev.map(o => o.id === full.id ? full : o));
>>>>>>> 00a018a6c6bfc2b51ad8c29883f26fc69c76f74b
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

<<<<<<< HEAD
=======
export function useDeliveryOrders(agentId?: string | null): { orders: Order[]; loading: boolean; newAlert: Order | null; clearAlert: () => void } {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAlert, setNewAlert] = useState<Order | null>(null);
  const prevIds = useRef<Set<string>>(new Set());

  const toOrder = (o: any): Order => ({ ...o, items: o.items as unknown as CartItem[] });

  // Fetch ALL orders this agent has accepted (no date cap — enables full history)
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
            playBeep("delivery");
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

    // Watch delivery_requests for this agent:
    // - accepted => add order to list
    // - denied   => remove order from list immediately
    const drChannel = supabase
      .channel(`dr-watch-${agentId}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "delivery_requests", filter: `agent_id=eq.${agentId}` },
        async ({ new: row }) => {
          const r = row as any;
          if (r.status === "denied") {
            // Remove from list immediately — no questions asked
            setOrders(prev => prev.filter(x => x.id !== r.order_id));
          } else if (r.status === "accepted") {
            // Fetch and add this order
            const { data: ord } = await (supabase.from("orders") as any)
              .select("*").eq("id", r.order_id).single();
            if (ord) {
              const o = toOrder(ord);
              setOrders(prev => prev.some(x => x.id === o.id) ? prev : [o, ...prev]);
              if (o.status === "Ready" && !prevIds.current.has(o.id)) {
                setNewAlert(o);
                prevIds.current = new Set([...prevIds.current, o.id]);
                playBeep("delivery");
              }
            }
          }
        }
      )
      .subscribe();

    // Watch order status updates for orders already in the list
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

>>>>>>> 00a018a6c6bfc2b51ad8c29883f26fc69c76f74b
export function useMyOrders(userId: string | null | undefined): Order[] {
  const [list, setList] = useState<Order[]>([]);

  useEffect(() => {
    if (!userId) return;
<<<<<<< HEAD
    supabase
      .from("orders")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setList(data.map((o) => ({ ...o, items: o.items as unknown as CartItem[] })));
      });

    const channel = supabase
      .channel(`orders-user-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${userId}` }, () => {
        supabase
          .from("orders")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .then(({ data }) => {
            if (data) setList(data.map((o) => ({ ...o, items: o.items as unknown as CartItem[] })));
          });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
=======

    const toOrder = (o: any): Order => ({ ...o, items: o.items as unknown as CartItem[] });

    const fetchMyOrders = async () => {
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        if (!error && data) setList(data.map(toOrder));
      } catch { /* table may not exist */ }
    };

    fetchMyOrders();

    const onVisible = () => { if (!document.hidden) fetchMyOrders(); };
    document.addEventListener("visibilitychange", onVisible);

    // Fetch full order by id — realtime payloads truncate large JSONB fields (items)
    const fetchById = async (id: string): Promise<Order | null> => {
      try {
        const { data } = await (supabase.from("orders") as any)
          .select("*").eq("id", id).single();
        return data ? toOrder(data) : null;
      } catch { return null; }
    };

    const channel = supabase
      .channel(`orders-user-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders", filter: `user_id=eq.${userId}` },
        async ({ new: row }) => {
          const full = await fetchById((row as any).id);
          if (full) setList(prev => [full, ...prev.filter(o => o.id !== full.id)]);
        }
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `user_id=eq.${userId}` },
        async ({ new: row }) => {
          const full = await fetchById((row as any).id);
          if (full) setList(prev => prev.map(o => o.id === full.id ? full : o));
        }
      )
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "orders", filter: `user_id=eq.${userId}` },
        ({ old: row }) => setList(prev => prev.filter(o => o.id !== (row as any).id))
      )
      .subscribe();

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
>>>>>>> 00a018a6c6bfc2b51ad8c29883f26fc69c76f74b
  }, [userId]);

  return list;
}
