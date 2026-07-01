-- Add payment fields to bulk_orders
alter table public.bulk_orders
  add column if not exists quoted_amount numeric,
  add column if not exists payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'paid')),
  add column if not exists payment_ref text,
  add column if not exists paid_at timestamptz;

-- Allow status 'Accepted' and 'Denied' alongside existing values
alter table public.bulk_orders
  drop constraint if exists bulk_orders_status_check;

alter table public.bulk_orders
  add constraint bulk_orders_status_check
  check (status in ('Pending', 'Accepted', 'Confirmed', 'Denied', 'Cancelled'));

-- Allow anyone to read their own bulk order (by id via client)
drop policy if exists "Anyone can read bulk orders by id" on public.bulk_orders;
create policy "Anyone can read bulk orders by id"
  on public.bulk_orders for select
  using (true);

-- Allow anyone to update payment fields (for payment flow)
drop policy if exists "Anyone can update payment status" on public.bulk_orders;
create policy "Anyone can update payment status"
  on public.bulk_orders for update
  using (true);

-- Realtime
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'bulk_orders'
  ) then
    alter publication supabase_realtime add table public.bulk_orders;
  end if;
end $$;
