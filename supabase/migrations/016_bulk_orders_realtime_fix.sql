-- Ensure bulk_orders realtime works properly
-- REPLICA IDENTITY FULL is required for UPDATE events to carry the full new row
alter table public.bulk_orders replica identity full;

-- Ensure the table is in the realtime publication
do $$ begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'bulk_orders'
  ) then
    alter publication supabase_realtime add table public.bulk_orders;
  end if;
end $$;
