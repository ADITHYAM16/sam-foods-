-- ============================================================
-- SAM Foods — Payments Table
-- Stores all payment transaction details
-- Run this in Supabase SQL Editor
-- ============================================================

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  
  -- Order reference
  order_id text references public.orders(id) on delete cascade,
  order_request_id uuid references public.order_requests(id) on delete set null,
  
  -- Customer details
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  customer_email text,
  customer_phone text,
  
  -- Payment details
  amount numeric not null,
  payment_method text not null check (payment_method in ('cod', 'gpay', 'phonepe', 'paytm', 'upi', 'card')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  
  -- Transaction details
  transaction_id text, -- UPI transaction ID or payment gateway txn ID
  upi_id text, -- Customer's UPI ID (e.g., customer@paytm)
  payment_app text, -- GPay, PhonePe, Paytm, etc.
  
  -- Gateway details (if using Razorpay/other gateway)
  razorpay_order_id text,
  razorpay_payment_id text,
  razorpay_signature text,
  gateway_response jsonb, -- Full gateway response for debugging
  
  -- Timestamps
  initiated_at timestamptz not null default now(),
  paid_at timestamptz,
  failed_at timestamptz,
  refunded_at timestamptz,
  
  -- Additional info
  notes text, -- Admin notes about payment
  verified_by uuid references auth.users(id) on delete set null, -- Admin who verified payment
  verification_screenshot text, -- URL to payment screenshot if uploaded
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for faster lookups
create index if not exists idx_payments_order_id on public.payments(order_id);
create index if not exists idx_payments_user_id on public.payments(user_id);
create index if not exists idx_payments_status on public.payments(payment_status);
create index if not exists idx_payments_created_at on public.payments(created_at desc);

-- RLS Policies
alter table public.payments enable row level security;

-- Customers can read their own payments
create policy "Customers can read own payments"
  on public.payments for select
  using (auth.uid() = user_id);

-- Customers can insert their own payments
create policy "Customers can insert own payments"
  on public.payments for insert
  with check (auth.uid() = user_id);

-- Admins can read all payments
create policy "Admins can read all payments"
  on public.payments for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Admins can update payments (for verification)
create policy "Admins can update payments"
  on public.payments for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Auto-update updated_at timestamp
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_payments_updated_at on public.payments;
create trigger update_payments_updated_at
  before update on public.payments
  for each row
  execute function public.update_updated_at_column();

-- Enable realtime for payments (so admin can see payment confirmations instantly)
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'payments'
  ) then
    alter publication supabase_realtime add table public.payments;
  end if;
end $$;

-- Create a view for admin payment summary
create or replace view public.payment_summary as
select
  date_trunc('day', p.created_at) as payment_date,
  p.payment_method,
  p.payment_status,
  count(*) as transaction_count,
  sum(p.amount) as total_amount
from public.payments p
group by date_trunc('day', p.created_at), p.payment_method, p.payment_status
order by payment_date desc;

-- Grant access to view for admins
grant select on public.payment_summary to authenticated;

comment on table public.payments is 'Stores all payment transaction details for orders';
comment on column public.payments.transaction_id is 'UPI transaction ID or payment gateway reference number';
comment on column public.payments.verified_by is 'Admin user ID who verified this payment';
comment on column public.payments.gateway_response is 'Full JSON response from payment gateway for debugging';
