import { Client } from 'pg';
import { createPgClient } from './dbClient.js';

async function fixNulls() {
  const client = createPgClient();
  await client.connect();

  await client.query(`
    UPDATE auth.users
    SET 
      confirmation_token = COALESCE(confirmation_token, ''),
      recovery_token = COALESCE(recovery_token, ''),
      email_change_token_new = COALESCE(email_change_token_new, ''),
      email_change = COALESCE(email_change, ''),
      email_change_token_current = COALESCE(email_change_token_current, ''),
      phone_change = COALESCE(phone_change, ''),
      phone_change_token = COALESCE(phone_change_token, ''),
      reauthentication_token = COALESCE(reauthentication_token, ''),
      email_change_confirm_status = COALESCE(email_change_confirm_status, 0),
      is_sso_user = COALESCE(is_sso_user, false)
    WHERE email = '93.shubhampanjiyara@gmail.com';
  `);
  
  console.log('Fixed nulls in auth.users!');
  await client.end();
}

fixNulls().catch(console.error);
