-- ============================================================
-- STEP 1: Run this first to create the users
-- ============================================================

-- Create admin user: sam@gmail.com / admin@123
DO $$
DECLARE
  admin_id uuid;
BEGIN
  -- Delete if exists
  DELETE FROM auth.users WHERE email = 'sam@gmail.com';
  
  -- Generate new ID
  admin_id := gen_random_uuid();
  
  -- Insert into auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    admin_id,
    'authenticated',
    'authenticated',
    'sam@gmail.com',
    crypt('admin@123', gen_salt('bf')),
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
  
  -- Insert profile
  INSERT INTO public.profiles (id, name, email, phone, role)
  VALUES (admin_id, 'SAM Admin', 'sam@gmail.com', '08508372430', 'admin');
  
  RAISE NOTICE 'Admin user created: sam@gmail.com / admin@123';
END $$;

-- Create delivery agent: agent@gmail.com / agent@123
DO $$
DECLARE
  agent_id uuid;
BEGIN
  -- Delete if exists
  DELETE FROM auth.users WHERE email = 'agent@gmail.com';
  
  -- Generate new ID
  agent_id := gen_random_uuid();
  
  -- Insert into auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    agent_id,
    'authenticated',
    'authenticated',
    'agent@gmail.com',
    crypt('agent@123', gen_salt('bf')),
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
  
  -- Insert profile
  INSERT INTO public.profiles (id, name, email, phone, role)
  VALUES (agent_id, 'Delivery Agent', 'agent@gmail.com', '08508372430', 'delivery');
  
  RAISE NOTICE 'Agent user created: agent@gmail.com / agent@123';
END $$;


-- ============================================================
-- STEP 2: Verify users were created
-- ============================================================
SELECT 
  u.email,
  p.name,
  p.role,
  u.email_confirmed_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email IN ('sam@gmail.com', 'agent@gmail.com')
ORDER BY p.role;
