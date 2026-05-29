-- Saved delivery addresses per user
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

create policy "Users manage own addresses"
  on public.saved_addresses for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
