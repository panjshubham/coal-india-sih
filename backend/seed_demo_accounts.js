import { Client } from 'pg';

async function setup() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.pkynukxdzwlywrxcwtay',
    password: 'Shubham@123',
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  console.log('Connected to PG!');

  // Enable pgcrypto
  await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

  // 1. Update RLS policies on public.users
  await client.query(`
    DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
    DROP POLICY IF EXISTS "Allow authenticated read users" ON public.users;
    DROP POLICY IF EXISTS "Allow all for authenticated" ON public.users;
    DROP POLICY IF EXISTS "Allow service full access" ON public.users;
    DROP POLICY IF EXISTS "Allow authenticated insert users" ON public.users;
    DROP POLICY IF EXISTS "Allow authenticated delete users" ON public.users;
    DROP POLICY IF EXISTS "Allow read users" ON public.users;
    DROP POLICY IF EXISTS "Allow authenticated update users" ON public.users;

    -- Allow all reads so UI, AuthContext & admin pages work seamlessly
    CREATE POLICY "Allow read users" ON public.users
      FOR SELECT USING (true);

    -- Allow authenticated inserts
    CREATE POLICY "Allow authenticated insert users" ON public.users
      FOR INSERT WITH CHECK (true);

    -- Allow authenticated updates
    CREATE POLICY "Allow authenticated update users" ON public.users
      FOR UPDATE USING (true);

    -- Allow authenticated deletes
    CREATE POLICY "Allow authenticated delete users" ON public.users
      FOR DELETE USING (true);
  `);
  console.log('✅ Updated RLS policies on public.users');

  const selectedMineId = 42; // Govindpur Colliery

  const demoAccounts = [
    {
      email: 'mine_official@coalguard.demo',
      name: 'Shri R. K. Mahapatra',
      role: 'mine_official',
      assigned_mine_id: selectedMineId,
    },
    {
      email: 'corporate@coalguard.demo',
      name: 'Smt. Ananya Sen',
      role: 'corporate',
      assigned_mine_id: null,
    },
    {
      email: 'regulator@coalguard.demo',
      name: 'Dr. B. K. Verma',
      role: 'regulator',
      assigned_mine_id: null,
    }
  ];

  for (const acc of demoAccounts) {
    const existing = await client.query('SELECT id FROM auth.users WHERE email = $1', [acc.email]);
    let userId;

    if (existing.rowCount > 0) {
      userId = existing.rows[0].id;
      await client.query(`
        UPDATE auth.users 
        SET encrypted_password = crypt('Demo@2026', gen_salt('bf')),
            email_confirmed_at = NOW(),
            raw_user_meta_data = $1::jsonb,
            updated_at = NOW()
        WHERE id = $2
      `, [JSON.stringify({ name: acc.name, role: acc.role }), userId]);
      console.log(`Updated auth user ${acc.email} (${userId})`);
    } else {
      const newAuth = await client.query(`
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
          gen_random_uuid(),
          'authenticated',
          'authenticated',
          $1,
          crypt('Demo@2026', gen_salt('bf')),
          NOW(),
          '{"provider":"email","providers":["email"]}'::jsonb,
          $2::jsonb,
          NOW(),
          NOW()
        ) RETURNING id;
      `, [acc.email, JSON.stringify({ name: acc.name, role: acc.role })]);
      userId = newAuth.rows[0].id;
      console.log(`Created auth user ${acc.email} (${userId})`);
    }

    // Insert or update into public.users
    await client.query(`
      INSERT INTO public.users (id, name, email, role, assigned_mine_id, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (id) DO UPDATE 
      SET name = EXCLUDED.name,
          email = EXCLUDED.email,
          role = EXCLUDED.role,
          assigned_mine_id = EXCLUDED.assigned_mine_id;
    `, [userId, acc.name, acc.email, acc.role, acc.assigned_mine_id]);
    console.log(`✅ Upserted public.users profile for ${acc.email} [role: ${acc.role}, mine: ${acc.assigned_mine_id}]`);
  }

  // Also verify all users in public.users
  const allPub = await client.query(`
    SELECT u.id, u.name, u.email, u.role, u.assigned_mine_id, m.name as mine_name 
    FROM public.users u
    LEFT JOIN public.mines m ON u.assigned_mine_id = m.id
    ORDER BY u.role;
  `);
  console.log('\n--- Verified public.users table ---');
  console.table(allPub.rows);

  await client.end();
  console.log('✅ Done seeding accounts!');
}

setup().catch(console.error);
