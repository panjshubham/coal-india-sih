import { Client } from 'pg';

async function fixAccounts() {
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

  // 1. Check 93.shubhampanjiyara@gmail.com
  const email = '93.shubhampanjiyara@gmail.com';
  const existing = await client.query('SELECT id, email_confirmed_at FROM auth.users WHERE email = $1', [email]);
  let userId;

  if (existing.rowCount > 0) {
    console.log(`User ${email} DOES exist in auth.users (ID: ${existing.rows[0].id}, confirmed_at: ${existing.rows[0].email_confirmed_at})`);
    userId = existing.rows[0].id;
    // Ensure email is confirmed and password is correct
    await client.query(`
      UPDATE auth.users 
      SET email_confirmed_at = NOW(),
          encrypted_password = crypt('Demo@2026', gen_salt('bf')),
          raw_user_meta_data = $1::jsonb
      WHERE id = $2
    `, [JSON.stringify({ name: 'Shubham', role: 'corporate' }), userId]);
    console.log(`Confirmed email and reset password for ${email}`);
  } else {
    console.log(`User ${email} DOES NOT exist in auth.users. Creating it...`);
    const newAuth = await client.query(`
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      ) VALUES (
        '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', $1,
        crypt('Demo@2026', gen_salt('bf')), NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb, $2::jsonb, NOW(), NOW()
      ) RETURNING id;
    `, [email, JSON.stringify({ name: 'Shubham', role: 'corporate' })]);
    userId = newAuth.rows[0].id;
    console.log(`Created auth user ${email} (ID: ${userId})`);
  }

  // Ensure public.users entry
  await client.query(`
    INSERT INTO public.users (id, name, email, role, created_at)
    VALUES ($1, 'Shubham', $2, 'corporate', NOW())
    ON CONFLICT (id) DO UPDATE 
    SET role = 'corporate', email = $2;
  `, [userId, email]);
  console.log(`Confirmed matching row in public.users for ${email}`);

  // 4. Verify and fix demo accounts
  const demoAccounts = [
    { email: 'mine_official@coalguard.demo', role: 'mine_official' },
    { email: 'corporate@coalguard.demo', role: 'corporate' },
    { email: 'regulator@coalguard.demo', role: 'regulator' }
  ];

  for (const acc of demoAccounts) {
    const ex = await client.query('SELECT id, email_confirmed_at FROM auth.users WHERE email = $1', [acc.email]);
    if (ex.rowCount > 0) {
      await client.query(`
        UPDATE auth.users 
        SET email_confirmed_at = NOW(),
            encrypted_password = crypt('Demo@2026', gen_salt('bf'))
        WHERE id = $1
      `, [ex.rows[0].id]);
      
      // Ensure public.users has matching role
      await client.query(`
        UPDATE public.users SET role = $1 WHERE id = $2
      `, [acc.role, ex.rows[0].id]);
      
      console.log(`Fixed demo account ${acc.email}`);
    } else {
      console.log(`Missing demo account ${acc.email} in auth.users!`);
    }
  }

  // Show final state
  const finalAuth = await client.query(`
    SELECT u.id, u.email, u.email_confirmed_at, p.role as pub_role
    FROM auth.users u
    JOIN public.users p ON u.id = p.id
    WHERE u.email IN ('93.shubhampanjiyara@gmail.com', 'mine_official@coalguard.demo', 'corporate@coalguard.demo', 'regulator@coalguard.demo');
  `);
  console.table(finalAuth.rows);

  await client.end();
}

fixAccounts().catch(console.error);
