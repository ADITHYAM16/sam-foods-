-- ============================================================
-- SAM Foods — Full Database Setup
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. PROFILES (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  role text not null default 'customer' check (role in ('customer', 'admin', 'delivery')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Admins can read all profiles"
  on public.profiles for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Auto-create profile on signup
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


-- 2. ORDERS
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
  status text not null default 'Placed'
    check (status in ('Placed', 'Preparing', 'Ready', 'Out for delivery', 'Delivered')),
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;

create policy "Customers can insert own orders"
  on public.orders for insert
  with check (auth.uid() = user_id or user_id is null);

create policy "Customers can read own orders"
  on public.orders for select
  using (auth.uid() = user_id);

create policy "Admins can read all orders"
  on public.orders for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'delivery'))
  );

create policy "Admins can update order status"
  on public.orders for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'delivery'))
  );

-- Enable realtime for orders
alter publication supabase_realtime add table public.orders;


-- 3. BULK ORDERS
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

create policy "Anyone can submit bulk orders"
  on public.bulk_orders for insert
  with check (true);

create policy "Admins can read bulk orders"
  on public.bulk_orders for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update bulk orders"
  on public.bulk_orders for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );


-- 4. MENU ITEMS
create table if not exists public.menu_items (
  id text primary key default 'item-' || gen_random_uuid()::text,
  name text not null,
  description text not null default '',
  price numeric not null,
  rating numeric not null default 4.5,
  category text not null,
  veg boolean not null default true,
  image text not null default '',
  badge text,
  available boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.menu_items enable row level security;

create policy "Anyone can read available menu items"
  on public.menu_items for select
  using (available = true);

create policy "Admins can manage menu items"
  on public.menu_items for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Seed initial menu
insert into public.menu_items (id, name, description, price, rating, category, veg, image, badge) values
  ('b1', 'SAM Special Veg Biryani', 'Long-grain basmati, slow-dum veggies, saffron & secret SAM masala.', 289, 4.8, 'Briyani', true, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=900&q=80', 'Bestseller'),
  ('b2', 'Paneer Dum Biryani', 'Tender paneer, layered with fragrant rice & roasted spices.', 379, 4.7, 'Briyani', true, 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=900&q=80', null),
  ('b3', 'Veg Hyderabadi Biryani', 'Garden vegetables, ghee rice, mint & fried onions.', 219, 4.5, 'Briyani', true, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80', null),
  ('m1', 'South Indian Thali', 'Sambar, rasam, 3 curries, rice, papad, curd & sweet.', 199, 4.6, 'Meals', true, 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=900&q=80', null),
  ('m2', 'Paneer Combo Meal', 'Steamed rice, paneer butter masala, roti, salad & dessert.', 259, 4.5, 'Meals', true, 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80', null),
  ('s1', 'Crispy Veg 65', 'Spicy fried veggie bites tossed with curry leaves.', 229, 4.7, 'Starters', true, 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=900&q=80', 'Spicy'),
  ('s2', 'Paneer Tikka', 'Charred paneer cubes marinated in yogurt & spices.', 209, 4.6, 'Starters', true, 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=900&q=80', null),
  ('s3', 'Gobi Manchurian', 'Crispy cauliflower in a tangy Indo-Chinese sauce.', 179, 4.4, 'Starters', true, 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=900&q=80', null),
  ('d1', 'Masala Lemon Soda', 'Fizzy lemon with rock salt & mint — refreshing kick.', 79, 4.3, 'Drinks', true, 'https://images.unsplash.com/photo-1437418747212-8d9709afab22?auto=format&fit=crop&w=900&q=80', null),
  ('d2', 'Mango Lassi', 'Thick yogurt smoothie with sweet alphonso mango.', 99, 4.7, 'Drinks', true, 'https://images.unsplash.com/photo-1626202378011-f47220801c63?auto=format&fit=crop&w=900&q=80', null),
  ('ds1', 'Gulab Jamun (2 pcs)', 'Warm milk dumplings soaked in cardamom syrup.', 89, 4.8, 'Desserts', true, 'https://images.unsplash.com/photo-1605197788044-5b4ad6b0f4f3?auto=format&fit=crop&w=900&q=80', null),
  ('ds2', 'Classic Rasmalai', 'Soft cottage cheese discs in saffron-pistachio milk.', 119, 4.6, 'Desserts', true, 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=900&q=80', null)
on conflict (id) do nothing;


-- 5. Make first registered user an admin (run manually after first signup)
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'your-admin@email.com';
