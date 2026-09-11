const { Client } = require('pg');
const client = new Client({
  host: 'aws-0-ap-southeast-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.pkynukxdzwlywrxcwtay',
  password: 'Shubham@123',
  ssl: { rejectUnauthorized: false }
});
client.connect().then(() => {
  return client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'inspections'");
}).then(res => {
  console.log(res.rows);
  client.end();
}).catch(console.error);
