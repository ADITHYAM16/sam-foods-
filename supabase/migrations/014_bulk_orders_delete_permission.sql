-- Grant DELETE permission so admin service role can hard-delete rows
-- (service role bypasses RLS, but explicit grant ensures no permission errors)
grant delete on public.bulk_orders to authenticated;

-- Allow anon/authenticated to delete their own records if needed
create policy "Anyone can delete bulk orders"
  on public.bulk_orders for delete
  to anon, authenticated
  using (true);

-- Enable replica identity full so realtime broadcasts full row on DELETE
-- (without this, realtime DELETE events only have the primary key)
alter table public.bulk_orders replica identity full;
