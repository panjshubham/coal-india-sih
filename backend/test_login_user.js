import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pkynukxdzwlywrxcwtay.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBreW51a3hkendseXdyeGN3dGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NDA3NjMsImV4cCI6MjEwNDAxNjc2M30.luGy7zinkS9I7m1AXw3MwANXYA759MOtP2aj6JnifDE'
);

async function testLogin() {
  console.log('Attempting login...');
  const { data, error: signInError } = await supabase.auth.signInWithPassword({
    email: '93.shubhampanjiyara@gmail.com',
    password: 'Demo@2026'
  });

  if (signInError) {
    console.error('SIGN IN ERROR:', JSON.stringify(signInError, null, 2));
    return;
  }
  
  console.log('Sign in successful. User ID:', data.user.id);
  
  console.log('Fetching role from public.users...');
  const { data: userData, error: roleError } = await supabase
    .from('users')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (roleError) {
    console.error('ROLE FETCH ERROR:', JSON.stringify(roleError, null, 2));
  } else {
    console.log('Role fetched successfully:', userData);
  }
}

testLogin().catch(console.error);
