-- Fix handle_new_user trigger to support phone OTP signups (email is NULL for phone users)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email, phone, role)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(coalesce(new.email, ''), '@', 1),
      coalesce(new.phone, 'User')
    ),
    coalesce(new.email, ''),   -- empty string for phone-only users (column is not null)
    coalesce(new.phone, null),
    'customer'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
