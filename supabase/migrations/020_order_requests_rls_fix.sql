-- Fix: allow customers to receive realtime UPDATE events on their own order_requests
-- The existing SELECT policy only covers auth.uid() = user_id, but realtime needs
-- replica identity full + a policy that covers the updated row state.

-- Set replica identity so realtime sends the full row on UPDATE/DELETE
alter table public.order_requests replica identity full;

-- Drop and recreate SELECT policy to also allow reading by id when user_id matches
drop policy if exists "Customers can read own requests" on public.order_requests;

create policy "Customers can read own requests"
  on public.order_requests for select
  using (auth.uid() = user_id or user_id is null);

-- Ensure realtime is enabled (idempotent)
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'order_requests'
  ) then
    alter publication supabase_realtime add table public.order_requests;
  end if;
end $$;
