import { Client } from 'pg';
import { createPgClient } from './dbClient.js';

async function showIdentityData() {
  const client = createPgClient();

  await client.connect();
  const row = await client.query(`SELECT * FROM auth.identities LIMIT 1;`);
  console.log('Sample identity row:', row.rows[0]);
  await client.end();
}

showIdentityData().catch(console.error);
