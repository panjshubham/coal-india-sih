import { Client } from 'pg';

async function checkSchema() {
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
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'contractors';
  `);
  console.log('Contractors columns:', cols.rows);

  const buckets = await client.query(`
    SELECT id, name FROM storage.buckets;
  `);
  console.log('Storage buckets:', buckets.rows);
  
  await client.end();
}

checkSchema().catch(console.error);
