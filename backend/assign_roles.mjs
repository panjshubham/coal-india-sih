import pg from 'pg';
const { Client } = pg;
const client = new Client({
  connectionString: 'postgresql://postgres:Shubham%40123@db.pkynukxdzwlywrxcwtay.supabase.co:5432/postgres'
});
await client.connect();

const users = [
  { id: '6d68f0b7-4a83-4741-8054-34d7ab9604bb', name: 'Director General', email: 'shubham.corporate@gmail.com', role: 'corporate', mine_id: null },
  { id: 'a776a806-b79e-4e8d-a3d8-8c18c37244d3', name: 'Mine Safety Officer', email: 'shubhampanjiyara.dev@gmail.com', role: 'mine_official', mine_id: 1 },
];

for (const u of users) {
  try {
    await client.query(
      'INSERT INTO public.users (id, name, email, role, assigned_mine_id) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO UPDATE SET role=$4, name=$2',
      [u.id, u.name, u.email, u.role, u.mine_id]
    );
    console.log('✅ Inserted:', u.email, '->', u.role);
  } catch(e) { console.log('❌', u.email, e.message); }
}

// Also check auth.users for any new ones
const auth = await client.query('SELECT id, email FROM auth.users');
console.log('\nAll auth.users:');
auth.rows.forEach(r => console.log(' ', r.email, r.id));

const rows = await client.query('SELECT email, role FROM public.users');
console.log('\nAll public.users:');
rows.rows.forEach(r => console.log(' ', r.email, '->', r.role));

await client.end();
