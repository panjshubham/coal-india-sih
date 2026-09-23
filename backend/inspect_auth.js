import { Client } from 'pg';
import { createPgClient } from './dbClient.js';

async function inspectAuth() {
  const client = createPgClient();

  await client.connect();

  console.log('Checking triggers on auth.users:');
  const triggers = await client.query(`
    SELECT trigger_name, event_manipulation, action_statement
    FROM information_schema.triggers
    WHERE event_object_schema = 'auth' AND event_object_table = 'users';
  `);
  console.table(triggers.rows);

  console.log('\nChecking triggers on public.users:');
  const pubTriggers = await client.query(`
    SELECT trigger_name, event_manipulation, action_statement
    FROM information_schema.triggers
    WHERE event_object_schema = 'public' AND event_object_table = 'users';
  `);
  console.table(pubTriggers.rows);

  console.log('\nChecking columns of auth.users:');
  const cols = await client.query(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'users'
    ORDER BY ordinal_position;
  `);
  console.table(cols.rows.map(r => ({ col: r.column_name, type: r.data_type, null: r.is_nullable })));

  await client.end();
}

inspectAuth().catch(console.error);
