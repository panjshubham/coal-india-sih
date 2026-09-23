import { Client } from 'pg';
import { createPgClient } from './dbClient.js';

async function checkViolations() {
  const client = createPgClient();
  await client.connect();

  const cols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'violations';
  `);
  console.log('Violations columns:', cols.rows);
  await client.end();
}

checkViolations().catch(console.error);
