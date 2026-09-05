import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres:Shubham%40123@db.pkynukxdzwlywrxcwtay.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();

  // 1. Check existing auth users
  const authUsers = await client.query(`SELECT id, email, raw_user_meta_data FROM auth.users;`);
  console.log(`\n👥 Existing Auth Users (${authUsers.rows.length}):`);
  authUsers.rows.forEach(u => console.log(`  - ${u.email}  id=${u.id}`));

  if (authUsers.rows.length === 0) {
    console.log('\n⚠️  No auth users found. Please create users manually in Supabase Dashboard:');
    console.log('   https://supabase.com/dashboard/project/pkynukxdzwlywrxcwtay/auth/users');
    console.log('\n   Create these 3 users with password "Admin@123":');
    console.log('   1. demo.corporate@gmail.com → role: corporate');
    console.log('   2. demo.mine@gmail.com → role: mine_official, mine_id: 1');
    console.log('   3. demo.regulator@gmail.com → role: regulator');
  } else {
    // Create profiles in public.users for existing auth users
    console.log('\n📝 Creating public.users profiles...');
    
    const roles = ['corporate', 'mine_official', 'regulator'];
    
    for (let i = 0; i < authUsers.rows.length; i++) {
      const u = authUsers.rows[i];
      const role = roles[i % 3];
      const name = u.raw_user_meta_data?.name || u.email?.split('@')[0] || 'User';
      
      try {
        await client.query(`
          INSERT INTO public.users (id, name, email, role, assigned_mine_id)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id) DO UPDATE SET role = $4, name = $2
        `, [u.id, name, u.email, role, role === 'mine_official' ? 1 : null]);
        console.log(`  ✅ ${u.email} → role: ${role}`);
      } catch (err) {
        console.log(`  ❌ ${u.email}: ${err.message}`);
      }
    }
  }

  // 2. Check mines table for mine_id=1
  const mines = await client.query('SELECT id, name FROM public.mines ORDER BY id LIMIT 5');
  console.log('\n⛏️  Mines available:');
  mines.rows.forEach(m => console.log(`  - id=${m.id}: ${m.name}`));
  
  // 3. Final users check
  const users = await client.query('SELECT id, email, role, assigned_mine_id FROM public.users');
  console.log('\n✅ public.users:');
  users.rows.forEach(u => console.log(`  - ${u.email} (${u.role}) mine=${u.assigned_mine_id}`));

  await client.end();
}

run().catch(console.error);
