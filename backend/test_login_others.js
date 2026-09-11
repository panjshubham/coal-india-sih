import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pkynukxdzwlywrxcwtay.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBreW51a3hkendseXdyeGN3dGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NDA3NjMsImV4cCI6MjEwNDAxNjc2M30.luGy7zinkS9I7m1AXw3MwANXYA759MOtP2aj6JnifDE'
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
