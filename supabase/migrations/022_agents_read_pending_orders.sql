-- Fix: agents could not read order data for incoming delivery requests
-- because delivery_agent_id is NULL before they accept.

drop policy if exists "Agents can read orders with pending request" on public.orders;

create policy agents_read_pending_order
  on public.orders
  for select
  using (
    exists (
      select 1
      from public.delivery_requests dr
      where dr.order_id = orders.id
        and dr.agent_id = auth.uid()
        and dr.status = 'pending'
    )
  );
