-- Fix: delivery agents must only see orders assigned to them.
-- The previous policy allowed ALL delivery agents to read ALL orders,
-- which caused realtime UPDATE events to fire for every agent — making
-- every agent see every other agent's accepted order in Active Deliveries.

-- Drop the broad delivery read policy
drop policy if exists "Admins can read all orders" on public.orders;

-- Admin-only read (full access)
create policy "Admins can read all orders"
  on public.orders for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Delivery agents can only read orders assigned to them
create policy "Agents can read own assigned orders"
  on public.orders for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'delivery')
    and delivery_agent_id = auth.uid()
  );

-- Customers can read their own orders
drop policy if exists "Customers can read own orders" on public.orders;
create policy "Customers can read own orders"
  on public.orders for select
  using (auth.uid() = user_id);

-- Fix delivery_requests: agents need INSERT permission to accept (sets delivery_agent_id via respondToDeliveryRequest)
drop policy if exists "Agents can insert own requests" on public.delivery_requests;
create policy "Agents can insert own requests"
  on public.delivery_requests for insert
  with check (auth.uid() = agent_id);

-- Set replica identity full so realtime carries full row on UPDATE
alter table public.delivery_requests replica identity full;
alter table public.orders replica identity full;
