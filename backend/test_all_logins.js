import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pkynukxdzwlywrxcwtay.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBreW51a3hkendseXdyeGN3dGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NDA3NjMsImV4cCI6MjEwNDAxNjc2M30.luGy7zinkS9I7m1AXw3MwANXYA759MOtP2aj6JnifDE'
);

async function testAllLogins() {
  const accounts = [
    'mine_official@coalguard.demo',
    'corporate@coalguard.demo',
    'regulator@coalguard.demo',
    'mine_official@coalguard.com',
    'corporate@coalguard.com',
    'regulator@coalguard.com'
  ];

  console.log('--- TESTING ALL DEMO ACCOUNTS WITH PASSWORD: Demo@2026 ---');
  for (const email of accounts) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: 'Demo@2026'
    });

    if (error) {
      console.log(`❌ ${email.padEnd(30)} -> FAILED: ${error.message}`);
    } else {
      const { data: profile } = await supabase
        .from('users')
        .select('role, name, assigned_mine_id')
        .eq('id', data.user.id)
        .single();
      console.log(`✅ ${email.padEnd(30)} -> SUCCESS! Role: ${profile?.role?.padEnd(15)} Name: ${profile?.name} (Mine ID: ${profile?.assigned_mine_id})`);
      await supabase.auth.signOut();
    }
  }
}

testAllLogins().catch(console.error);
