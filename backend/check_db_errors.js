import { Client } from 'pg';

async function checkInvalidObjects() {
  const client = new Client({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.pkynukxdzwlywrxcwtay',
    password: 'Shubham@123',
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  console.log('Connected to PG!');

  try {
    // Check for views that are invalid
    console.log('\n--- Checking for invalid views ---');
    const invalidViews = await client.query(`
      SELECT c.oid, c.relname
      FROM pg_class c
      WHERE c.relkind = 'v' AND c.relispopulated = false;
    `);
    console.table(invalidViews.rows);
  } catch(e) {}

  try {
    // Check if postgrest schema reload fails
    console.log('\n--- Checking PostgREST schema reload ---');
    await client.query(`NOTIFY pgrst, 'reload schema'`);
    console.log('Notify sent successfully.');
  } catch (e) {
    console.error('Notify failed:', e.message);
  }

  // Look for any table that fails to be queried
  const tables = await client.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`);
  for (let t of tables.rows) {
    try {
      await client.query(`SELECT 1 FROM public."${t.tablename}" LIMIT 1`);
    } catch (e) {
      console.error(`Error querying table ${t.tablename}: ${e.message}`);
    }
  }

  await client.end();
}

checkInvalidObjects().catch(console.error);
