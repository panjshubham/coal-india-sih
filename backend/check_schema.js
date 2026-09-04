import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres:Shubham%40123@db.pkynukxdzwlywrxcwtay.supabase.co:5432/postgres'
});

async function checkSchema() {
  await client.connect();
  const query = `
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `;
  const res = await client.query(query);
  
  const tables = {};
  res.rows.forEach(row => {
    if (!tables[row.table_name]) {
      tables[row.table_name] = [];
    }
    tables[row.table_name].push(`${row.column_name} (${row.data_type})`);
  });
  
  console.log(JSON.stringify(tables, null, 2));
  await client.end();
}

checkSchema().catch(console.error);
