-- Add payment method and cancellation support to orders
alter table public.orders
  add column if not exists payment_method text not null default 'cod' check (payment_method in ('cod', 'gpay')),
  add column if not exists payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed')),
  add column if not exists razorpay_order_id text,
  add column if not exists razorpay_payment_id text,
  add column if not exists cancelled_at timestamptz;

-- Allow status = Cancelled
alter table public.orders
  drop constraint if exists orders_status_check;

alter table public.orders
  add constraint orders_status_check
  check (status in ('Placed','Preparing','Ready','Out for delivery','Delivered','Cancelled'));
