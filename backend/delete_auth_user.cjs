const { Client } = require('pg');
const { createPgClient } = require('./dbClient.cjs');
const client = createPgClient();

client.connect().then(async () => {
  await client.query("DELETE FROM auth.users WHERE email = 'risavgen3@gmail.com'");
  console.log('Deleted from auth.users');
  client.end();
}).catch(console.error);
