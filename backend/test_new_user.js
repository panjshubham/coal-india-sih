import './dbClient.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testNewUserLogin() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'test_engineer_1788776734121@coalguard.com',
    password: 'Demo@2026'
  });

  if (error) {
    console.error('Failed:', error);
  } else {
    console.log('✅ Newly created user logged in successfully! ID:', data.user.id);
  }
}

testNewUserLogin().catch(console.error);
