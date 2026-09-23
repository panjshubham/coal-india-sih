import { Client } from 'pg';
import fs from 'fs';
import { createPgClient } from './dbClient.js';

async function checkProcs() {
  const client = createPgClient();
  await client.connect();

  const procs = await client.query(`
    SELECT p.proname, p.prosrc
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public';
  `);
  fs.writeFileSync('procs.json', JSON.stringify(procs.rows, null, 2));
  
  await client.end();
}

checkProcs().catch(console.error);
