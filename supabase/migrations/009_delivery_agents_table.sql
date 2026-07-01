-- Dedicated delivery agents table
create table if not exists public.delivery_agents (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.delivery_agents enable row level security;

-- Only admins can read/write the agents table
create policy "Admins can manage delivery agents"
  on public.delivery_agents for all
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Agents can read their own row
create policy "Agents can read own row"
  on public.delivery_agents for select
  using (auth.uid() = id);

-- Realtime
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'delivery_agents'
  ) then
    alter publication supabase_realtime add table public.delivery_agents;
  end if;
end $$;
