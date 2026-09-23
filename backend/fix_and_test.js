import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';
import { createPgClient } from './dbClient.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function fixAndTest() {
  const client = createPgClient();

  await client.connect();

  // Set default empty strings instead of null for token columns on all users
  await client.query(`
    UPDATE auth.users
    SET 
      confirmation_token = COALESCE(confirmation_token, encode(gen_random_bytes(32), 'hex')),
      recovery_token = COALESCE(recovery_token, ''),
      email_change_token_new = COALESCE(email_change_token_new, ''),
      email_change = COALESCE(email_change, ''),
      email_change_token_current = COALESCE(email_change_token_current, ''),
      phone_change = COALESCE(phone_change, ''),
      phone_change_token = COALESCE(phone_change_token, ''),
      reauthentication_token = COALESCE(reauthentication_token, ''),
      email_change_confirm_status = COALESCE(email_change_confirm_status, 0),
      is_sso_user = false,
      is_anonymous = false
    WHERE email IN ('corporate@coalguard.com', 'regulator@coalguard.com', 'mine_official@coalguard.demo', 'corporate@coalguard.demo', 'regulator@coalguard.demo');
  `);

  await client.end();

  // Now test sign in for corporate@coalguard.com
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'corporate@coalguard.com',
    password: 'Demo@2026'
  });

  if (error) {
    console.error('Login still failed:', error);
  } else {
    console.log('🎉 Login SUCCESS! User ID:', data.user.id);
  }
}

fixAndTest().catch(console.error);
