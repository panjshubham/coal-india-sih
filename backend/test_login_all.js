import './dbClient.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
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
