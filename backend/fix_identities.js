import { Client } from 'pg';

async function fixIdentities() {
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
    SELECT id, email FROM auth.users 
    WHERE id NOT IN (SELECT user_id FROM auth.identities)
  `);

  if (users.rowCount > 0) {
    console.log('Found users without identities:', users.rows);
    for (let u of users.rows) {
      await client.query(`
        INSERT INTO auth.identities (
          id, provider_id, user_id, identity_data, provider, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $1, $2::jsonb, 'email', NOW(), NOW()
        )
      `, [u.id, JSON.stringify({ sub: u.id, email: u.email, email_verified: true, phone_verified: false })]);
      console.log('Fixed identity for', u.email);
    }
  } else {
    console.log('All users have identities.');
  }
  
  await client.end();
}

fixIdentities().catch(console.error);
