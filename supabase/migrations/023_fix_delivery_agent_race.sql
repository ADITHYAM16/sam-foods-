-- Step 1: Fix corrupted orders where delivery_agent_id is wrong.
-- Use delivery_requests accepted rows as the source of truth.
update public.orders o
set delivery_agent_id = dr.agent_id
from public.delivery_requests dr
where dr.order_id = o.id
  and dr.status = 'accepted'
  and o.delivery_agent_id != dr.agent_id;

-- Step 2: Add a DB-level function + trigger that prevents two agents
-- from both having an accepted delivery_request for the same order.
-- When an agent accepts, automatically deny all other pending requests.
create or replace function public.auto_deny_other_delivery_requests()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'accepted' then
    update public.delivery_requests
    set status = 'denied'
    where order_id = new.order_id
      and id != new.id
      and status = 'pending';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_auto_deny_delivery_requests on public.delivery_requests;
create trigger trg_auto_deny_delivery_requests
  after update on public.delivery_requests
  for each row execute procedure public.auto_deny_other_delivery_requests();
