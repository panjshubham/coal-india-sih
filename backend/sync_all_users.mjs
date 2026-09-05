import pg from 'pg';
const { Client } = pg;
const client = new Client({
  connectionString: 'postgresql://postgres:Shubham%40123@db.pkynukxdzwlywrxcwtay.supabase.co:5432/postgres'
});
await client.connect();
console.log('Connected.\n');

// Get all auth users
const auth = await client.query('SELECT id, email, raw_user_meta_data, created_at FROM auth.users ORDER BY created_at');
console.log(`Found ${auth.rows.length} auth users:\n`);
auth.rows.forEach((u, i) => console.log(`  ${i+1}. ${u.email}  (${u.id})`));

// Get first mine id available
const mines = await client.query('SELECT id, name FROM public.mines ORDER BY id LIMIT 1');
const firstMineId = mines.rows[0]?.id || 1;
console.log(`\nFirst mine: id=${firstMineId} (${mines.rows[0]?.name})`);

// Assign roles: first=corporate, second=mine_official, third=regulator, rest=corporate
const roles = ['corporate', 'mine_official', 'regulator'];

for (let i = 0; i < auth.rows.length; i++) {
  const u = auth.rows[i];
  const role = roles[i] || 'corporate';
  const name = u.raw_user_meta_data?.name || u.raw_user_meta_data?.full_name || u.email?.split('@')[0] || 'User';
  const mineId = role === 'mine_official' ? firstMineId : null;

  try {
    await client.query(`
      INSERT INTO public.users (id, name, email, role, assigned_mine_id)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET role=$4, name=$2, assigned_mine_id=$5
    `, [u.id, name, u.email, role, mineId]);
    console.log(`  ✅ ${u.email} → ${role}${mineId ? ` (mine_id=${mineId})` : ''}`);
  } catch(e) {
    console.log(`  ❌ ${u.email}: ${e.message}`);
  }
}

const final = await client.query('SELECT email, role, assigned_mine_id FROM public.users ORDER BY created_at');
console.log('\n=== Final public.users ===');
final.rows.forEach(r => console.log(`  ${r.email} → ${r.role} (mine=${r.assigned_mine_id})`));

await client.end();
console.log('\nDone!');
