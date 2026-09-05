import { Client } from 'pg';

const client = new Client({ connectionString: 'postgresql://postgres:Shubham%40123@db.pkynukxdzwlywrxcwtay.supabase.co:5432/postgres' });

async function checkUsers() {
  await client.connect();

  // 1. Get schema columns
  const schemaRes = await client.query(`
    SELECT column_name, data_type, character_maximum_length, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users';
  `);
  
  console.log('--- Users Table Columns ---');
  console.table(schemaRes.rows);

  // 2. Check row count
  try {
    const countRes = await client.query(`SELECT COUNT(*) FROM public.users`);
    console.log('\n--- Row Count ---');
    console.log(`Total rows in public.users: ${countRes.rows[0].count}`);
  } catch (err) {
    console.log('Error counting rows:', err.message);
  }

  // 3. Check foreign keys linked to users
  const fkRes = await client.query(`
    SELECT
        tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
    FROM
        information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
    WHERE constraint_type = 'FOREIGN KEY' AND tc.table_name = 'users';
  `);
  
  console.log('\n--- Foreign Keys on users table ---');
  if (fkRes.rows.length) {
      console.table(fkRes.rows);
  } else {
      console.log('No foreign keys found.');
  }

  // 4. Check tables linking TO users
  const linkedRes = await client.query(`
    SELECT
        tc.table_name, kcu.column_name
    FROM
        information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
    WHERE constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'users';
  `);

  console.log('\n--- Tables referencing users ---');
  if (linkedRes.rows.length) {
      console.table(linkedRes.rows);
  } else {
      console.log('No tables referencing users.');
  }

  await client.end();
}

checkUsers();
