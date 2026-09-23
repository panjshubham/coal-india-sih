import { Client } from 'pg';
import { createPgClient } from './dbClient.js';

async function checkTriggers() {
  const client = createPgClient();
  await client.connect();

  const triggers = await client.query(`
    SELECT trigger_name, event_manipulation, event_object_table, action_statement
    FROM information_schema.triggers
    WHERE trigger_schema IN ('public', 'auth');
  `);
  console.table(triggers.rows);
  
  await client.end();
}

checkTriggers().catch(console.error);
