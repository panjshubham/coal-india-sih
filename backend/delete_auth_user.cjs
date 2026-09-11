const { Client } = require('pg');
const client = new Client({
  host: 'aws-0-ap-southeast-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.pkynukxdzwlywrxcwtay',
  password: 'Shubham@123',
  ssl: { rejectUnauthorized: false }
});

client.connect().then(async () => {
  await client.query("DELETE FROM auth.users WHERE email = 'risavgen3@gmail.com'");
  console.log('Deleted from auth.users');
  client.end();
}).catch(console.error);
