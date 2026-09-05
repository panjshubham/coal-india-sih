import pg from 'pg';
const { Client } = pg;
const client = new Client({ connectionString: 'postgresql://postgres:Shubham%40123@db.pkynukxdzwlywrxcwtay.supabase.co:5432/postgres' });
async function run() {
  await client.connect();
  const res = await client.query("SELECT table_name, table_type FROM information_schema.tables WHERE table_schema = 'public'");
  console.table(res.rows);
  const views = await client.query("SELECT table_name, view_definition FROM information_schema.views WHERE table_schema = 'public'");
  console.table(views.rows);
  await client.end();
}
run();
