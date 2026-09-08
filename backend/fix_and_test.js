import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pkynukxdzwlywrxcwtay.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBreW51a3hkendseXdyeGN3dGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NDA3NjMsImV4cCI6MjEwNDAxNjc2M30.luGy7zinkS9I7m1AXw3MwANXYA759MOtP2aj6JnifDE'
);

async function fixAndTest() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.pkynukxdzwlywrxcwtay',
    password: 'Shubham@123',
    ssl: { rejectUnauthorized: false }
  });

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
