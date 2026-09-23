import { Client } from 'pg';
import { createPgClient } from './dbClient.js';

async function checkAudit() {
  const client = createPgClient();
  await client.connect();

  const cols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'audit_ledger';
  `);
  console.log('Audit columns:', cols.rows);
  
  await client.end();
}

checkAudit().catch(console.error);
