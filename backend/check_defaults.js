import { Client } from 'pg';

async function checkDefaults() {
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
    SELECT table_name, column_name, column_default, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND column_default IS NOT NULL;
  `);
  console.table(cols.rows);
  
  await client.end();
}

checkDefaults().catch(console.error);
