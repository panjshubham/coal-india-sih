import { Client } from 'pg';

async function checkIdentities() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.pkynukxdzwlywrxcwtay',
    password: 'Shubham@123',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const cols = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'identities';
  `);
  console.log('Columns of auth.identities:');
  console.table(cols.rows);

  const rows = await client.query(`SELECT * FROM auth.identities;`);
  console.log('Rows in auth.identities:');
  console.table(rows.rows);

  await client.end();
}

checkIdentities().catch(console.error);
