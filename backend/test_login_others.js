import './dbClient.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testLogin(email) {
  console.log('Attempting login for', email);
  const { data, error: signInError } = await supabase.auth.signInWithPassword({
    email: email,
    password: 'Demo@2026'
  });

  if (signInError) {
    console.error('SIGN IN ERROR:', JSON.stringify(signInError, null, 2));
    return;
  }
  console.log('Sign in successful. User ID:', data.user.id);
}

async function run() {
  await testLogin('mine_official@coalguard.demo');
  await testLogin('corporate@coalguard.demo');
}

run().catch(console.error);
