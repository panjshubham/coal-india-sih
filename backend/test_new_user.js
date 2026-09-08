import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pkynukxdzwlywrxcwtay.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBreW51a3hkendseXdyeGN3dGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NDA3NjMsImV4cCI6MjEwNDAxNjc2M30.luGy7zinkS9I7m1AXw3MwANXYA759MOtP2aj6JnifDE'
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
