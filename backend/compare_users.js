import { Client } from 'pg';

async function compareUsers() {
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
    SELECT * FROM auth.users 
    WHERE email IN ('mine_official@coalguard.com', 'corporate@coalguard.com');
  `);
  console.log('auth.users:');
  console.log('mine_official:', users.rows.find(u => u.email === 'mine_official@coalguard.com'));
  console.log('corporate:', users.rows.find(u => u.email === 'corporate@coalguard.com'));

  const identities = await client.query(`
    SELECT * FROM auth.identities 
    WHERE user_id IN (SELECT id FROM auth.users WHERE email IN ('mine_official@coalguard.com', 'corporate@coalguard.com'));
  `);
  console.log('\nauth.identities:');
  console.log('mine_official identity:', identities.rows.find(i => i.email === 'mine_official@coalguard.com'));
  console.log('corporate identity:', identities.rows.find(i => i.email === 'corporate@coalguard.com'));

  await client.end();
}

compareUsers().catch(console.error);
