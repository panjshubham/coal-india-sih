import { Client } from 'pg';
import { createPgClient } from './dbClient.js';

async function checkUserRows() {
  const client = createPgClient();

  await client.connect();

  const users = await client.query(`
    SELECT id, email, is_sso_user, is_anonymous, aud, role, encrypted_password IS NOT NULL as has_pw
    FROM auth.users;
  `);
  console.table(users.rows);

  await client.end();
}

checkUserRows().catch(console.error);
