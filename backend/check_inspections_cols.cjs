const { Client } = require('pg');
const { createPgClient } = require('./dbClient.cjs');
const client = createPgClient();
client.connect().then(() => {
  return client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'inspections'");
}).then(res => {
  console.log(res.rows);
  client.end();
}).catch(console.error);
