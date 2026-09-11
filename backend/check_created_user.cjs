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
  const pubUser = await client.query("SELECT id, email, role, name FROM public.users WHERE email = 'irisav450@gmail.com'");
  console.log('public.users:', pubUser.rows);
  
  const authUser = await client.query("SELECT id, email FROM auth.users WHERE email = 'irisav450@gmail.com'");
  console.log('auth.users:', authUser.rows);
  
  client.end();
}).catch(console.error);
