import { Client } from 'pg';
import { createPgClient } from './dbClient.js';

async function checkSchema() {
  const client = createPgClient();
  await client.connect();

  const cols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'contractors';
  `);
  console.log('Contractors columns:', cols.rows);

  const buckets = await client.query(`
    SELECT id, name FROM storage.buckets;
  `);
  console.log('Storage buckets:', buckets.rows);
  
  await client.end();
}

checkSchema().catch(console.error);
