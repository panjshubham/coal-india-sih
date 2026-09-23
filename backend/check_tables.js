import { Client } from 'pg';
import { createPgClient } from './dbClient.js';
const client = createPgClient();
async function run() {
  await client.connect();
  const res = await client.query(`
    SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
  `);
  console.log(res.rows.map(r => r.table_name));
  await client.end();
}
run();
