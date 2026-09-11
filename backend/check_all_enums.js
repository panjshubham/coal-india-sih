import { Client } from 'pg';

async function checkAllEnums() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.pkynukxdzwlywrxcwtay',
    password: 'Shubham@123',
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  const types = await client.query(`
    SELECT n.nspname AS schema, t.typname AS type, array_agg(e.enumlabel) AS values
    FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid  
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
    GROUP BY 1, 2;
  `);
  console.table(types.rows);
  
  await client.end();
}

checkAllEnums().catch(console.error);
