import { Client } from 'pg';
import { createPgClient } from './dbClient.js';

async function compareIdentities() {
  const client = createPgClient();
  await client.connect();

  const res = await client.query(`
    SELECT u.email, i.id as identity_id, i.provider_id, i.provider, i.identity_data
    FROM auth.users u
    LEFT JOIN auth.identities i ON u.id = i.user_id
    WHERE u.email IN ('mine_official@coalguard.demo', '93.shubhampanjiyara@gmail.com')
  `);
  console.log(JSON.stringify(res.rows, null, 2));

  // Also let's check auth.users differences
  const res2 = await client.query(`
    SELECT email, aud, role, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user
    FROM auth.users
    WHERE email IN ('mine_official@coalguard.demo', '93.shubhampanjiyara@gmail.com')
  `);
  console.log(JSON.stringify(res2.rows, null, 2));
  
  await client.end();
}

compareIdentities().catch(console.error);
