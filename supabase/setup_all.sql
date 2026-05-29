-- ============================================================
-- SAM Foods — Run this ONCE in Supabase SQL Editor
-- https://supabase.com/dashboard/project/oorfedydkprtxzkqaphp/sql/new
-- ============================================================

-- ── PROFILES ─────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  role text not null default 'customer' check (role in ('customer', 'admin', 'delivery')),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles for select using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles" on public.profiles for select
  using ((auth.jwt() ->> 'role') = 'admin' or auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ── ORDERS ───────────────────────────────────────────────────
create table if not exists public.orders (
  id text primary key default 'SAM-' || floor(1000 + random() * 9000)::text || '-' || floor(random() * 100)::text,
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
  status text not null default 'Placed',
  payment_method text not null default 'cod' check (payment_method in ('cod', 'gpay')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed')),
  razorpay_order_id text,
  razorpay_payment_id text,
  cancelled_at timestamptz,
  created_at timestamptz not null default now()
);

-- Fix status constraint to include Cancelled
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('Placed','Preparing','Ready','Out for delivery','Delivered','Cancelled'));

alter table public.orders enable row level security;

drop policy if exists "Customers can insert own orders" on public.orders;
create policy "Customers can insert own orders" on public.orders for insert
  with check (auth.uid() = user_id or user_id is null);

drop policy if exists "Customers can read own orders" on public.orders;
create policy "Customers can read own orders" on public.orders for select
  using (auth.uid() = user_id);

drop policy if exists "Admins can read all orders" on public.orders;
create policy "Admins can read all orders" on public.orders for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'delivery')));

drop policy if exists "Admins can update order status" on public.orders;
create policy "Admins can update order status" on public.orders for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'delivery')));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;


-- ── SAVED ADDRESSES ──────────────────────────────────────────
create table if not exists public.saved_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Home',
  address text not null,
  lat numeric,
  lng numeric,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.saved_addresses enable row level security;

drop policy if exists "Users manage own addresses" on public.saved_addresses;
create policy "Users manage own addresses" on public.saved_addresses for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- ── BULK ORDERS ──────────────────────────────────────────────
create table if not exists public.bulk_orders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  event text not null,
  people integer not null,
  date date not null,
  location text not null,
  menu_request text,
  budget text not null,
  status text not null default 'Pending' check (status in ('Pending', 'Confirmed', 'Cancelled')),
  created_at timestamptz not null default now()
);
alter table public.bulk_orders enable row level security;

drop policy if exists "Anyone can submit bulk orders" on public.bulk_orders;
create policy "Anyone can submit bulk orders" on public.bulk_orders for insert with check (true);

drop policy if exists "Admins can read bulk orders" on public.bulk_orders;
create policy "Admins can read bulk orders" on public.bulk_orders for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

drop policy if exists "Admins can update bulk orders" on public.bulk_orders;
create policy "Admins can update bulk orders" on public.bulk_orders for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));


-- ── REVIEWS ──────────────────────────────────────────────────
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  role text not null default 'Customer',
  rating integer not null check (rating between 1 and 5),
  text text not null,
  created_at timestamptz not null default now()
);
alter table public.reviews enable row level security;

drop policy if exists "Anyone can read reviews" on public.reviews;
create policy "Anyone can read reviews" on public.reviews for select using (true);

drop policy if exists "Users can insert own review" on public.reviews;
create policy "Users can insert own review" on public.reviews for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own review" on public.reviews;
create policy "Users can update own review" on public.reviews for update
  using (auth.uid() = user_id);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'reviews'
  ) then
    alter publication supabase_realtime add table public.reviews;
  end if;
end $$;
