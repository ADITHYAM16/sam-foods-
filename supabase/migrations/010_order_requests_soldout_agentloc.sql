-- 1. Add sold_out to menu_items
alter table public.menu_items
  add column if not exists sold_out boolean not null default false;

-- 2. Order requests — pending admin approval before becoming real orders
create table if not exists public.order_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  customer text not null,
  email text,
  room text not null,
  delivery_time text not null default 'ASAP',
  items jsonb not null default '[]',
  subtotal numeric not null default 0,
  delivery_fee numeric not null default 0,
  gst numeric not null default 0,
  total numeric not null default 0,
  discount numeric not null default 0,
  payment_method text not null default 'cod',
  payment_status text not null default 'pending',
  razorpay_order_id text,
  razorpay_payment_id text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'denied')),
  created_at timestamptz not null default now()
);

alter table public.order_requests enable row level security;

-- Customers can insert
create policy "Customers can insert order requests"
  on public.order_requests for insert
  with check (auth.uid() = user_id or user_id is null);

-- Customers can read own requests
create policy "Customers can read own requests"
  on public.order_requests for select
  using (auth.uid() = user_id);

-- Admins can read and update all requests
create policy "Admins can manage order requests"
  on public.order_requests for all
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

-- Realtime
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'order_requests'
  ) then
    alter publication supabase_realtime add table public.order_requests;
  end if;
end $$;

-- 3. Agent location table — agents update their location periodically
create table if not exists public.agent_locations (
  agent_id uuid primary key references auth.users(id) on delete cascade,
  lat numeric,
  lng numeric,
  updated_at timestamptz not null default now()
);

alter table public.agent_locations enable row level security;

create policy "Agents can upsert own location"
  on public.agent_locations for all
  using (auth.uid() = agent_id)
  with check (auth.uid() = agent_id);

create policy "Admins can read all locations"
  on public.agent_locations for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','delivery')));
