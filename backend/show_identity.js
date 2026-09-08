import { Client } from 'pg';

async function showIdentityData() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.pkynukxdzwlywrxcwtay',
    password: 'Shubham@123',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  const row = await client.query(`SELECT * FROM auth.identities LIMIT 1;`);
  console.log('Sample identity row:', row.rows[0]);
  await client.end();
}

showIdentityData().catch(console.error);
