import { Client } from 'pg';
import { createPgClient } from './dbClient.js';
const client = createPgClient();
async function run() {
  await client.connect();
  const res = await client.query(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name IN ('mines', 'users', 'contractors', 'violations')
    AND column_name = 'id'
  `);
  console.log(res.rows);
  await client.end();
}
run();
