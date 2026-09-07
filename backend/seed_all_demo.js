import { Client } from 'pg';

async function seedRealDemo() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.pkynukxdzwlywrxcwtay',
    password: 'Shubham@123',
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  console.log('Connected to Supabase Postgres!');

  // Selected mine for mine_official:
  const selectedMineId = 42; // Govindpur Colliery

  // Accounts with .com (which Supabase Auth validation accepts) AND .demo if possible
  // We will create BOTH .demo and .com aliases so the user can use either!
  const demoAccounts = [
    // Standard .demo requested by user
    {
      email: 'mine_official@coalguard.demo',
      name: 'Shri R. K. Mahapatra',
      role: 'mine_official',
      assigned_mine_id: selectedMineId
    },
    {
      email: 'corporate@coalguard.demo',
      name: 'Smt. Ananya Sen',
      role: 'corporate',
      assigned_mine_id: null
    },
    {
      email: 'regulator@coalguard.demo',
      name: 'Dr. B. K. Verma',
      role: 'regulator',
      assigned_mine_id: null
    },
    // Also provide valid TLD versions (.com) for seamless auth across all GoTrue endpoints
    {
      email: 'mine_official@coalguard.com',
      name: 'Shri R. K. Mahapatra',
      role: 'mine_official',
      assigned_mine_id: selectedMineId
    },
    {
      email: 'corporate@coalguard.com',
      name: 'Smt. Ananya Sen',
      role: 'corporate',
      assigned_mine_id: null
    },
    {
      email: 'regulator@coalguard.com',
      name: 'Dr. B. K. Verma',
      role: 'regulator',
      assigned_mine_id: null
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
            raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
            raw_user_meta_data = $1::jsonb,
            updated_at = NOW()
        WHERE id = $2
      `, [JSON.stringify({ name: acc.name, role: acc.role }), userId]);
      console.log(`Updated auth user: ${acc.email} (${userId})`);
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
      console.log(`Created auth user: ${acc.email} (${userId})`);
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
    console.log(`  ✅ Profile synced in public.users: ${acc.email} (${acc.role})`);
  }

  // Double check all public.users
  const res = await client.query(`
    SELECT u.id, u.name, u.email, u.role, u.assigned_mine_id, m.name as mine_name
    FROM public.users u
    LEFT JOIN public.mines m ON u.assigned_mine_id = m.id
    ORDER BY u.created_at;
  `);
  console.log('\n--- Final public.users table ---');
  console.table(res.rows);

  await client.end();
}

seedRealDemo().catch(console.error);
