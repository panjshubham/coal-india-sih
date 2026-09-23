import { Client } from 'pg';
import { createPgClient } from './dbClient.js';

async function checkEnums() {
  const client = createPgClient();
  await client.connect();

  const types = await client.query(`
    SELECT n.nspname AS schema, t.typname AS type, e.enumlabel AS value
    FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid  
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public';
  `);
  console.table(types.rows);
  
  const views = await client.query(`
    SELECT table_name FROM information_schema.views WHERE table_schema = 'public';
  `);
  console.table(views.rows);

  await client.end();
}

checkEnums().catch(console.error);
