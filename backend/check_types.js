import { Client } from 'pg';
const client = new Client({ connectionString: 'postgresql://postgres:Shubham%40123@db.pkynukxdzwlywrxcwtay.supabase.co:5432/postgres' });
async function run() {
  await client.connect();
  const res = await client.query(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name IN ('mines', 'users', 'contractors', 'violations')
    AND column_name = 'id'
  `);
  console.log(res.rows);
  await client.end();
}
run();
