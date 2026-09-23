import { Client } from 'pg';
import { createPgClient } from './dbClient.js';

async function checkAuthUsers() {
  const client = createPgClient();
  await client.connect();

  const res2 = await client.query(`
    SELECT email, instance_id
    FROM auth.users
    WHERE email IN ('mine_official@coalguard.demo', '93.shubhampanjiyara@gmail.com')
  `);
  console.log(JSON.stringify(res2.rows, null, 2));
  
  await client.end();
}

checkAuthUsers().catch(console.error);
