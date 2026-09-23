const { Client } = require('pg');
const { createPgClient } = require('./dbClient.cjs');
const client = createPgClient();

client.connect().then(async () => {
  const pubUser = await client.query("SELECT id, email, role, name FROM public.users WHERE email = 'irisav450@gmail.com'");
  console.log('public.users:', pubUser.rows);
  
  const authUser = await client.query("SELECT id, email FROM auth.users WHERE email = 'irisav450@gmail.com'");
  console.log('auth.users:', authUser.rows);
  
  client.end();
}).catch(console.error);
