-- Ensure delivery agents can read and update orders (idempotent)
drop policy if exists "Admins can read all orders" on public.orders;
create policy "Admins can read all orders" on public.orders for select
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'delivery')));

drop policy if exists "Admins can update order status" on public.orders;
create policy "Admins can update order status" on public.orders for update
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'delivery')));

-- Ensure menu_items in realtime
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'menu_items'
  ) then
    alter publication supabase_realtime add table public.menu_items;
  end if;
end $$;
