import { Client } from 'pg';

async function setupAdminRpc() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.pkynukxdzwlywrxcwtay',
    password: 'Shubham@123',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Connected to Supabase Postgres');

  // Create extension pgcrypto if not exists
  await client.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

  // Create admin_create_user RPC function
  const createFunctionSql = `
    CREATE OR REPLACE FUNCTION public.admin_create_user(
      p_name TEXT,
      p_email TEXT,
      p_password TEXT,
      p_role user_role,
      p_assigned_mine_id INTEGER DEFAULT NULL
    )
    RETURNS JSON
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, auth, pg_temp
    AS $$
    DECLARE
      v_caller_role user_role;
      v_new_id UUID;
      v_result JSON;
    BEGIN
      -- Check caller authorization if authenticated context exists
      IF auth.uid() IS NOT NULL THEN
        SELECT role INTO v_caller_role FROM public.users WHERE id = auth.uid();
        IF v_caller_role IS DISTINCT FROM 'corporate' THEN
          RAISE EXCEPTION 'Access denied: Only corporate administrators can provision users';
        END IF;
      END IF;

      -- Check if email already exists in auth.users
      IF EXISTS (SELECT 1 FROM auth.users WHERE email = lower(trim(p_email))) THEN
        RAISE EXCEPTION 'User with this email already exists in auth system';
      END IF;

      -- Generate new UUID
      v_new_id := gen_random_uuid();

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
        updated_at
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        v_new_id,
        'authenticated',
        'authenticated',
        lower(trim(p_email)),
        crypt(p_password, gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        json_build_object('name', p_name, 'role', p_role)::jsonb,
        NOW(),
        NOW()
      );

      -- Insert into public.users
      INSERT INTO public.users (
        id,
        name,
        email,
        role,
        assigned_mine_id,
        created_at
      ) VALUES (
        v_new_id,
        p_name,
        lower(trim(p_email)),
        p_role,
        CASE WHEN p_role = 'mine_official' THEN p_assigned_mine_id ELSE NULL END,
        NOW()
      );

      -- Return JSON payload of created user
      SELECT json_build_object(
        'id', v_new_id,
        'name', p_name,
        'email', lower(trim(p_email)),
        'role', p_role,
        'assigned_mine_id', p_assigned_mine_id
      ) INTO v_result;

      RETURN v_result;
    END;
    $$;
  `;

  await client.query(createFunctionSql);
  console.log('✅ admin_create_user RPC function created successfully!');

  // Grant execute to anon and authenticated roles
  await client.query(`GRANT EXECUTE ON FUNCTION public.admin_create_user TO anon, authenticated;`);
  console.log('✅ Permissions granted on public.admin_create_user');

  await client.end();
}

setupAdminRpc().catch(console.error);
