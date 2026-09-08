import { Client } from 'pg';

async function updateCom() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.pkynukxdzwlywrxcwtay',
    password: 'Shubham@123',
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  const res = await client.query(`
    UPDATE auth.users 
    SET email_confirmed_at = NOW(),
        encrypted_password = crypt('Demo@2026', gen_salt('bf'))
    WHERE email = 'mine_official@coalguard.com'
    RETURNING id, email, email_confirmed_at, confirmed_at;
  `);
  console.log('Update result:', res.rows);
  await client.end();
}

updateCom().catch(console.error);
