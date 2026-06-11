-- DB-backed session storage for admin and delivery agent panels
-- Replaces localStorage so sessions are isolated per user, per role, per device
create table if not exists public.user_sessions (
  key   text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- No RLS needed — this table is accessed via service role key only from the server-side adapter
-- Row-level isolation is handled by embedding user_id in the key itself

-- Realtime (optional — useful if you want multi-tab sync within the same role panel)
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'user_sessions'
  ) then
    alter publication supabase_realtime add table public.user_sessions;
  end if;
end $$;

-- Auto-cleanup old sessions (older than 30 days)
create or replace function public.cleanup_old_sessions()
returns void language plpgsql security definer as $$
begin
  delete from public.user_sessions where updated_at < now() - interval '30 days';
end;
$$;
