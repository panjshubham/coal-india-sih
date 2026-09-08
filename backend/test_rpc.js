import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pkynukxdzwlywrxcwtay.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBreW51a3hkendseXdyeGN3dGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NDA3NjMsImV4cCI6MjEwNDAxNjc2M30.luGy7zinkS9I7m1AXw3MwANXYA759MOtP2aj6JnifDE'
);

async function testRpc() {
  console.log('Testing login as corporate@coalguard.com...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'corporate@coalguard.com',
    password: 'Demo@2026'
  });

  if (authError) {
    console.error('Login error:', authError);
    return;
  }
  console.log('Logged in successfully as:', authData.user.email);

  const testEmail = `test_engineer_${Date.now()}@coalguard.com`;
  console.log(`Testing RPC creation of: ${testEmail}`);

  const { data, error } = await supabase.rpc('admin_create_user', {
    p_name: 'Test Mining Engineer',
    p_email: testEmail,
    p_password: 'Demo@2026',
    p_role: 'mine_official',
    p_assigned_mine_id: 42
  });

  if (error) {
    console.error('RPC error:', error);
  } else {
    console.log('RPC result:', data);
  }
}

testRpc().catch(console.error);
