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

-- Anyone can read reviews
create policy "Anyone can read reviews"
  on public.reviews for select using (true);

-- Logged-in users can insert their own review
create policy "Users can insert own review"
  on public.reviews for insert
  with check (auth.uid() = user_id);

-- Users can update their own review
create policy "Users can update own review"
  on public.reviews for update
  using (auth.uid() = user_id);

-- Enable realtime
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'reviews'
  ) then
    alter publication supabase_realtime add table public.reviews;
  end if;
end $$;
