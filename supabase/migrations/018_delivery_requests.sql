-- Delivery requests table: one row per agent-order assignment attempt
create table if not exists public.delivery_requests (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders(id) on delete cascade,
  agent_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'denied')),
  created_at timestamptz not null default now()
);

alter table public.delivery_requests enable row level security;

-- Agents can read their own requests
create policy "Agents can read own requests"
  on public.delivery_requests for select
  using (auth.uid() = agent_id);

-- Agents can update (accept/deny) their own requests
create policy "Agents can update own requests"
  on public.delivery_requests for update
  using (auth.uid() = agent_id);

-- Admins can do everything
create policy "Admins can manage delivery requests"
  on public.delivery_requests for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Realtime
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'delivery_requests'
  ) then
    alter publication supabase_realtime add table public.delivery_requests;
  end if;
end $$;
