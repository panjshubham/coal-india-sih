import { Client } from 'pg';
import { createPgClient } from './dbClient.js';

async function checkDefaults() {
  const client = createPgClient();
  await client.connect();

  const cols = await client.query(`
    SELECT table_name, column_name, column_default, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND column_default IS NOT NULL;
  `);
  console.table(cols.rows);
  
  await client.end();
}

checkDefaults().catch(console.error);
