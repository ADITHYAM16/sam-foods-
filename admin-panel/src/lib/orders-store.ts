import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { adminClient } from "@/lib/admin-client";
import type { FoodItem } from "./menu-data";

export interface CartItem extends FoodItem {
  qty: number;
}

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
  payment_method?: "cod" | "gpay";
  payment_status?: "pending" | "paid" | "failed";
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
}): Promise<Order> {
  const { data, error } = await supabase
    .from("orders")
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
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
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
  const { error } = await (supabase.from("orders") as any).update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function advanceOrder(id: string) {
  const { data } = await supabase.from("orders").select("status").eq("id", id).single();
  if (!data) return;
  const i = STATUS_FLOW.indexOf(data.status as OrderStatus);
  const next = STATUS_FLOW[Math.min(i + 1, STATUS_FLOW.length - 1)];
  await updateOrderStatus(id, next);
}

export function useOrders(): Order[] {
  const [list, setList] = useState<Order[]>([]);

  useEffect(() => {
    const toOrder = (o: any): Order => ({ ...o, items: o.items as unknown as CartItem[] });

    (supabase.from("orders") as any)
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }: any) => {
        if (data) setList(data.map(toOrder));
      });

    const channel = supabase
      .channel("orders-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" },
        ({ new: row }) => setList(prev => [toOrder(row), ...prev])
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" },
        ({ new: row }) => setList(prev => prev.map(o => o.id === (row as any).id ? toOrder(row) : o))
      )
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "orders" },
        ({ old: row }) => setList(prev => prev.filter(o => o.id !== (row as any).id))
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return list;
}

export function useMyOrders(userId: string | null | undefined): Order[] {
  const [list, setList] = useState<Order[]>([]);

  useEffect(() => {
    if (!userId) return;
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
  }, [userId]);

  return list;
}
