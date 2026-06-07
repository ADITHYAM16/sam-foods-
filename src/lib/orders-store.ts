import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CartItem } from "./cart-context";

export type OrderStatus = "Placed" | "Preparing" | "Ready" | "Out for delivery" | "Delivered" | "Cancelled";

export interface Order {
  id: string;
  user_id?: string | null;
  customer: string;
  email?: string | null;
  room: string;
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
  created_at: string;
}

export const STATUS_FLOW: OrderStatus[] = [
  "Placed",
  "Preparing",
  "Ready",
  "Out for delivery",
  "Delivered",
];

export async function placeOrder(o: {
  user_id?: string | null;
  customer: string;
  email?: string | null;
  room: string;
  deliveryTime: string;
  items: CartItem[];
  subtotal: number;
  delivery_fee: number;
  gst: number;
  total: number;
  discount: number;
  payment_method: "cod" | "gpay";
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
}): Promise<Order> {
  const { data, error } = await (supabase.from("orders") as any)
    .insert({
      user_id: o.user_id ?? null,
      customer: o.customer,
      email: o.email ?? null,
      room: o.room,
      delivery_time: o.deliveryTime,
      items: o.items as unknown as import("@/integrations/supabase/types").Json,
      subtotal: o.subtotal,
      delivery_fee: o.delivery_fee,
      gst: o.gst,
      total: o.total,
      discount: o.discount,
      status: "Placed",
      payment_method: o.payment_method,
      payment_status: o.payment_method === "gpay" ? "paid" : "pending",
      razorpay_order_id: o.razorpay_order_id ?? null,
      razorpay_payment_id: o.razorpay_payment_id ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
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
  if (error) throw new Error(error.message);
}

export async function advanceOrder(id: string) {
  const { data } = await (supabase.from("orders") as any).select("status").eq("id", id).single();
  if (!data) return;
  const i = STATUS_FLOW.indexOf((data as any).status as OrderStatus);
  const next = STATUS_FLOW[Math.min(i + 1, STATUS_FLOW.length - 1)];
  await updateOrderStatus(id, next);
}

export function useOrders(): Order[] {
  const [list, setList] = useState<Order[]>([]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false });
        if (!error && data) setList((data as any[]).map((o) => ({ ...o, items: o.items as unknown as CartItem[] })));
      } catch { /* table may not exist */ }
    };

    fetchOrders();

    const channel = supabase
      .channel("orders-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, fetchOrders)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return list;
}

export function useDeliveryOrders(): { orders: Order[]; loading: boolean; newAlert: Order | null; clearAlert: () => void } {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [newAlert, setNewAlert] = useState<Order | null>(null);
  const prevIds = useRef<Set<string>>(new Set());

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const fetch = useCallback(async () => {
    try {
      const { data, error } = await (supabase.from("orders") as any)
        .select("*")
        .in("status", ["Ready", "Out for delivery", "Delivered"])
        .gte("created_at", todayStart.toISOString())
        .order("created_at", { ascending: false });
      if (!error && data) {
        const mapped = (data as any[]).map((o) => ({ ...o, items: o.items as unknown as CartItem[] }));
        // detect newly Ready orders
        mapped.forEach((o) => {
          if (o.status === "Ready" && !prevIds.current.has(o.id)) {
            setNewAlert(o);
            try { new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg").play(); } catch {}
          }
        });
        prevIds.current = new Set(mapped.map((o) => o.id));
        setOrders(mapped);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const channel = supabase
      .channel("delivery-orders-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetch]);

  return { orders, loading, newAlert, clearAlert: () => setNewAlert(null) };
}

export function useMyOrders(userId: string | null | undefined): Order[] {
  const [list, setList] = useState<Order[]>([]);

  useEffect(() => {
    if (!userId) return;

    const fetchMyOrders = async () => {
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        if (!error && data) setList((data as any[]).map((o) => ({ ...o, items: o.items as unknown as CartItem[] })));
      } catch { /* table may not exist */ }
    };

    fetchMyOrders();

    const channel = supabase
      .channel(`orders-user-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${userId}` }, fetchMyOrders)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  return list;
}
