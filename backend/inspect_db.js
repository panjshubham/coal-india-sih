import { Client } from 'pg';

async function inspect() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.pkynukxdzwlywrxcwtay',
    password: 'Shubham@123',
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  const authUsers = await client.query('SELECT id, email, confirmed_at, encrypted_password FROM auth.users');
  console.log('auth.users count:', authUsers.rowCount);
  console.log('auth.users:', authUsers.rows.map(u => ({ id: u.id, email: u.email, confirmed: !!u.confirmed_at })));

  const publicUsers = await client.query('SELECT * FROM public.users');
  console.log('public.users count:', publicUsers.rowCount);
  console.log('public.users:', publicUsers.rows);

  const policies = await client.query(`
    SELECT tablename, policyname, cmd, qual, with_check 
    FROM pg_policies 
    WHERE tablename = 'users'
  `);
  console.log('policies on users:', policies.rows);

  const mines = await client.query('SELECT id, name FROM public.mines LIMIT 5');
  console.log('sample mines:', mines.rows);

  await client.end();
}

inspect().catch(console.error);
