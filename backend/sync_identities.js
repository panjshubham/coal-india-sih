import { Client } from 'pg';

async function syncIdentities() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.pkynukxdzwlywrxcwtay',
    password: 'Shubham@123',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const users = await client.query(`SELECT id, email, created_at FROM auth.users WHERE email IS NOT NULL;`);

  for (const u of users.rows) {
    const existing = await client.query(`SELECT id FROM auth.identities WHERE user_id = $1;`, [u.id]);
    if (existing.rowCount === 0) {
      await client.query(`
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
          $1::text,
          $2::uuid,
          json_build_object('sub', $1::text, 'email', lower(trim($3::text)), 'email_verified', true, 'phone_verified', false)::jsonb,
          'email',
          NOW(),
          NOW(),
          NOW()
        );
      `, [u.id.toString(), u.id, u.email]);
      console.log(`Created identity for ${u.email}`);
    } else {
      console.log(`Identity exists for ${u.email}`);
    }
  }

  // Update RPC function to also populate auth.identities without generated email column
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
        'assigned_mine_id', p_assigned_mine_id
      ) INTO v_result;

      RETURN v_result;
    END;
    $$;
  `;

  await client.query(updateRpcSql);
  console.log('✅ Updated public.admin_create_user RPC to include auth.identities correctly!');

  await client.end();
}

syncIdentities().catch(console.error);
