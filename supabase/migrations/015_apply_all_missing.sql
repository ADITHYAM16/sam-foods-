-- ============================================================
-- RUN THIS ENTIRE FILE IN YOUR SUPABASE DASHBOARD → SQL EDITOR
-- ============================================================

-- 1. Add payment columns to bulk_orders (from migration 012)
alter table public.bulk_orders
  add column if not exists quoted_amount numeric,
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists payment_ref text,
  add column if not exists paid_at timestamptz;

-- 2. Fix status constraint to allow all needed values
alter table public.bulk_orders
  drop constraint if exists bulk_orders_status_check;

alter table public.bulk_orders
  add constraint bulk_orders_status_check
  check (status in ('Pending', 'Accepted', 'Confirmed', 'Denied', 'Cancelled'));

-- 3. RLS policies (from migration 013)
drop policy if exists "Anyone can submit bulk orders" on public.bulk_orders;
drop policy if exists "Admins can read bulk orders" on public.bulk_orders;
drop policy if exists "Admins can update bulk orders" on public.bulk_orders;
drop policy if exists "Anyone can read bulk orders by id" on public.bulk_orders;
drop policy if exists "Anyone can update payment status" on public.bulk_orders;
drop policy if exists "Anyone can insert bulk orders" on public.bulk_orders;
drop policy if exists "Anyone can select bulk orders" on public.bulk_orders;
drop policy if exists "Anyone can update bulk orders" on public.bulk_orders;
drop policy if exists "Anyone can delete bulk orders" on public.bulk_orders;

grant select, insert, update, delete on public.bulk_orders to anon, authenticated;

create policy "bulk_orders_insert" on public.bulk_orders for insert to anon, authenticated with check (true);
create policy "bulk_orders_select" on public.bulk_orders for select to anon, authenticated using (true);
create policy "bulk_orders_update" on public.bulk_orders for update to anon, authenticated using (true) with check (true);
create policy "bulk_orders_delete" on public.bulk_orders for delete to anon, authenticated using (true);

-- 4. Replica identity full so realtime DELETE events carry the full row
alter table public.bulk_orders replica identity full;

-- 5. Enable realtime on bulk_orders
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'bulk_orders'
  ) then
    alter publication supabase_realtime add table public.bulk_orders;
  end if;
end $$;
