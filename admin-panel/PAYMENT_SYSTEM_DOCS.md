# 💳 Payment Tracking System - Complete Implementation

## ✅ What Was Built

### 1. **Database Table: `payments`**
Location: `supabase/migrations/029_payments_table.sql`

Comprehensive payment tracking with:
- ✅ Order references (order_id, order_request_id)
- ✅ Customer details (user_id, name, email, phone)
- ✅ Payment details (amount, method, status)
- ✅ Transaction details (transaction_id, UPI ID, payment app)
- ✅ Gateway details (Razorpay order/payment/signature IDs)
- ✅ Timestamps (initiated, paid, failed, refunded)
- ✅ Admin verification (verified_by, notes, screenshot URL)

### 2. **Payment Fields**

| Field | Type | Description |
|-------|------|-------------|
| `id` | uuid | Primary key |
| `order_id` | text | Reference to orders table |
| `order_request_id` | uuid | Reference to order_requests |
| `user_id` | uuid | Customer who made payment |
| `customer_name` | text | Customer full name |
| `customer_email` | text | Customer email |
| `customer_phone` | text | Customer phone |
| `amount` | numeric | Payment amount in ₹ |
| `payment_method` | text | cod, gpay, phonepe, paytm, upi, card |
| `payment_status` | text | pending, paid, failed, refunded, cancelled |
| `transaction_id` | text | UPI transaction ID / reference number |
| `upi_id` | text | Customer's UPI ID (e.g., name@paytm) |
| `payment_app` | text | GPay, PhonePe, Paytm, etc. |
| `razorpay_order_id` | text | Razorpay order reference |
| `razorpay_payment_id` | text | Razorpay payment ID |
| `razorpay_signature` | text | Razorpay signature for verification |
| `gateway_response` | jsonb | Full gateway response (for debugging) |
| `initiated_at` | timestamptz | When payment was initiated |
| `paid_at` | timestamptz | When payment was confirmed |
| `failed_at` | timestamptz | When payment failed |
| `refunded_at` | timestamptz | When payment was refunded |
| `notes` | text | Admin notes about payment |
| `verified_by` | uuid | Admin who verified payment |
| `verification_screenshot` | text | URL to payment proof screenshot |
| `created_at` | timestamptz | Record creation time |
| `updated_at` | timestamptz | Last update time (auto) |

### 3. **TypeScript Utility Functions**
Location: `src/lib/payment-store.ts`

```typescript
// Create payment record
await createPaymentRecord({
  order_id: "SAM-1234-56",
  user_id: user.id,
  customer_name: "John Doe",
  amount: 450,
  payment_method: "gpay",
  payment_status: "pending"
});

// Update payment status
await updatePaymentStatus(paymentId, "paid", {
  transactionId: "TXN123456789",
  verifiedBy: adminId,
  notes: "Payment verified via screenshot",
  paidAt: new Date()
});

// Verify payment (admin action)
await verifyPayment(paymentId, adminId, "TXN123", "Payment confirmed");

// Get all payments for an order
const payments = await getOrderPayments(orderId);

// Get all payments for a user
const userPayments = await getUserPayments(userId);
```

### 4. **Integration with Cart**
- ✅ Payment record created when order is placed (GPay)
- ✅ Payment record created for COD orders too
- ✅ Payment status tracked throughout lifecycle
- ✅ Linked to order_request_id initially
- ✅ Can be updated with order_id once accepted

### 5. **Database Features**

**Indexes for Performance:**
- `idx_payments_order_id` - Fast lookup by order
- `idx_payments_user_id` - Fast lookup by user
- `idx_payments_status` - Filter by status
- `idx_payments_created_at` - Sort by date

**Row Level Security (RLS):**
- ✅ Customers can read/insert own payments
- ✅ Admins can read/update all payments
- ✅ Secure by default

**Real-time Support:**
- ✅ Enabled for instant admin notifications
- ✅ Payment status changes broadcast immediately

**Auto Timestamps:**
- ✅ `updated_at` auto-updates on every change
- ✅ Trigger-based, no manual updates needed

**Payment Summary View:**
- ✅ `payment_summary` view for admin analytics
- ✅ Groups by date, method, status
- ✅ Shows transaction count & total amount

### 6. **Payment Flow**

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER PLACES ORDER                                        │
├─────────────────────────────────────────────────────────────┤
│ • Cart → Place Order (GPay selected)                        │
│ • Creates order_request                                     │
│ • Creates payment record:                                   │
│   - payment_status: "pending"                               │
│   - order_request_id: <request_id>                          │
│   - amount: ₹450                                            │
│   - payment_method: "gpay"                                  │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. QR MODAL SHOWS (5-min timer)                            │
├─────────────────────────────────────────────────────────────┤
│ • User scans QR code                                        │
│ • Pays via GPay/PhonePe/Any UPI app                         │
│ • Payment received in restaurant account                    │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. ADMIN VERIFIES PAYMENT                                   │
├─────────────────────────────────────────────────────────────┤
│ • Admin sees payment notification                           │
│ • Checks transaction in bank/UPI app                        │
│ • Updates payment record:                                   │
│   - payment_status: "paid"                                  │
│   - transaction_id: "TXN123456789"                          │
│   - verified_by: admin_id                                   │
│   - paid_at: current_timestamp                              │
│ • Accepts order_request                                     │
└─────────────────────────────────────────────────────────────┘
                             ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. ORDER CREATED & PAYMENT LINKED                          │
├─────────────────────────────────────────────────────────────┤
│ • Order created with status "Placed"                        │
│ • Payment record updated:                                   │
│   - order_id: "SAM-1234-56"                                 │
│ • Real-time notification to user                            │
│ • Success screen shows → "Track Order" button               │
└─────────────────────────────────────────────────────────────┘
```

### 7. **Admin Actions Available**

```typescript
// 1. Mark payment as paid
await updatePaymentStatus(paymentId, "paid", {
  transactionId: "UPI123456789",
  verifiedBy: adminUserId,
  notes: "Verified via bank statement"
});

// 2. Mark payment as failed
await updatePaymentStatus(paymentId, "failed", {
  notes: "Payment not received after 10 minutes"
});

// 3. Refund payment
await updatePaymentStatus(paymentId, "refunded", {
  transactionId: "REFUND123",
  verifiedBy: adminUserId,
  notes: "Refunded due to order cancellation"
});

// 4. Get payment history
const payments = await getOrderPayments(orderId);
```

### 8. **Files Created/Modified**

| File | Purpose |
|------|---------|
| `supabase/migrations/029_payments_table.sql` | Database schema |
| `src/lib/payment-store.ts` | TypeScript utilities |
| `src/routes/cart.tsx` | Integration in cart checkout |
| `public/gpay.jpeg` | QR code image |
| `src/components/site/GPayQRModal.tsx` | QR modal component |

### 9. **Running the Migration**

```bash
# In Supabase Dashboard → SQL Editor
# Copy and paste: supabase/migrations/029_payments_table.sql
# Click "Run"
```

Or via CLI:
```bash
supabase db push
```

### 10. **Querying Payments**

```sql
-- Get all pending payments
SELECT * FROM payments WHERE payment_status = 'pending';

-- Get today's successful payments
SELECT * FROM payments 
WHERE payment_status = 'paid' 
AND DATE(paid_at) = CURRENT_DATE;

-- Get payment summary (uses view)
SELECT * FROM payment_summary WHERE payment_date = CURRENT_DATE;

-- Get user's payment history
SELECT * FROM payments WHERE user_id = '<user_uuid>' ORDER BY created_at DESC;
```

---

## 🎯 Complete Payment Tracking System Ready!

All payment transactions are now fully tracked in the database with:
- ✅ Detailed transaction records
- ✅ Admin verification workflow
- ✅ Real-time updates
- ✅ Analytics-ready data structure
- ✅ Secure RLS policies
- ✅ TypeScript utilities for easy access

**No data is lost. Every transaction is logged.** 🔒
