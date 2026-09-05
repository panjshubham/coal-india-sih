import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres:Shubham%40123@db.pkynukxdzwlywrxcwtay.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();
  console.log('Connected to Supabase Postgres...');

  const sql = `
    -- Create user_role enum if it doesn't exist
    DO $$ BEGIN
      CREATE TYPE user_role AS ENUM ('mine_official', 'corporate', 'regulator');
    EXCEPTION
      WHEN duplicate_object THEN 
        RAISE NOTICE 'user_role type already exists, skipping.';
    END $$;

    -- Create users table linked to Supabase Auth
    CREATE TABLE IF NOT EXISTS public.users (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      name TEXT NOT NULL DEFAULT '',
      email TEXT UNIQUE NOT NULL,
      role user_role NOT NULL DEFAULT 'mine_official',
      assigned_mine_id INTEGER REFERENCES public.mines(id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Enable RLS
    ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

    -- Drop existing policies if any, then recreate
    DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
    CREATE POLICY "Users can read own profile" ON public.users
      FOR SELECT USING (auth.uid() = id);

    DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
    CREATE POLICY "Users can update own profile" ON public.users
      FOR UPDATE USING (auth.uid() = id);
  `;

  try {
    await client.query(sql);
    console.log('✅ users table created successfully!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  }

  // Check result
  const check = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'users'
    ORDER BY ordinal_position;
  `);
  
  if (check.rows.length > 0) {
    console.log('\n✅ users table columns:');
    check.rows.forEach(r => console.log(`  - ${r.column_name} (${r.data_type})`));
  } else {
    console.log('❌ users table not found after creation attempt');
  }

  // Check existing auth users
  const authUsers = await client.query(`SELECT id, email FROM auth.users LIMIT 5;`);
  console.log(`\n👥 Auth users in Supabase (${authUsers.rows.length} found):`);
  authUsers.rows.forEach(u => console.log(`  - ${u.email} (${u.id})`));

  await client.end();
  console.log('\nDone!');
}

run().catch(console.error);
