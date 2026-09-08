import { Client } from 'pg';

async function cleanupTest() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.pkynukxdzwlywrxcwtay',
    password: 'Shubham@123',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  await client.query(`DELETE FROM public.users WHERE email LIKE 'test_engineer_%';`);
  await client.query(`DELETE FROM auth.identities WHERE email LIKE 'test_engineer_%';`);
  await client.query(`DELETE FROM auth.users WHERE email LIKE 'test_engineer_%';`);

  console.log('Cleaned up test user!');
  await client.end();
}

cleanupTest().catch(console.error);
