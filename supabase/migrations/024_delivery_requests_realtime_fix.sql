-- Ensure replica identity full so realtime UPDATE events carry full row
-- (required for filtered subscriptions like agent_id=eq.xxx to fire correctly)
alter table public.delivery_requests replica identity full;

-- Re-apply the auto-deny trigger cleanly
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
