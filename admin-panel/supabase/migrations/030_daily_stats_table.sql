-- ============================================================
-- SAM Foods — Daily Stats Table
-- Stores daily snapshots of revenue, orders, and metrics
-- Run this in Supabase SQL Editor
-- ============================================================

-- Daily stats snapshot table
create table if not exists public.daily_stats (
  id uuid primary key default gen_random_uuid(),
  stat_date date not null unique,

  -- Revenue
  total_revenue numeric not null default 0,
  cod_revenue numeric not null default 0,
  gpay_revenue numeric not null default 0,

  -- Order counts
  total_orders integer not null default 0,
  placed_orders integer not null default 0,
  preparing_orders integer not null default 0,
  delivered_orders integer not null default 0,
  cancelled_orders integer not null default 0,

  -- Payment breakdown
  paid_orders integer not null default 0,
  pending_payment_orders integer not null default 0,
  failed_payment_orders integer not null default 0,

  -- Snapshot timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for fast date range queries
create index if not exists idx_daily_stats_date on public.daily_stats(stat_date desc);

-- RLS
alter table public.daily_stats enable row level security;

create policy "Admins can read daily stats"
  on public.daily_stats for select
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can insert daily stats"
  on public.daily_stats for insert
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

create policy "Admins can update daily stats"
  on public.daily_stats for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Auto-update updated_at
drop trigger if exists update_daily_stats_updated_at on public.daily_stats;
create trigger update_daily_stats_updated_at
  before update on public.daily_stats
  for each row execute function public.update_updated_at_column();

-- Enable realtime
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'daily_stats'
  ) then
    alter publication supabase_realtime add table public.daily_stats;
  end if;
end $$;

-- ── Function: upsert today's stats from orders table ─────────────────────────
-- Call this function any time to rebuild today's snapshot from live orders data
create or replace function public.refresh_daily_stats(target_date date default current_date)
returns void language plpgsql security definer as $$
declare
  v_total_revenue numeric;
  v_cod_revenue numeric;
  v_gpay_revenue numeric;
  v_total_orders integer;
  v_placed integer;
  v_preparing integer;
  v_delivered integer;
  v_cancelled integer;
  v_paid integer;
  v_pending_pay integer;
  v_failed_pay integer;
begin
  -- Revenue (non-cancelled only)
  select
    coalesce(sum(total), 0),
    coalesce(sum(case when payment_method = 'cod' then total else 0 end), 0),
    coalesce(sum(case when payment_method = 'gpay' then total else 0 end), 0)
  into v_total_revenue, v_cod_revenue, v_gpay_revenue
  from public.orders
  where date(created_at) = target_date
    and status != 'Cancelled';

  -- Order counts
  select count(*) into v_total_orders
  from public.orders where date(created_at) = target_date;

  select count(*) into v_placed
  from public.orders where date(created_at) = target_date and status = 'Placed';

  select count(*) into v_preparing
  from public.orders where date(created_at) = target_date and status = 'Preparing';

  select count(*) into v_delivered
  from public.orders where date(created_at) = target_date and status = 'Delivered';

  select count(*) into v_cancelled
  from public.orders where date(created_at) = target_date and status = 'Cancelled';

  -- Payment counts
  select count(*) into v_paid
  from public.orders where date(created_at) = target_date and payment_status = 'paid';

  select count(*) into v_pending_pay
  from public.orders where date(created_at) = target_date and payment_status = 'pending';

  select count(*) into v_failed_pay
  from public.orders where date(created_at) = target_date and payment_status = 'failed';

  -- Upsert into daily_stats
  insert into public.daily_stats (
    stat_date, total_revenue, cod_revenue, gpay_revenue,
    total_orders, placed_orders, preparing_orders, delivered_orders, cancelled_orders,
    paid_orders, pending_payment_orders, failed_payment_orders
  ) values (
    target_date, v_total_revenue, v_cod_revenue, v_gpay_revenue,
    v_total_orders, v_placed, v_preparing, v_delivered, v_cancelled,
    v_paid, v_pending_pay, v_failed_pay
  )
  on conflict (stat_date) do update set
    total_revenue = excluded.total_revenue,
    cod_revenue = excluded.cod_revenue,
    gpay_revenue = excluded.gpay_revenue,
    total_orders = excluded.total_orders,
    placed_orders = excluded.placed_orders,
    preparing_orders = excluded.preparing_orders,
    delivered_orders = excluded.delivered_orders,
    cancelled_orders = excluded.cancelled_orders,
    paid_orders = excluded.paid_orders,
    pending_payment_orders = excluded.pending_payment_orders,
    failed_payment_orders = excluded.failed_payment_orders,
    updated_at = now();
end;
$$;

-- ── Trigger: auto-refresh daily_stats whenever an order is inserted/updated ──
create or replace function public.trigger_refresh_daily_stats()
returns trigger language plpgsql security definer as $$
begin
  perform public.refresh_daily_stats(date(coalesce(new.created_at, old.created_at)));
  return coalesce(new, old);
end;
$$;

drop trigger if exists orders_refresh_daily_stats on public.orders;
create trigger orders_refresh_daily_stats
  after insert or update on public.orders
  for each row execute function public.trigger_refresh_daily_stats();

-- ── Backfill: populate stats for all existing orders ─────────────────────────
do $$
declare
  d date;
begin
  for d in
    select distinct date(created_at) from public.orders order by 1
  loop
    perform public.refresh_daily_stats(d);
  end loop;
end;
$$;

-- ── View: last 30 days summary ────────────────────────────────────────────────
create or replace view public.stats_last_30_days as
select
  stat_date,
  total_revenue,
  cod_revenue,
  gpay_revenue,
  total_orders,
  delivered_orders,
  cancelled_orders,
  paid_orders
from public.daily_stats
where stat_date >= current_date - interval '30 days'
order by stat_date desc;

grant select on public.stats_last_30_days to authenticated;
