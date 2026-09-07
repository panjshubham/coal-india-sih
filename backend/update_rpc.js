import { Client } from 'pg';

async function updateAdminRpc() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.pkynukxdzwlywrxcwtay',
    password: 'Shubham@123',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const updateRpcSql = `
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
    SET search_path = public, auth, extensions, pg_temp
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

      -- Check if email already exists in auth.users or public.users
      IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower(trim(p_email))) OR
         EXISTS (SELECT 1 FROM public.users WHERE lower(email) = lower(trim(p_email))) THEN
        RAISE EXCEPTION 'User with this email already exists';
      END IF;

      -- Generate new UUID
      v_new_id := gen_random_uuid();

      -- Insert into auth.users with proper GoTrue fields
      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change,
        email_change_token_current,
        phone_change,
        phone_change_token,
        reauthentication_token,
        email_change_confirm_status,
        raw_app_meta_data,
        raw_user_meta_data,
        is_sso_user,
        is_anonymous,
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
        encode(gen_random_bytes(32), 'hex'),
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        0,
        '{"provider":"email","providers":["email"]}'::jsonb,
        json_build_object('name', p_name, 'role', p_role)::jsonb,
        false,
        false,
        NOW(),
        NOW()
      );

      -- Insert into auth.identities
      INSERT INTO auth.identities (
        id,
        provider_id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        v_new_id::text,
        v_new_id,
        json_build_object('sub', v_new_id::text, 'email', lower(trim(p_email)), 'email_verified', true, 'phone_verified', false)::jsonb,
        'email',
        NOW(),
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
        'assigned_mine_id', CASE WHEN p_role = 'mine_official' THEN p_assigned_mine_id ELSE NULL END
      ) INTO v_result;

      RETURN v_result;
    END;
    $$;
  `;

  await client.query(updateRpcSql);
  await client.query(`GRANT EXECUTE ON FUNCTION public.admin_create_user TO anon, authenticated;`);
  console.log('✅ Updated public.admin_create_user RPC without confirmed_at!');

  await client.end();
}

updateAdminRpc().catch(console.error);
