import { createClient } from '@supabase/supabase-js';

// Use service role key to create auth users
const supabase = createClient(
  'https://pkynukxdzwlywrxcwtay.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBreW51a3hkendseXdyeGN3dGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NDA3NjMsImV4cCI6MjEwNDAxNjc2M30.luGy7zinkS9I7m1AXw3MwANXYA759MOtP2aj6JnifDE',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// We need service role key for admin.createUser
// Let's try signing up instead
async function seedUsers() {
  const users = [
    { email: 'corporate@coalguard.in', password: 'Admin@123', name: 'Director General', role: 'corporate', mine_id: null },
    { email: 'mine@coalguard.in', password: 'Admin@123', name: 'Mine Safety Officer', role: 'mine_official', mine_id: 1 },
    { email: 'regulator@coalguard.in', password: 'Admin@123', name: 'DGMS Inspector', role: 'regulator', mine_id: null },
  ];

  for (const u of users) {
    console.log(`\nCreating user: ${u.email}`);
    
    // Sign up
    const { data, error } = await supabase.auth.signUp({
      email: u.email,
      password: u.password,
      options: { data: { name: u.name } }
    });

    if (error) {
      console.log(`  ⚠️  Auth signup: ${error.message}`);
    } else if (data.user) {
      console.log(`  ✅ Auth user created: ${data.user.id}`);
      
      // Insert into public.users
      const { error: insertError } = await supabase.from('users').upsert({
        id: data.user.id,
        name: u.name,
        email: u.email,
        role: u.role,
        assigned_mine_id: u.mine_id
      });

      if (insertError) {
        console.log(`  ❌ Profile insert failed: ${insertError.message}`);
      } else {
        console.log(`  ✅ Profile inserted with role: ${u.role}`);
      }
    }
  }

  // Verify
  const { data: profiles } = await supabase.from('users').select('email, role');
  console.log('\n📋 Users in public.users:');
  profiles?.forEach(p => console.log(`  - ${p.email} → ${p.role}`));
}

seedUsers().catch(console.error);
