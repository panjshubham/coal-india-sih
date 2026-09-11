import { Client } from 'pg';

async function checkAllCols() {
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
    SELECT *
    FROM auth.users
    WHERE email IN ('mine_official@coalguard.demo', '93.shubhampanjiyara@gmail.com')
  `);
  
  // Find differences
  const u1 = res.rows.find(r => r.email === 'mine_official@coalguard.demo');
  const u2 = res.rows.find(r => r.email === '93.shubhampanjiyara@gmail.com');
  
  const diffs = {};
  for (let key in u1) {
    if (String(u1[key]) !== String(u2[key])) {
      diffs[key] = { u1: u1[key], u2: u2[key] };
    }
  }
  console.log('Differences:', JSON.stringify(diffs, null, 2));
  
  await client.end();
}

checkAllCols().catch(console.error);
