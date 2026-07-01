import { supabase } from "@/integrations/supabase/client";

export interface PaymentRecord {
  order_id?: string;
  order_request_id?: string;
  user_id: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  amount: number;
  payment_method: "cod" | "gpay" | "phonepe" | "paytm" | "upi" | "card";
  payment_status?: "pending" | "paid" | "failed" | "refunded" | "cancelled";
  transaction_id?: string;
  upi_id?: string;
  payment_app?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  gateway_response?: Record<string, any>;
  notes?: string;
}

/**
 * Create a new payment record
 */
export async function createPaymentRecord(data: PaymentRecord) {
  const { data: payment, error } = await (supabase.from("payments") as any)
    .insert({
      order_id: data.order_id ?? null,
      order_request_id: data.order_request_id ?? null,
      user_id: data.user_id,
      customer_name: data.customer_name,
      customer_email: data.customer_email ?? null,
      customer_phone: data.customer_phone ?? null,
      amount: data.amount,
      payment_method: data.payment_method,
      payment_status: data.payment_status ?? "pending",
      transaction_id: data.transaction_id ?? null,
      upi_id: data.upi_id ?? null,
      payment_app: data.payment_app ?? null,
      razorpay_order_id: data.razorpay_order_id ?? null,
      razorpay_payment_id: data.razorpay_payment_id ?? null,
      razorpay_signature: data.razorpay_signature ?? null,
      gateway_response: data.gateway_response ?? null,
      notes: data.notes ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create payment record: ${error.message}`);
  return payment;
}

/**
 * Update payment status (typically called by admin after verifying payment)
 */
export async function updatePaymentStatus(
  paymentId: string,
  status: "pending" | "paid" | "failed" | "refunded" | "cancelled",
  options?: {
    transactionId?: string;
    verifiedBy?: string;
    notes?: string;
    paidAt?: Date;
  }
) {
  const updates: Record<string, any> = {
    payment_status: status,
  };

  if (options?.transactionId) updates.transaction_id = options.transactionId;
  if (options?.verifiedBy) updates.verified_by = options.verifiedBy;
  if (options?.notes) updates.notes = options.notes;
  if (status === "paid" && options?.paidAt) updates.paid_at = options.paidAt.toISOString();
  if (status === "paid" && !options?.paidAt) updates.paid_at = new Date().toISOString();
  if (status === "failed") updates.failed_at = new Date().toISOString();
  if (status === "refunded") updates.refunded_at = new Date().toISOString();

  const { data, error } = await (supabase.from("payments") as any)
    .update(updates)
    .eq("id", paymentId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update payment: ${error.message}`);
  return data;
}

/**
 * Get all payments for a specific order
 */
export async function getOrderPayments(orderId: string) {
  const { data, error } = await (supabase.from("payments") as any)
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch payments: ${error.message}`);
  return data ?? [];
}

/**
 * Get all payments for a specific user
 */
export async function getUserPayments(userId: string) {
  const { data, error } = await (supabase.from("payments") as any)
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch user payments: ${error.message}`);
  return data ?? [];
}

/**
 * Mark payment as verified by admin
 */
export async function verifyPayment(
  paymentId: string,
  adminUserId: string,
  transactionId?: string,
  notes?: string
) {
  return updatePaymentStatus(paymentId, "paid", {
    verifiedBy: adminUserId,
    transactionId,
    notes,
    paidAt: new Date(),
  });
}
