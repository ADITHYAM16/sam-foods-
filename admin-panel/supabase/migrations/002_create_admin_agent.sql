-- ============================================================
-- SAM Foods — Complete Auth Setup with Admin & Agent
-- Run this entire script in Supabase SQL Editor
-- ============================================================

-- 1. Clean up existing data
truncate table public.profiles cascade;

-- 2. Disable email confirmation requirement
update auth.config 
set value = 'false' 
where parameter = 'enable_signup';

-- 3. Create admin user (sam@gmail.com / admin@123)
-- First delete if exists
delete from auth.users where email = 'sam@gmail.com';

-- Insert admin into auth.users
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'sam@gmail.com',
  crypt('admin@123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"SAM Admin"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- Insert admin profile
insert into public.profiles (id, name, email, phone, role)
select id, 'SAM Admin', 'sam@gmail.com', '08508372430', 'admin'
from auth.users where email = 'sam@gmail.com';

-- 4. Create delivery agent (agent@gmail.com / agent@123)
delete from auth.users where email = 'agent@gmail.com';

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'agent@gmail.com',
  crypt('agent@123', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Delivery Agent"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- Insert delivery agent profile
insert into public.profiles (id, name, email, phone, role)
select id, 'Delivery Agent', 'agent@gmail.com', '08508372430', 'delivery'
from auth.users where email = 'agent@gmail.com';

-- 5. Verify users created
select email, role from public.profiles;
