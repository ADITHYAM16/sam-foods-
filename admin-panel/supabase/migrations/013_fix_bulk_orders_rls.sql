-- Fix bulk_orders RLS so anonymous users can submit and track their own bulk orders

-- Drop all existing bulk_orders policies first to start clean
drop policy if exists "Anyone can submit bulk orders" on public.bulk_orders;
drop policy if exists "Admins can read bulk orders" on public.bulk_orders;
drop policy if exists "Admins can update bulk orders" on public.bulk_orders;
drop policy if exists "Anyone can read bulk orders by id" on public.bulk_orders;
drop policy if exists "Anyone can update payment status" on public.bulk_orders;

-- Grant table-level permissions to anon and authenticated roles
grant select, insert, update on public.bulk_orders to anon, authenticated;

-- 1. Anyone (anon + authenticated) can INSERT a new bulk order
create policy "Anyone can insert bulk orders"
  on public.bulk_orders for insert
  to anon, authenticated
  with check (true);

-- 2. Anyone can SELECT (needed for user polling by id, and admin listing)
create policy "Anyone can select bulk orders"
  on public.bulk_orders for select
  to anon, authenticated
  using (true);

-- 3. Anyone can UPDATE (needed for user payment confirmation)
--    Admins use service role so they bypass RLS entirely
create policy "Anyone can update bulk orders"
  on public.bulk_orders for update
  to anon, authenticated
  using (true)
  with check (true);
