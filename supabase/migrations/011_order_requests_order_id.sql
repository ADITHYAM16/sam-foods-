alter table public.order_requests
  add column if not exists order_id text references public.orders(id) on delete set null;
