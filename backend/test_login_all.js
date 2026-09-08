import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pkynukxdzwlywrxcwtay.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBreW51a3hkendseXdyeGN3dGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NDA3NjMsImV4cCI6MjEwNDAxNjc2M30.luGy7zinkS9I7m1AXw3MwANXYA759MOtP2aj6JnifDE'
);

async function testAccounts() {
  const accounts = [
    'shubhampanjiyara.dev@gmail.com',
    'shubham.corporate@gmail.com',
    'mine_official@coalguard.com',
    'corporate@coalguard.com'
  ];

  for (const email of accounts) {
    console.log(`Testing login for ${email}...`);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: 'Demo@2026'
    });
    if (error) {
      console.log(`  ❌ Failed: ${error.message} (${error.status})`);
    } else {
      console.log(`  ✅ Success! User ID: ${data.user.id}`);
    }
  }
}

testAccounts().catch(console.error);
