-- Add delivery_agent_id to orders so each order can be assigned to a specific agent
alter table public.orders
  add column if not exists delivery_agent_id uuid references auth.users(id) on delete set null;

-- Delivery agents can only update orders assigned to them (or unassigned Ready orders they pick up)
drop policy if exists "Admins can update order status" on public.orders;
create policy "Admins can update order status" on public.orders for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    or (
      exists (select 1 from public.profiles where id = auth.uid() and role = 'delivery')
      and (delivery_agent_id = auth.uid() or delivery_agent_id is null)
    )
  );

-- When a delivery agent picks up an order, auto-assign them
create or replace function public.assign_delivery_agent()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- If status changes to "Out for delivery" and no agent assigned yet, assign current user
  if new.status = 'Out for delivery' and new.delivery_agent_id is null then
    new.delivery_agent_id := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists on_order_pickup on public.orders;
create trigger on_order_pickup
  before update on public.orders
  for each row execute procedure public.assign_delivery_agent();
