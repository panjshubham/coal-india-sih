import { Client } from 'pg';
import fs from 'fs';
import { createPgClient } from './dbClient.js';

async function checkProcs() {
  const client = createPgClient();
  await client.connect();

  const procs = await client.query(`
    SELECT p.proname, pg_get_function_arguments(p.oid) as args, pg_get_function_result(p.oid) as result
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'admin_create_user';
  `);
  console.table(procs.rows);
  
  await client.end();
}

checkProcs().catch(console.error);
