import { Client } from 'pg';

async function checkAuthUsers() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.pkynukxdzwlywrxcwtay',
    password: 'Shubham@123',
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  const res2 = await client.query(`
    SELECT email, instance_id
    FROM auth.users
    WHERE email IN ('mine_official@coalguard.demo', '93.shubhampanjiyara@gmail.com')
  `);
  console.log(JSON.stringify(res2.rows, null, 2));
  
  await client.end();
}

checkAuthUsers().catch(console.error);
