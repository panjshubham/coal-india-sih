import { Client } from 'pg';

async function checkUserRows() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.pkynukxdzwlywrxcwtay',
    password: 'Shubham@123',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const users = await client.query(`
    SELECT id, email, is_sso_user, is_anonymous, aud, role, encrypted_password IS NOT NULL as has_pw
    FROM auth.users;
  `);
  console.table(users.rows);

  await client.end();
}

checkUserRows().catch(console.error);
