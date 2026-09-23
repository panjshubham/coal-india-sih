import { Client } from 'pg';
import { createPgClient } from './dbClient.js';

async function updateCom() {
  const client = createPgClient();
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
