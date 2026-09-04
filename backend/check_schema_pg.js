import { Client } from 'pg';
const client = new Client({ connectionString: 'postgresql://postgres:Shubham%40123@db.pkynukxdzwlywrxcwtay.supabase.co:5432/postgres' });
async function run() {
  await client.connect();
  const res = await client.query(`
    SELECT table_name, column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name IN ('mines', 'violations', 'compliance_items', 'risk_scores', 'alerts', 'audit_log', 'audit_ledger', 'contractors', 'contractor_incidents')
  `);
  const schema = {};
  res.rows.forEach(r => {
    if(!schema[r.table_name]) schema[r.table_name] = [];
    schema[r.table_name].push(r.column_name);
  });
  console.log(JSON.stringify(schema, null, 2));
  await client.end();
}
run();
