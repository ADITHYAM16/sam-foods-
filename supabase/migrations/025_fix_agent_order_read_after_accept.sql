-- Fix: agents lose read access to an order after accepting because the
-- policy in 022 only allows reading orders with a PENDING request.
-- Once they accept, the request becomes 'accepted' and they can no longer
-- read the order unless delivery_agent_id is set — but that column is set
-- in the same transaction so there is a race window on refresh.
--
-- Solution: allow agents to read orders where they have ANY delivery_request
-- (pending OR accepted), OR where delivery_agent_id = their uid.

drop policy if exists "Agents can read own assigned orders" on public.orders;
drop policy if exists agents_read_pending_order on public.orders;
drop policy if exists "Agents can read orders with pending request" on public.orders;

create policy "Agents can read their orders"
  on public.orders for select
  using (
    -- assigned directly
    delivery_agent_id = auth.uid()
    or
    -- has a delivery_request row (pending or accepted)
    exists (
      select 1 from public.delivery_requests dr
      where dr.order_id = orders.id
        and dr.agent_id = auth.uid()
        and dr.status in ('pending', 'accepted')
    )
  );
