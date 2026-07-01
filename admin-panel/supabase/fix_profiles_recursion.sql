-- Fix infinite recursion in profiles policies
-- Run this in Supabase SQL Editor

-- Drop the recursive policy
drop policy if exists "Admins can read all profiles" on public.profiles;

-- Recreate it using auth.jwt() to avoid querying profiles from within profiles
create policy "Admins can read all profiles" on public.profiles
  for select using (
    (auth.jwt() ->> 'role') = 'admin'
    or auth.uid() = id
  );
